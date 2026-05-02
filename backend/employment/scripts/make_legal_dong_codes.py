import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent.parent

SOURCE_FILE = BASE_DIR / "data" / "국토교통부_법정동코드_20250805.csv"
OUTPUT_FILE = BASE_DIR / "employment" / "data" / "legal_dong_codes.json"


def read_csv_with_encoding(file_path: Path):
    encodings = ["utf-8-sig", "utf-8", "cp949", "euc-kr"]

    last_error = None

    for encoding in encodings:
        try:
            return pd.read_csv(file_path, encoding=encoding), encoding
        except Exception as e:
            last_error = e

    raise last_error


def main():
    df, encoding = read_csv_with_encoding(SOURCE_FILE)

    df.columns = [str(col).strip() for col in df.columns]

    required_columns = {"법정동코드", "법정동명"}
    missing_columns = required_columns - set(df.columns)

    if missing_columns:
        raise ValueError(f"필수 컬럼이 없습니다: {missing_columns}")

    if "폐지여부" in df.columns:
        df = df[df["폐지여부"].astype(str).str.strip() == "존재"]

    mapping = {}

    for _, row in df.iterrows():
        code = str(row["법정동코드"]).strip().replace(".0", "")
        name = str(row["법정동명"]).strip()

        if code and name:
            mapping[code] = name

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"입력 인코딩: {encoding}")
    print(f"생성 완료: {OUTPUT_FILE}")
    print(f"법정동 코드 수: {len(mapping):,}")


if __name__ == "__main__":
    main()
