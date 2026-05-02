// =========================
// 원본 데이터 타입 (기존 유지)
// =========================
export type RawWorkplaceRow = {
  saeopjangNm?: string;
  addr?: string;
  sangsiInwonCnt?: string;
  seongripDt?: string;
  gyEopjongNm?: string;
  sjEopjongNm?: string;
};

export type WorkplaceRow = {
  name: string;
  address: string;
  workerCount: number;
  startDate?: string;
  industryName?: string;
};

export type DistrictSummary = {
  district: string;
  businessCount: number;
  workerCount: number;
  avgWorkersPerBusiness: number;
  employmentShare: number;
};

// =========================
// 서울 vs 부산 비교용 타입
// =========================
export type RegionCompareSummary = {
  sido_code: string;
  sido_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

export type RegionCompareItem = {
  full_region_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
};

export type CompareApiResponse = {
  message: string;
  left_region: RegionCompareSummary;
  right_region: RegionCompareSummary;
  comparison: {
    business_count_gap: number;
    total_workers_gap: number;
    avg_workers_gap: number;
  };
  left_region_summary: RegionCompareItem[];
  right_region_summary: RegionCompareItem[];
};

// =========================
// 부산 전용 대시보드 타입
// =========================
export type BusanRegionSummaryItem = {
  sido_code: string;
  sigungu_code: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
  region_key: string;
  sido_name: string;
  sigungu_name: string;
  full_region_name: string;
};

export type BusanSummaryApiResponse = {
  message: string;
  encoding: string;
  row_count: number;
  sido_code: string;
  sido_name: string;
  normalized_columns: string[];
  preview: Record<string, string | number>[];
  region_summary: BusanRegionSummaryItem[];
};

export type NationwideSummaryItem = {
  sido_code: string;
  sido_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

export type NationwideSummaryApiResponse = {
  message: string;
  encoding: string;
  row_count: number;
  nationwide_summary: NationwideSummaryItem[];
  source_file: string;
};

export type IndustrySummaryItem = {
  industry_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
};

export type IndustrySummaryApiResponse = {
  message: string;
  encoding: string;
  row_count: number;
  sido_code: string;
  sido_name: string;
  industry_summary: IndustrySummaryItem[];
  is_low_sample: boolean;
  quality_status: string;
  quality_message: string;
};

export type IndustryCompareItem = {
  industry_name: string;
  left_business_count: number;
  right_business_count: number;
  business_count_gap: number;
  left_total_workers: number;
  right_total_workers: number;
  total_workers_gap: number;
  left_avg_workers: number;
  right_avg_workers: number;
};

export type IndustryCompareRegion = {
  sido_code: string;
  sido_name: string;
  row_count: number;
};

export type IndustryCompareApiResponse = {
  message: string;
  encoding: string;
  left_region: IndustryCompareRegion;
  right_region: IndustryCompareRegion;
  left_industry_summary: IndustrySummaryItem[];
  right_industry_summary: IndustrySummaryItem[];
  industry_compare: IndustryCompareItem[];
  source_file: string;
};
