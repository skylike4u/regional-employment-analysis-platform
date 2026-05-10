import type {
  CompareApiResponse,
  BusanSummaryApiResponse,
  NationwideSummaryApiResponse,
  IndustrySummaryApiResponse,
  IndustryCompareApiResponse,
} from "../types/employment";

const BASE_URL = "http://127.0.0.1:8000/api/employment";

export async function fetchCompareReal(
  leftSidoCode: string,
  rightSidoCode: string
): Promise<CompareApiResponse> {
  const response = await fetch(
    `${BASE_URL}/compare-real/?left_sido_code=${leftSidoCode}&right_sido_code=${rightSidoCode}`
  );

  if (!response.ok) {
    throw new Error(`비교 실데이터 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export async function fetchRegionSummaryReal(
  sidoCode: string
): Promise<BusanSummaryApiResponse> {
  const response = await fetch(
    `${BASE_URL}/region-summary-real/?sido_code=${sidoCode}`
  );

  if (!response.ok) {
    throw new Error(`지역 실데이터 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export async function fetchNationwideSummaryReal(): Promise<NationwideSummaryApiResponse> {
  const response = await fetch(`${BASE_URL}/nationwide-summary-real/`);

  if (!response.ok) {
    throw new Error(`전국 실데이터 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export async function fetchIndustrySummaryReal(
  sidoCode: string
): Promise<IndustrySummaryApiResponse> {
  const response = await fetch(
    `${BASE_URL}/industry-summary-real/?sido_code=${sidoCode}`
  );

  if (!response.ok) {
    throw new Error(`업종 API 실패: ${response.status}`);
  }

  return response.json();
}

export async function fetchIndustryCompareReal(
  leftSidoCode: string,
  rightSidoCode: string
): Promise<IndustryCompareApiResponse> {
  const response = await fetch(
    `${BASE_URL}/industry-compare-real/?left_sido_code=${leftSidoCode}&right_sido_code=${rightSidoCode}`
  );

  if (!response.ok) {
    throw new Error(`업종 비교 API 요청 실패: ${response.status}`);
  }

  return response.json();
}

export async function fetchNationwideSigunguRankingReal() {
  const response = await fetch(
    "http://127.0.0.1:8000/api/employment/nationwide-sigungu-ranking-real/"
  );

  if (!response.ok) {
    throw new Error("전국 시군구 랭킹 API 호출 실패");
  }

  return response.json();
}

export async function fetchRegionExplorerReal(params: {
  sidoCode: string;
  sigunguCode?: string;
  legalDongCode?: string;
  industryName?: string;
}) {
  const searchParams = new URLSearchParams();

  searchParams.set("sido_code", params.sidoCode);
  searchParams.set("sigungu_code", params.sigunguCode ?? "all");
  searchParams.set("legal_dong_code", params.legalDongCode ?? "all");
  searchParams.set("industry_name", params.industryName ?? "all");

  const response = await fetch(
    `http://127.0.0.1:8000/api/employment/region-explorer-real/?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("지역 탐색 API 요청 실패");
  }

  return response.json();
}
