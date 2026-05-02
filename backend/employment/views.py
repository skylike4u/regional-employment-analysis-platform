import json
from io import BytesIO, StringIO
from pathlib import Path
import pandas as pd
from functools import lru_cache
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
import traceback

# 파일 경로 상수 추가
BASE_DIR = Path(__file__).resolve().parent.parent
PENSION_SAMPLE_FILE = BASE_DIR / "data" / "nps_2026_02.csv"
PENSION_RATE_FILE = BASE_DIR / "employment" / "data" / "pension_rates.json"
REGION_CODE_ALIAS_FILE = BASE_DIR / "employment" / "data" / "region_code_aliases.json"
REGION_CODE_FILE = BASE_DIR / "employment" / "data" / "region_codes.json"
LEGAL_DONG_CODE_FILE = BASE_DIR / "employment" / "data" / "legal_dong_codes.json"
SIDO_CENTROID_FILE = BASE_DIR / "employment" / "data" / "sido_centroids.json"

COLUMN_MAP = {
    "자료생성년월": "base_month",
    "사업장명": "company_name",
    "사업자등록번호": "business_number",
    "사업장가입상태코드 1 등록 2 탈퇴": "join_status",
    "우편번호": "postal_code",
    "사업장지번상세주소": "lot_address",
    "사업장도로명상세주소": "road_address",
    "고객법정동주소코드": "legal_dong_code",
    "고객행정동주소코드": "admin_dong_code",
    "법정동주소광역시도코드": "sido_code",
    "법정동주소광역시시군구코드": "sigungu_code",
    "법정동주소광역시시군구읍면동코드": "emd_code",
    "사업장형태구분코드 1 법인 2 개인": "business_type_code",
    "사업장업종코드": "industry_code",
    "사업장업종코드명": "industry_name",
    "당월고지금액": "monthly_pension_amount",
    "가입자수": "subscriber_count",
    "신규취득자수": "new_acquisition_count",
    "상실가입자수": "loss_count",
}

NUMERIC_COLUMNS = [
    "monthly_pension_amount",
    "subscriber_count",
    "new_acquisition_count",
    "loss_count",
]


# Json 로드 함수 / lru_cache를 통해 캐시를 걸어두는 둠(서버 실행 중에는 JSON을 한 번만 읽고 재사용)
@lru_cache(maxsize=1)
def load_region_code_map():
    with open(REGION_CODE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_legal_dong_code_map():
    try:
        with open(LEGAL_DONG_CODE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


@lru_cache(maxsize=1)
def load_sido_centroid_map():
    try:
        with open(SIDO_CENTROID_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


@lru_cache(maxsize=1)
def load_region_code_aliases():
    try:
        with open(REGION_CODE_ALIAS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def apply_canonical_region_codes(normalized_df: pd.DataFrame) -> pd.DataFrame:
    aliases = load_region_code_aliases()

    if not aliases or "sido_code" not in normalized_df.columns:
        return normalized_df

    alias_map = {
        str(old_code): str(info["canonical_code"]) for old_code, info in aliases.items()
    }

    normalized_df["sido_code"] = (
        normalized_df["sido_code"].astype(str).str.strip().replace(alias_map)
    )

    return normalized_df


# 시도별로 중첩되어 있으니 한 번 펼쳐주는(flatten) 함수가 필요
def get_flat_sigungu_code_map():
    region_codes = load_region_code_map()
    flat_map = {}

    for _, region_info in region_codes.get("sigungu", {}).items():
        flat_map.update(region_info.get("codes", {}))

    return flat_map


def build_region_key(sido_code: str, sigungu_code: str) -> str:
    sido = str(sido_code).strip()
    sigungu = str(sigungu_code).strip()

    if not sido or not sigungu:
        return ""

    return f"{sido}{sigungu.zfill(3)}"


def get_region_names(sido_code: str, sigungu_code: str):
    region_codes = load_region_code_map()
    flat_sigungu_map = get_flat_sigungu_code_map()

    region_key = build_region_key(sido_code, sigungu_code)
    sido_name = region_codes.get("sido", {}).get(str(sido_code).strip(), "")
    sigungu_name = flat_sigungu_map.get(region_key, "")

    full_region_name = ""
    if sido_name and sigungu_name:
        full_region_name = f"{sido_name} {sigungu_name}"
    elif sido_name:
        full_region_name = sido_name

    return {
        "region_key": region_key,
        "sido_name": sido_name,
        "sigungu_name": sigungu_name,
        "full_region_name": full_region_name,
    }


@lru_cache(maxsize=1)
def load_pension_rates():
    with open(PENSION_RATE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_pension_rate_by_base_month(base_month):
    rates = load_pension_rates()

    if not base_month:
        return rates["default"]

    year = str(base_month)[:4]

    return rates.get(year, rates["default"])


def to_number(value):
    if value is None:
        return 0

    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return 0


def calculate_estimated_avg_annual_income(
    monthly_pension_amount,
    subscriber_count,
    total_pension_rate,
):
    monthly_pension_amount = to_number(monthly_pension_amount)
    subscriber_count = to_number(subscriber_count)

    if monthly_pension_amount <= 0 or subscriber_count <= 0 or total_pension_rate <= 0:
        return 0

    estimated_monthly_income_total = monthly_pension_amount / total_pension_rate
    estimated_annual_income_total = estimated_monthly_income_total * 12
    estimated_avg_annual_income = estimated_annual_income_total / subscriber_count

    return round(estimated_avg_annual_income)


def clean_region_code(value, length=None):
    if value is None:
        return ""

    code = str(value).strip()

    # 170.0 같은 형태 보정
    if code.endswith(".0"):
        code = code[:-2]

    # nan 보정
    if code.lower() == "nan":
        return ""

    # 필요 시 앞자리 0 보정
    if length and code.isdigit():
        code = code.zfill(length)

    return code


def get_sigungu_name_from_region_codes(region_codes, sido_code, sigungu_code):
    sido_code = clean_region_code(sido_code)
    sigungu_code = clean_region_code(sigungu_code, length=3)
    full_sigungu_code = f"{sido_code}{sigungu_code}"

    sigungu_map = region_codes.get("sigungu", {})

    # 구조: {"sigungu": {"26": {"name": "...", "codes": {"26440": "강서구"}}}}
    sido_block = sigungu_map.get(sido_code, {})

    if isinstance(sido_block, dict):
        codes_map = sido_block.get("codes", {})

        if full_sigungu_code in codes_map:
            return codes_map[full_sigungu_code]

        if sigungu_code in codes_map:
            return codes_map[sigungu_code]

    # flat 구조 대응
    if full_sigungu_code in sigungu_map:
        return sigungu_map[full_sigungu_code]

    if sigungu_code in sigungu_map:
        return sigungu_map[sigungu_code]

    return ""


def build_region_summary(df: pd.DataFrame):
    if df.empty:
        return []

    region_codes = load_region_code_map()

    base_month = (
        df["base_month"].iloc[0] if "base_month" in df.columns and len(df) > 0 else ""
    )

    rate_info = get_pension_rate_by_base_month(base_month)
    total_pension_rate = rate_info.get("total_rate", 0)

    grouped = (
        df.groupby(["sido_code", "sigungu_code"], dropna=False)
        .agg(
            business_count=("business_number", "count"),
            total_workers=("subscriber_count", "sum"),
            avg_workers=("subscriber_count", "mean"),
            total_monthly_pension_amount=("monthly_pension_amount", "sum"),
        )
        .reset_index()
    )

    results = []

    for _, row in grouped.iterrows():
        sido_code = clean_region_code(row["sido_code"])
        sigungu_code = clean_region_code(row["sigungu_code"], length=3)

        business_count = int(row["business_count"])
        total_workers = int(row["total_workers"])
        avg_workers = round(float(row["avg_workers"]), 1)

        estimated_avg_annual_income = calculate_estimated_avg_annual_income(
            row["total_monthly_pension_amount"],
            total_workers,
            total_pension_rate,
        )

        sido_name = region_codes.get("sido", {}).get(sido_code, "")
        sigungu_name = get_sigungu_name_from_region_codes(
            region_codes,
            sido_code,
            sigungu_code,
        )

        full_sigungu_code = f"{sido_code}{sigungu_code}"

        is_mapped = bool(sigungu_name)

        display_sigungu_name = (
            sigungu_name if is_mapped else f"미매핑({full_sigungu_code})"
        )

        full_region_name = f"{sido_name} {display_sigungu_name}".strip()

        results.append(
            {
                "sido_code": sido_code,
                "sigungu_code": sigungu_code,
                "business_count": business_count,
                "total_workers": total_workers,
                "avg_workers": avg_workers,
                "estimated_avg_annual_income": estimated_avg_annual_income,
                "applied_pension_rate": total_pension_rate,
                "region_key": f"{sido_code}{sigungu_code}",
                "sido_name": sido_name,
                "sigungu_name": display_sigungu_name,
                "full_region_name": full_region_name,
                "is_mapped": is_mapped,
                "full_sigungu_code": full_sigungu_code,
            }
        )

    results.sort(key=lambda item: item["total_workers"], reverse=True)

    return results


def build_industry_top_by_sido(df: pd.DataFrame, top_n=10):
    if df.empty or "industry_name" not in df.columns:
        return []

    excluded_industry_names = {
        "",
        "해당없음",
        "BIZ_NO미존재사업장",
    }

    excluded_industry_codes = {
        "999999",
    }

    industry_df = df.copy()

    if "industry_name" in industry_df.columns:
        industry_df["industry_name"] = (
            industry_df["industry_name"].fillna("").astype(str).str.strip()
        )

    if "industry_code" in industry_df.columns:
        industry_df["industry_code"] = (
            industry_df["industry_code"].fillna("").astype(str).str.strip()
        )

    industry_df = industry_df[
        ~industry_df["industry_name"].isin(excluded_industry_names)
    ]

    if "industry_code" in industry_df.columns:
        industry_df = industry_df[
            ~industry_df["industry_code"].isin(excluded_industry_codes)
        ]

    if industry_df.empty:
        return []

    base_month = (
        industry_df["base_month"].iloc[0]
        if "base_month" in industry_df.columns and len(industry_df) > 0
        else ""
    )

    rate_info = get_pension_rate_by_base_month(base_month)
    total_pension_rate = rate_info.get("total_rate", 0)

    grouped = (
        industry_df.groupby("industry_name", dropna=False)
        .agg(
            business_count=("business_number", "count"),
            total_workers=("subscriber_count", "sum"),
            avg_workers=("subscriber_count", "mean"),
            total_monthly_pension_amount=("monthly_pension_amount", "sum"),
        )
        .reset_index()
    )

    results = []

    for _, row in grouped.iterrows():
        industry_name = str(row["industry_name"]).strip()

        business_count = int(row["business_count"])
        total_workers = int(row["total_workers"])
        avg_workers = round(float(row["avg_workers"]), 1)

        estimated_avg_annual_income = calculate_estimated_avg_annual_income(
            row["total_monthly_pension_amount"],
            total_workers,
            total_pension_rate,
        )

        results.append(
            {
                "industry_name": industry_name,
                "business_count": business_count,
                "total_workers": total_workers,
                "avg_workers": avg_workers,
                "estimated_avg_annual_income": estimated_avg_annual_income,
                "applied_pension_rate": total_pension_rate,
            }
        )

    results.sort(key=lambda item: item["total_workers"], reverse=True)

    return results[:top_n]


def build_company_top_by_sido(df: pd.DataFrame, top_n=20, min_subscribers=10):
    if df.empty:
        return []

    required_columns = {
        "company_name",
        "subscriber_count",
        "monthly_pension_amount",
    }

    if not required_columns.issubset(set(df.columns)):
        return []

    company_df = df.copy()

    company_df["company_name"] = (
        company_df["company_name"].fillna("").astype(str).str.strip()
    )

    company_df = company_df[
        (company_df["company_name"] != "")
        & (company_df["subscriber_count"] >= min_subscribers)
        & (company_df["monthly_pension_amount"] > 0)
    ]

    if company_df.empty:
        return []

    base_month = (
        company_df["base_month"].iloc[0]
        if "base_month" in company_df.columns and len(company_df) > 0
        else ""
    )

    rate_info = get_pension_rate_by_base_month(base_month)
    total_pension_rate = rate_info.get("total_rate", 0)

    results = []

    for _, row in company_df.iterrows():
        subscriber_count = int(row["subscriber_count"])
        monthly_pension_amount = row["monthly_pension_amount"]

        estimated_avg_annual_income = calculate_estimated_avg_annual_income(
            monthly_pension_amount,
            subscriber_count,
            total_pension_rate,
        )

        results.append(
            {
                "company_name": row["company_name"],
                "business_number": str(row.get("business_number", "")).strip(),
                "sido_code": str(row.get("sido_code", "")).strip(),
                "sigungu_code": str(row.get("sigungu_code", "")).strip(),
                "emd_code": str(row.get("emd_code", "")).strip(),
                "industry_code": str(row.get("industry_code", "")).strip(),
                "industry_name": str(row.get("industry_name", "")).strip(),
                "full_address": str(row.get("full_address", "")).strip(),
                "subscriber_count": subscriber_count,
                "monthly_pension_amount": int(monthly_pension_amount),
                "estimated_avg_annual_income": estimated_avg_annual_income,
                "applied_pension_rate": total_pension_rate,
            }
        )

    # 가입자 수 기준 대표 기업 TOP
    results.sort(key=lambda item: item["subscriber_count"], reverse=True)

    return results[:top_n]


def build_legal_dong_top_by_sido(df: pd.DataFrame, top_n=10):
    if df.empty:
        return []

    required_columns = {
        "legal_dong_code",
        "subscriber_count",
        "monthly_pension_amount",
    }

    if not required_columns.issubset(set(df.columns)):
        return []

    dong_df = df.copy()

    dong_df["legal_dong_code"] = (
        dong_df["legal_dong_code"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.replace(".0", "", regex=False)
    )

    dong_df = dong_df[dong_df["legal_dong_code"] != ""]

    if dong_df.empty:
        return []

    legal_dong_map = load_legal_dong_code_map()

    base_month = (
        dong_df["base_month"].iloc[0]
        if "base_month" in dong_df.columns and len(dong_df) > 0
        else ""
    )

    rate_info = get_pension_rate_by_base_month(base_month)
    total_pension_rate = rate_info.get("total_rate", 0)

    grouped = (
        dong_df.groupby("legal_dong_code", dropna=False)
        .agg(
            business_count=("business_number", "count"),
            total_workers=("subscriber_count", "sum"),
            avg_workers=("subscriber_count", "mean"),
            total_monthly_pension_amount=("monthly_pension_amount", "sum"),
        )
        .reset_index()
    )

    results = []

    for _, row in grouped.iterrows():
        legal_dong_code = str(row["legal_dong_code"]).strip()
        legal_dong_full_name = legal_dong_map.get(
            legal_dong_code,
            f"미매핑({legal_dong_code})",
        )

        # 화면 표시용: 마지막 단어만 추출
        # 예: 부산광역시 남구 문현동 -> 문현동
        legal_dong_name = (
            legal_dong_full_name.split()[-1]
            if not legal_dong_full_name.startswith("미매핑")
            else legal_dong_full_name
        )

        total_workers = int(row["total_workers"])

        estimated_avg_annual_income = calculate_estimated_avg_annual_income(
            row["total_monthly_pension_amount"],
            total_workers,
            total_pension_rate,
        )

        results.append(
            {
                "legal_dong_code": legal_dong_code,
                "legal_dong_name": legal_dong_name,
                "legal_dong_full_name": legal_dong_full_name,
                "business_count": int(row["business_count"]),
                "total_workers": total_workers,
                "avg_workers": round(float(row["avg_workers"]), 1),
                "estimated_avg_annual_income": estimated_avg_annual_income,
                "applied_pension_rate": total_pension_rate,
            }
        )

    results.sort(key=lambda item: item["total_workers"], reverse=True)

    return results[:top_n]


def build_sido_summary(df: pd.DataFrame, sido_code: str):
    region_codes = load_region_code_map()
    sido_centroids = load_sido_centroid_map()

    filtered_df = filter_by_sido(df, sido_code)

    centroid = sido_centroids.get(str(sido_code), {})

    if filtered_df.empty:
        return {
            "sido_code": str(sido_code),
            "sido_name": region_codes.get("sido", {}).get(str(sido_code), ""),
            "business_count": 0,
            "total_workers": 0,
            "avg_workers": 0,
            "estimated_avg_annual_income": 0,
            "applied_pension_rate": 0,
            "lat": centroid.get("lat"),
            "lng": centroid.get("lng"),
        }

    business_count = len(filtered_df)
    total_workers = int(filtered_df["subscriber_count"].sum())
    avg_workers = round(filtered_df["subscriber_count"].mean(), 1)

    base_month = (
        filtered_df["base_month"].iloc[0]
        if "base_month" in filtered_df.columns and len(filtered_df) > 0
        else ""
    )

    rate_info = get_pension_rate_by_base_month(base_month)
    total_pension_rate = rate_info.get("total_rate", 0)

    total_monthly_pension_amount = (
        filtered_df["monthly_pension_amount"].sum()
        if "monthly_pension_amount" in filtered_df.columns
        else 0
    )

    estimated_avg_annual_income = calculate_estimated_avg_annual_income(
        total_monthly_pension_amount,
        total_workers,
        total_pension_rate,
    )

    return {
        "sido_code": str(sido_code),
        "sido_name": region_codes.get("sido", {}).get(str(sido_code), ""),
        "business_count": int(business_count),
        "total_workers": total_workers,
        "avg_workers": avg_workers,
        "estimated_avg_annual_income": estimated_avg_annual_income,
        "applied_pension_rate": total_pension_rate,
        "lat": centroid.get("lat"),
        "lng": centroid.get("lng"),
    }


def build_nationwide_summary(df: pd.DataFrame):
    region_codes = load_region_code_map()
    sido_map = region_codes.get("sido", {})

    grouped_results = {}

    for sido_code, sido_name in sido_map.items():
        filtered_df = filter_by_sido(df, sido_code)

        if filtered_df.empty:
            continue

        business_count = len(filtered_df)
        total_workers = int(filtered_df["subscriber_count"].sum())

        if sido_name not in grouped_results:
            grouped_results[sido_name] = {
                "sido_name": sido_name,
                "business_count": 0,
                "total_workers": 0,
            }

        grouped_results[sido_name]["business_count"] += int(business_count)
        grouped_results[sido_name]["total_workers"] += total_workers

    results = []

    for sido_name, values in grouped_results.items():
        business_count = values["business_count"]
        total_workers = values["total_workers"]
        avg_workers = (
            round(total_workers / business_count, 1) if business_count > 0 else 0
        )

        results.append(
            {
                "sido_name": sido_name,
                "business_count": business_count,
                "total_workers": total_workers,
                "avg_workers": avg_workers,
            }
        )

    results.sort(key=lambda x: x["total_workers"], reverse=True)
    return results


def build_industry_summary(df: pd.DataFrame):
    required_columns = ["industry_name", "company_name", "subscriber_count"]

    for col in required_columns:
        if col not in df.columns:
            return []

    working_df = df.copy()

    working_df["industry_name"] = (
        working_df["industry_name"].fillna("").astype(str).str.strip()
    )
    working_df = working_df[working_df["industry_name"] != ""]
    working_df = working_df[working_df["industry_name"] != "BIZ_NO미존재사업장"]

    if working_df.empty:
        return []

    grouped = (
        working_df.groupby("industry_name")
        .agg(
            business_count=("company_name", "count"),
            total_workers=("subscriber_count", "sum"),
            avg_workers=("subscriber_count", "mean"),
        )
        .reset_index()
    )

    grouped["avg_workers"] = grouped["avg_workers"].round(1)

    grouped = grouped.sort_values(
        by=["total_workers", "business_count"], ascending=[False, False]
    )

    return grouped.to_dict(orient="records")


def build_industry_compare(left_industries, right_industries):
    left_map = {item["industry_name"]: item for item in left_industries}

    right_map = {item["industry_name"]: item for item in right_industries}

    all_industry_names = set(left_map.keys()) | set(right_map.keys())

    results = []

    for industry_name in all_industry_names:
        left_item = left_map.get(industry_name, {})
        right_item = right_map.get(industry_name, {})

        left_workers = int(left_item.get("total_workers", 0))
        right_workers = int(right_item.get("total_workers", 0))

        left_businesses = int(left_item.get("business_count", 0))
        right_businesses = int(right_item.get("business_count", 0))

        results.append(
            {
                "industry_name": industry_name,
                "left_business_count": left_businesses,
                "right_business_count": right_businesses,
                "business_count_gap": left_businesses - right_businesses,
                "left_total_workers": left_workers,
                "right_total_workers": right_workers,
                "total_workers_gap": left_workers - right_workers,
                "left_avg_workers": round(float(left_item.get("avg_workers", 0)), 1),
                "right_avg_workers": round(float(right_item.get("avg_workers", 0)), 1),
            }
        )

    results.sort(
        key=lambda item: abs(item["total_workers_gap"]),
        reverse=True,
    )

    return results


def build_comparison_summary(left_summary: dict, right_summary: dict):
    return {
        "business_count_gap": left_summary["business_count"]
        - right_summary["business_count"],
        "total_workers_gap": left_summary["total_workers"]
        - right_summary["total_workers"],
        "avg_workers_gap": round(
            left_summary["avg_workers"] - right_summary["avg_workers"], 1
        ),
    }


def filter_by_sido(df: pd.DataFrame, sido_code: str) -> pd.DataFrame:
    if "sido_code" not in df.columns:
        return pd.DataFrame()

    filtered_df = df[
        df["sido_code"].astype(str).str.strip() == str(sido_code).strip()
    ].copy()
    return filtered_df


def read_uploaded_file(uploaded_file):
    file_name = uploaded_file.name.lower()
    raw_bytes = uploaded_file.read()

    if file_name.endswith(".csv"):
        encodings_to_try = ["utf-8-sig", "utf-8", "cp949", "euc-kr"]
        last_error = None

        for encoding in encodings_to_try:
            try:
                text = raw_bytes.decode(encoding)
                df = pd.read_csv(StringIO(text))
                return df, encoding
            except Exception as e:
                last_error = e

        raise last_error

    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        df = pd.read_excel(BytesIO(raw_bytes))
        return df, "excel"

    raise ValueError("지원하지 않는 파일 형식입니다. csv, xlsx, xls만 가능합니다.")


def normalize_pension_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # 공백 제거
    df.columns = [str(col).strip() for col in df.columns]

    # 필요한 컬럼만 선택
    available_columns = [col for col in COLUMN_MAP.keys() if col in df.columns]
    normalized_df = df[available_columns].copy()

    # 컬럼명 표준화
    normalized_df = normalized_df.rename(columns=COLUMN_MAP)

    # 숫자형 정리
    for col in NUMERIC_COLUMNS:
        if col in normalized_df.columns:
            normalized_df[col] = (
                normalized_df[col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.strip()
                .replace("nan", None)
                .replace("", None)
            )
            normalized_df[col] = pd.to_numeric(
                normalized_df[col], errors="coerce"
            ).fillna(0)

    # 당월고지금액 컬럼 보정
    if "monthly_pension_amount" in normalized_df.columns:
        normalized_df["monthly_pension_amount"] = (
            normalized_df["monthly_pension_amount"]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
            .replace("nan", None)
            .replace("", None)
        )
        normalized_df["monthly_pension_amount"] = pd.to_numeric(
            normalized_df["monthly_pension_amount"], errors="coerce"
        ).fillna(0)
    else:
        normalized_df["monthly_pension_amount"] = 0

    # 가입자 수 컬럼 보정
    if "subscriber_count" in normalized_df.columns:
        normalized_df["subscriber_count"] = (
            normalized_df["subscriber_count"]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
            .replace("nan", None)
            .replace("", None)
        )
        normalized_df["subscriber_count"] = pd.to_numeric(
            normalized_df["subscriber_count"], errors="coerce"
        ).fillna(0)
    else:
        normalized_df["subscriber_count"] = 0

    # 문자열 컬럼 정리
    for col in normalized_df.columns:
        if col not in NUMERIC_COLUMNS and col not in [
            "monthly_pension_amount",
            "subscriber_count",
        ]:
            normalized_df[col] = normalized_df[col].fillna("").astype(str).str.strip()

    # 분석용 파생 컬럼 추가
    if (
        "monthly_pension_amount" in normalized_df.columns
        and "subscriber_count" in normalized_df.columns
    ):
        normalized_df["avg_pension_amount_per_subscriber"] = normalized_df.apply(
            lambda row: (
                round(row["monthly_pension_amount"] / row["subscriber_count"], 2)
                if row["subscriber_count"] > 0
                else 0
            ),
            axis=1,
        )

    # 주소 통합 컬럼
    if (
        "road_address" in normalized_df.columns
        and "lot_address" in normalized_df.columns
    ):
        normalized_df["full_address"] = normalized_df["road_address"]
        normalized_df.loc[normalized_df["full_address"] == "", "full_address"] = (
            normalized_df["lot_address"]
        )

    # 구 행정코드 → 현재 표준 행정코드 통합
    # 예: 42(구 강원도) → 51(강원특별자치도), 45(구 전라북도) → 52(전북특별자치도)
    normalized_df = apply_canonical_region_codes(normalized_df)

    return normalized_df


class UploadPensionFileView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"error": "파일이 없습니다."}, status=400)

        try:
            df, used_encoding = read_uploaded_file(uploaded_file)
            normalized_df = normalize_pension_dataframe(df)
            region_summary = build_region_summary(normalized_df)

            return Response(
                {
                    "message": "파일 업로드 및 표준화 성공",
                    "encoding": used_encoding,
                    "row_count": len(normalized_df),
                    "original_columns": df.columns.tolist(),
                    "normalized_columns": normalized_df.columns.tolist(),
                    "preview": normalized_df.head(5).to_dict(orient="records"),
                    "region_summary": region_summary[:20],
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class UploadPensionBusanSummaryView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"error": "파일이 없습니다."}, status=400)

        try:
            df, used_encoding = read_uploaded_file(uploaded_file)
            normalized_df = normalize_pension_dataframe(df)

            busan_df = filter_by_sido(normalized_df, "26")
            busan_region_summary = build_region_summary(busan_df)

            return Response(
                {
                    "message": "부산 필터 및 집계 성공",
                    "encoding": used_encoding,
                    "row_count": len(busan_df),
                    "sido_code": "26",
                    "sido_name": "부산광역시",
                    "normalized_columns": busan_df.columns.tolist(),
                    "preview": busan_df.head(5).to_dict(orient="records"),
                    "region_summary": busan_region_summary,
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class UploadPensionCompareView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"error": "파일이 없습니다."}, status=400)

        try:
            df, used_encoding = read_uploaded_file(uploaded_file)
            normalized_df = normalize_pension_dataframe(df)

            # 기본 비교: 서울(11) vs 부산(26)
            left_code = request.data.get("left_sido_code", "11")
            right_code = request.data.get("right_sido_code", "26")

            left_summary = build_sido_summary(normalized_df, left_code)
            right_summary = build_sido_summary(normalized_df, right_code)
            comparison = build_comparison_summary(left_summary, right_summary)

            left_region_summary = build_region_summary(
                filter_by_sido(normalized_df, left_code)
            )[:10]

            right_region_summary = build_region_summary(
                filter_by_sido(normalized_df, right_code)
            )[:10]

            return Response(
                {
                    "message": "지역 비교 집계 성공",
                    "encoding": used_encoding,
                    "row_count": len(normalized_df),
                    "left_region": left_summary,
                    "right_region": right_summary,
                    "comparison": comparison,
                    "left_region_summary": left_region_summary,
                    "right_region_summary": right_region_summary,
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class SeoulBusanCompareSampleView(APIView):
    def get(self, request):
        return Response(
            {
                "message": "서울 vs 부산 비교 샘플 데이터",
                "left_region": {
                    "sido_code": "11",
                    "sido_name": "서울특별시",
                    "business_count": 133169,
                    "total_workers": 3785997,
                    "avg_workers": 28.4,
                },
                "right_region": {
                    "sido_code": "26",
                    "sido_name": "부산광역시",
                    "business_count": 32198,
                    "total_workers": 510245,
                    "avg_workers": 15.8,
                },
                "comparison": {
                    "business_count_gap": 100971,
                    "total_workers_gap": 3275752,
                    "avg_workers_gap": 12.6,
                },
                "left_region_summary": [
                    {
                        "full_region_name": "서울특별시 강남구",
                        "business_count": 23087,
                        "total_workers": 704727,
                        "avg_workers": 30.5,
                    },
                    {
                        "full_region_name": "서울특별시 영등포구",
                        "business_count": 9139,
                        "total_workers": 428735,
                        "avg_workers": 46.9,
                    },
                    {
                        "full_region_name": "서울특별시 중구",
                        "business_count": 7159,
                        "total_workers": 408984,
                        "avg_workers": 57.1,
                    },
                    {
                        "full_region_name": "서울특별시 서초구",
                        "business_count": 12338,
                        "total_workers": 387657,
                        "avg_workers": 31.4,
                    },
                    {
                        "full_region_name": "서울특별시 송파구",
                        "business_count": 9829,
                        "total_workers": 281024,
                        "avg_workers": 28.6,
                    },
                ],
                "right_region_summary": [
                    {
                        "full_region_name": "부산광역시 강서구",
                        "business_count": 4817,
                        "total_workers": 75497,
                        "avg_workers": 15.7,
                    },
                    {
                        "full_region_name": "부산광역시 해운대구",
                        "business_count": 3621,
                        "total_workers": 50539,
                        "avg_workers": 14.0,
                    },
                    {
                        "full_region_name": "부산광역시 부산진구",
                        "business_count": 2759,
                        "total_workers": 47096,
                        "avg_workers": 17.1,
                    },
                    {
                        "full_region_name": "부산광역시 남구",
                        "business_count": 1861,
                        "total_workers": 42476,
                        "avg_workers": 22.8,
                    },
                    {
                        "full_region_name": "부산광역시 사상구",
                        "business_count": 2801,
                        "total_workers": 37809,
                        "avg_workers": 13.5,
                    },
                ],
            }
        )


def read_pension_file_from_disk(file_path: Path):
    if not file_path.exists():
        raise FileNotFoundError(f"파일이 존재하지 않습니다: {file_path}")

    file_name = file_path.name.lower()

    if file_name.endswith(".csv"):
        raw_bytes = file_path.read_bytes()
        encodings_to_try = ["utf-8-sig", "utf-8", "cp949", "euc-kr"]
        last_error = None

        for encoding in encodings_to_try:
            try:
                text = raw_bytes.decode(encoding)
                df = pd.read_csv(StringIO(text))
                return df, encoding
            except Exception as e:
                last_error = e

        raise last_error

    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        df = pd.read_excel(file_path)
        return df, "excel"

    raise ValueError("지원하지 않는 파일 형식입니다. csv, xlsx, xls만 가능합니다.")


class SeoulBusanCompareRealView(APIView):
    def get(self, request):
        try:
            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            left_code = request.GET.get("left_sido_code", "11").strip()
            right_code = request.GET.get("right_sido_code", "26").strip()

            left_region = build_sido_summary(normalized_df, left_code)
            right_region = build_sido_summary(normalized_df, right_code)

            left_df = filter_by_sido(normalized_df, left_code)
            right_df = filter_by_sido(normalized_df, right_code)

            left_region_summary = build_region_summary(left_df)[:10]
            right_region_summary = build_region_summary(right_df)[:10]

            comparison = {
                "business_count_gap": left_region["business_count"]
                - right_region["business_count"],
                "total_workers_gap": left_region["total_workers"]
                - right_region["total_workers"],
                "avg_workers_gap": round(
                    left_region["avg_workers"] - right_region["avg_workers"], 1
                ),
            }

            return Response(
                {
                    "message": "지역 비교 실데이터 집계 성공",
                    "encoding": used_encoding,
                    "left_region": left_region,
                    "right_region": right_region,
                    "comparison": comparison,
                    "left_region_summary": left_region_summary,
                    "right_region_summary": right_region_summary,
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                }
            )

        except Exception as e:
            traceback.print_exc()
            return Response(
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )


class BusanSummaryRealView(APIView):
    def get(self, request):
        try:
            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            busan_df = filter_by_sido(normalized_df, "26")
            busan_region_summary = build_region_summary(busan_df)

            return Response(
                {
                    "message": "부산 실데이터 집계 성공",
                    "encoding": used_encoding,
                    "row_count": len(busan_df),
                    "sido_code": "26",
                    "sido_name": "부산광역시",
                    "normalized_columns": busan_df.columns.tolist(),
                    "preview": busan_df.head(5).to_dict(orient="records"),
                    "region_summary": busan_region_summary,
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)


class RegionSummaryRealView(APIView):
    def get(self, request):
        try:
            sido_code = request.GET.get("sido_code")

            if not sido_code:
                return Response(
                    {"error": "sido_code parameter is required"},
                    status=400,
                )

            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            filtered_df = filter_by_sido(normalized_df, sido_code)
            region_summary = build_region_summary(filtered_df)
            industry_top10 = build_industry_top_by_sido(filtered_df, top_n=10)
            company_top20 = build_company_top_by_sido(
                filtered_df, top_n=20, min_subscribers=10
            )
            legal_dong_top10 = build_legal_dong_top_by_sido(filtered_df, top_n=10)

            region_codes = load_region_code_map()

            return Response(
                {
                    "message": "지역 상세데이터 집계 성공",
                    "encoding": used_encoding,
                    "row_count": int(len(filtered_df)),
                    "sido_code": str(sido_code),
                    "sido_name": region_codes.get("sido", {}).get(str(sido_code), ""),
                    "region_summary": region_summary,
                    "industry_top10": industry_top10,
                    "company_top20": company_top20,
                    "legal_dong_top10": legal_dong_top10,
                }
            )

        except Exception as e:
            return Response(
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )


class NationwideSigunguRankingRealView(APIView):
    def get(self, request):
        try:
            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            # 전체 데이터 기준 시군구 집계
            sigungu_summary = build_region_summary(normalized_df)

            # 추정 평균연소득 기준 내림차순
            income_top = sorted(
                sigungu_summary,
                key=lambda item: item.get("estimated_avg_annual_income", 0),
                reverse=True,
            )

            # 가입자 수 기준 내림차순
            worker_top = sorted(
                sigungu_summary,
                key=lambda item: item.get("total_workers", 0),
                reverse=True,
            )

            # 사업장 수 기준 내림차순
            business_top = sorted(
                sigungu_summary,
                key=lambda item: item.get("business_count", 0),
                reverse=True,
            )

            return Response(
                {
                    "message": "전국 시군구 랭킹 집계 성공",
                    "encoding": used_encoding,
                    "row_count": int(len(normalized_df)),
                    "income_top20": income_top[:20],
                    "worker_top20": worker_top[:20],
                    "business_top20": business_top[:20],
                    "all_sigungu_ranking": income_top,
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                }
            )

        except Exception as e:
            return Response(
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )


class NationwideSummaryRealView(APIView):
    def get(self, request):
        try:
            region_codes = load_region_code_map()

            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            sido_map = region_codes.get("sido", {})

            nationwide_summary = []

            for sido_code, sido_name in sido_map.items():
                summary = build_sido_summary(normalized_df, sido_code)

                # 데이터가 실제로 있는 시도만 포함
                if summary["business_count"] > 0:
                    nationwide_summary.append(summary)

            # 가입자 수 기준 내림차순 정렬
            nationwide_summary.sort(
                key=lambda item: item["total_workers"],
                reverse=True,
            )

            return Response(
                {
                    "message": "전국 실데이터 집계 성공",
                    "encoding": used_encoding,
                    "row_count": len(normalized_df),
                    "nationwide_summary": nationwide_summary,
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                }
            )

        except Exception as e:
            return Response(
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )


class IndustrySummaryRealView(APIView):
    def get(self, request):
        try:
            region_codes = load_region_code_map()
            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            sido_code = request.GET.get("sido_code", "26").strip()
            region_df = filter_by_sido(normalized_df, sido_code)
            industry_summary = build_industry_summary(region_df)

            quality_info = evaluate_data_quality(len(region_df))

            return Response(
                {
                    "message": "업종 실데이터 집계 성공",
                    "encoding": used_encoding,
                    "row_count": len(region_df),
                    "sido_code": sido_code,
                    "sido_name": region_codes.get("sido", {}).get(sido_code, ""),
                    "industry_summary": industry_summary[:20],
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                    **quality_info,
                }
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)


def evaluate_data_quality(row_count: int):
    if row_count < 30:
        return {
            "is_low_sample": True,
            "quality_status": "critical",
            "quality_message": "현재 선택 지역의 표본 수가 매우 적어 해석에 주의가 필요합니다.",
        }

    if row_count < 100:
        return {
            "is_low_sample": True,
            "quality_status": "warning",
            "quality_message": "현재 선택 지역의 표본 수가 적어 일부 결과가 왜곡될 수 있습니다.",
        }

    return {
        "is_low_sample": False,
        "quality_status": "ok",
        "quality_message": "",
    }


class IndustryCompareRealView(APIView):
    def get(self, request):
        try:
            region_codes = load_region_code_map()

            df, used_encoding = read_pension_file_from_disk(PENSION_SAMPLE_FILE)
            normalized_df = normalize_pension_dataframe(df)

            left_code = request.GET.get("left_sido_code", "11").strip()
            right_code = request.GET.get("right_sido_code", "26").strip()

            left_df = filter_by_sido(normalized_df, left_code)
            right_df = filter_by_sido(normalized_df, right_code)

            left_industry_summary = build_industry_summary(left_df)
            right_industry_summary = build_industry_summary(right_df)

            compared_industries = build_industry_compare(
                left_industry_summary,
                right_industry_summary,
            )

            return Response(
                {
                    "message": "업종 비교 실데이터 집계 성공",
                    "encoding": used_encoding,
                    "left_region": {
                        "sido_code": left_code,
                        "sido_name": region_codes.get("sido", {}).get(left_code, ""),
                        "row_count": len(left_df),
                    },
                    "right_region": {
                        "sido_code": right_code,
                        "sido_name": region_codes.get("sido", {}).get(right_code, ""),
                        "row_count": len(right_df),
                    },
                    "left_industry_summary": left_industry_summary[:20],
                    "right_industry_summary": right_industry_summary[:20],
                    "industry_compare": compared_industries[:30],
                    "source_file": str(PENSION_SAMPLE_FILE.name),
                }
            )

        except Exception as e:
            return Response(
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                status=500,
            )
