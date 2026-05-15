import { useEffect, useMemo, useState } from "react";
import { fetchRegionExplorerReal } from "../api/workers";
import { REGION_OPTIONS } from "../constants/regions";
import { formatNumber } from "../utils/format";
import RegionBarChart from "../components/charts/RegionBarChart";
import type { BusanSummaryApiResponse } from "../types/employment";

type RegionSummaryItem = BusanSummaryApiResponse["region_summary"][number] & {
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

type IndustryTopItem = {
  industry_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

type CompanyTopItem = {
  company_name: string;
  business_number: string;
  sido_code: string;
  sigungu_code: string;
  emd_code: string;
  industry_code: string;
  industry_name: string;
  full_address: string;
  subscriber_count: number;
  monthly_pension_amount: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

type LegalDongTopItem = {
  legal_dong_code: string;
  legal_dong_name: string;
  legal_dong_full_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
};

type RegionSummaryResponse = BusanSummaryApiResponse & {
  region_summary: RegionSummaryItem[];
  industry_top10: IndustryTopItem[];
  company_top20: CompanyTopItem[];
  legal_dong_top10: LegalDongTopItem[];
};

function formatIncomeManwon(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

function shortText(value: string, maxLength = 24) {
  if (!value) return "-";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

type BusanDashboardProps = {
  initialSidoCode?: string;
  shouldAutoLoad?: boolean;
  onAutoLoadDone?: () => void;
};

export default function BusanDashboard({
  initialSidoCode = "26",
  shouldAutoLoad = false,
  onAutoLoadDone,
}: BusanDashboardProps) {
  const [draftSidoCode, setDraftSidoCode] = useState(initialSidoCode);
  const [data, setData] = useState<RegionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSigunguCode, setSelectedSigunguCode] = useState("all");
  const [selectedLegalDongCode, setSelectedLegalDongCode] = useState("all");
  const [selectedIndustryName, setSelectedIndustryName] = useState("all");
  const [optionData, setOptionData] = useState<RegionSummaryResponse | null>(
    null
  );
  const [optionLoading, setOptionLoading] = useState(false);

  useEffect(() => {
    async function initializeRegionOptions() {
      try {
        setDraftSidoCode(initialSidoCode);
        setSelectedSigunguCode("all");
        setSelectedLegalDongCode("all");
        setSelectedIndustryName("all");

        setOptionLoading(true);

        const result = await fetchRegionExplorerReal({
          sidoCode: initialSidoCode,
          sigunguCode: "all",
          legalDongCode: "all",
          industryName: "all",
        });

        setOptionData(result as RegionSummaryResponse);

        if (shouldAutoLoad) {
          setLoading(true);
          setErrorMessage("");
          setHasSearched(true);
          setData(result as RegionSummaryResponse);
        } else {
          setData(null);
          setErrorMessage("");
          setHasSearched(false);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("지역 상세 API 연결에 실패했습니다.");
      } finally {
        setLoading(false);
        setOptionLoading(false);
        onAutoLoadDone?.();
      }
    }

    initializeRegionOptions();
  }, [initialSidoCode]);

  async function loadOptionData(params: {
    sidoCode: string;
    sigunguCode?: string;
    legalDongCode?: string;
    industryName?: string;
  }) {
    try {
      setOptionLoading(true);

      const result = await fetchRegionExplorerReal({
        sidoCode: params.sidoCode,
        sigunguCode: params.sigunguCode ?? "all",
        legalDongCode: params.legalDongCode ?? "all",
        industryName: params.industryName ?? "all",
      });

      setOptionData(result as RegionSummaryResponse);
    } catch (error) {
      console.error(error);
    } finally {
      setOptionLoading(false);
    }
  }

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      const result = await fetchRegionExplorerReal({
        sidoCode: draftSidoCode,
        sigunguCode: selectedSigunguCode,
        legalDongCode: selectedLegalDongCode,
        industryName: selectedIndustryName,
      });

      const nextData = result as RegionSummaryResponse;

      setData(nextData);
      setOptionData(nextData);
    } catch (error) {
      console.error(error);
      setErrorMessage("지역 상세 API 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const selectedRegionName =
    REGION_OPTIONS.find((region) => region.code === draftSidoCode)?.name ??
    "선택 지역";

  const totalWorkers = data?.scope_summary?.total_workers ?? 0;
  const totalBusinesses = data?.scope_summary?.business_count ?? 0;
  const avgWorkers = data?.scope_summary?.avg_workers ?? 0;
  const estimatedAvgIncome =
    data?.scope_summary?.estimated_avg_annual_income ?? 0;

  const sigunguOptions = useMemo(() => {
    if (!optionData?.sigungu_options) return [];

    return optionData.sigungu_options.map((item) => ({
      code: item.code,
      name: item.name,
    }));
  }, [optionData]);

  const legalDongOptions = useMemo(() => {
    if (!optionData?.legal_dong_options) return [];

    return optionData.legal_dong_options.map((item) => ({
      code: item.code,
      name: item.name,
      fullName: item.full_name,
    }));
  }, [optionData]);

  const industryOptions = useMemo(() => {
    if (!optionData?.industry_options) return [];

    return optionData.industry_options.map((item) => ({
      code: item.code,
      name: item.name,
    }));
  }, [optionData]);

  const selectedSigunguName =
    sigunguOptions.find((item) => item.code === selectedSigunguCode)?.name ??
    "";

  const selectedLegalDongName =
    legalDongOptions.find((item) => item.code === selectedLegalDongCode)
      ?.name ?? "";

  const selectedIndustryLabel =
    selectedIndustryName !== "all" ? selectedIndustryName : "";

  const currentScopeLabel = [
    selectedRegionName,
    selectedSigunguCode !== "all" ? selectedSigunguName : "",
    selectedLegalDongCode !== "all" ? selectedLegalDongName : "",
    selectedIndustryLabel,
  ]
    .filter(Boolean)
    .join(" ");

  const isSigunguScope = selectedSigunguCode !== "all";
  const isLegalDongScope = selectedLegalDongCode !== "all";
  const isIndustryScope = selectedIndustryName !== "all";

  const scopeAvgIncome = estimatedAvgIncome;

  const topWorkerRegion = data?.region_summary[0];

  const topIncomeRegion = useMemo(() => {
    if (!data) return null;

    return [...data.region_summary]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )[0];
  }, [data]);

  const topIndustryByWorkers = data?.industry_top10?.[0];

  const topIndustryByIncome = useMemo(() => {
    if (!data?.industry_top10) return null;

    return [...data.industry_top10]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )[0];
  }, [data]);

  const topCompanyByWorkers = data?.company_top20?.[0];

  const topCompanyByIncome = useMemo(() => {
    if (!data?.company_top20) return null;

    return [...data.company_top20]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )[0];
  }, [data]);

  const topLegalDongByWorkers = data?.legal_dong_top10?.[0];

  const topLegalDongByIncome = useMemo(() => {
    if (!data?.legal_dong_top10) return null;

    return [...data.legal_dong_top10]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )[0];
  }, [data]);

  const spatialTop3WorkerShare = useMemo(() => {
    if (!data || totalWorkers <= 0) return 0;

    const isSigunguSelected = selectedSigunguCode !== "all";

    const sourceItems = isSigunguSelected
      ? data.legal_dong_top10
      : data.region_summary;

    const top3Workers = sourceItems
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3Workers / totalWorkers) * 100;
  }, [data, totalWorkers, selectedSigunguCode]);

  const top3IndustryWorkerShare = useMemo(() => {
    if (!data?.industry_top10 || totalWorkers <= 0) return 0;

    const top3IndustryWorkers = data.industry_top10
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3IndustryWorkers / totalWorkers) * 100;
  }, [data, totalWorkers]);

  const top3LegalDongWorkerShare = useMemo(() => {
    if (!data?.legal_dong_top10 || totalWorkers <= 0) return 0;

    const top3LegalDongWorkers = data.legal_dong_top10
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3LegalDongWorkers / totalWorkers) * 100;
  }, [data, totalWorkers]);

  const workerChartData = useMemo(() => {
    if (!data) return [];

    return [...data.region_summary]
      .sort((a, b) => b.total_workers - a.total_workers)
      .map((item) => ({
        district: item.sigungu_name,
        workerCount: item.total_workers,
      }));
  }, [data]);

  const businessChartData = useMemo(() => {
    if (!data) return [];

    return [...data.region_summary]
      .sort((a, b) => b.business_count - a.business_count)
      .map((item) => ({
        district: item.sigungu_name,
        businessCount: item.business_count,
      }));
  }, [data]);

  const incomeChartData = useMemo(() => {
    if (!data) return [];

    return [...data.region_summary]
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )
      .map((item) => ({
        district: item.sigungu_name,
        income: Math.round(item.estimated_avg_annual_income / 10000),
      }));
  }, [data]);

  const industryWorkerChartData = useMemo(() => {
    if (!data?.industry_top10) return [];

    return [...data.industry_top10]
      .sort((a, b) => b.total_workers - a.total_workers)
      .map((item) => ({
        district: item.industry_name,
        workerCount: item.total_workers,
      }));
  }, [data]);

  const industryIncomeChartData = useMemo(() => {
    if (!data?.industry_top10) return [];

    return [...data.industry_top10]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )
      .map((item) => ({
        district: item.industry_name,
        income: Math.round(item.estimated_avg_annual_income / 10000),
      }));
  }, [data]);

  const legalDongWorkerChartData = useMemo(() => {
    if (!data?.legal_dong_top10) return [];

    return [...data.legal_dong_top10]
      .sort((a, b) => b.total_workers - a.total_workers)
      .map((item) => ({
        district: item.legal_dong_name,
        workerCount: item.total_workers,
      }));
  }, [data]);

  const legalDongIncomeChartData = useMemo(() => {
    if (!data?.legal_dong_top10) return [];

    return [...data.legal_dong_top10]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )
      .map((item) => ({
        district: item.legal_dong_name,
        income: Math.round(item.estimated_avg_annual_income / 10000),
      }));
  }, [data]);

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px 24px 32px",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <h1 style={pageTitle}>지역 상세 대시보드</h1>
        <p style={pageSubtitle}>
          선택한 시도의 시군구, 법정동, 업종, 대표 기업과 추정 평균연소득을
          분석합니다.
        </p>
      </header>

      <section style={filterBox}>
        <div style={filterGrid}>
          <div>
            <label style={labelStyle}>시도</label>
            <select
              value={draftSidoCode}
              onChange={(e) => {
                const nextSidoCode = e.target.value;

                setDraftSidoCode(nextSidoCode);
                setSelectedSigunguCode("all");
                setSelectedLegalDongCode("all");
                setSelectedIndustryName("all");

                setData(null);
                setOptionData(null);
                setErrorMessage("");
                setHasSearched(false);

                loadOptionData({
                  sidoCode: nextSidoCode,
                  sigunguCode: "all",
                  legalDongCode: "all",
                  industryName: "all",
                });
              }}
              style={selectStyle}
            >
              {REGION_OPTIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>시군구</label>
            <select
              value={selectedSigunguCode}
              onChange={(e) => {
                const nextSigunguCode = e.target.value;

                setSelectedSigunguCode(nextSigunguCode);
                setSelectedLegalDongCode("all");
                setSelectedIndustryName("all");

                loadOptionData({
                  sidoCode: draftSidoCode,
                  sigunguCode: nextSigunguCode,
                  legalDongCode: "all",
                  industryName: "all",
                });
              }}
              style={selectStyle}
              disabled={!optionData}
            >
              <option value="all">전체</option>
              {sigunguOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>법정동</label>
            <select
              value={selectedLegalDongCode}
              onChange={(e) => {
                const nextLegalDongCode = e.target.value;

                setSelectedLegalDongCode(nextLegalDongCode);
                setSelectedIndustryName("all");

                loadOptionData({
                  sidoCode: draftSidoCode,
                  sigunguCode: selectedSigunguCode,
                  legalDongCode: nextLegalDongCode,
                  industryName: "all",
                });
              }}
              style={selectStyle}
              disabled={!optionData || selectedSigunguCode === "all"}
            >
              <option value="all">전체</option>
              {legalDongOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>업종</label>
            <select
              value={selectedIndustryName}
              onChange={(e) => setSelectedIndustryName(e.target.value)}
              style={selectStyle}
              disabled={!optionData}
            >
              <option value="all">전체</option>
              {industryOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "1px solid #0f766e",
            background: loading ? "#94a3b8" : "#0f766e",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 800,
            height: "42px",
            minWidth: "96px",
            boxShadow: loading ? "none" : "0 4px 10px rgba(15, 118, 110, 0.24)",
          }}
        >
          {loading ? "조회 중..." : "분석 조회"}
        </button>
      </section>

      {!data && !loading && !errorMessage && (
        <section style={emptyBox}>
          <div style={emptyTitle}>
            {currentScopeLabel || selectedRegionName} 분석 대기 중
          </div>
          <div style={emptyText}>
            분석 조회 버튼을 누르면 선택한 범위의 사업장 수, 가입자 수, 업종
            구조, 대표 기업, 추정 평균연소득이 표시됩니다.
          </div>
          <div style={emptyHint}>
            조회 범위: 시도 → 시군구 → 법정동 → 업종 순으로 좁혀볼 수 있습니다.
          </div>
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          지역 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          <section style={resultSummaryBox}>
            <div>
              <div style={resultSummaryLabel}>현재 조회 범위</div>
              <div style={resultSummaryTitle}>
                {currentScopeLabel || data.sido_name}
              </div>
            </div>

            <div style={resultSummaryMeta}>
              <span>사업장 {formatNumber(totalBusinesses)}개</span>
              <span>가입자 {formatNumber(totalWorkers)}명</span>
              <span>추정 평균연소득 {formatIncomeManwon(scopeAvgIncome)}</span>
            </div>
          </section>

          <section style={isLegalDongScope ? grid4 : grid5}>
            <InfoCard
              label="분석 지역"
              value={currentScopeLabel || data.sido_name}
            />

            {!isLegalDongScope && (
              <InfoCard
                label={isSigunguScope ? "법정동 수" : "시군구 수"}
                value={
                  isSigunguScope
                    ? data.legal_dong_top10.length
                    : data.region_summary.length
                }
              />
            )}

            <InfoCard
              label="총 사업장 수"
              value={formatNumber(totalBusinesses)}
            />
            <InfoCard label="총 가입자 수" value={formatNumber(totalWorkers)} />
            <InfoCard
              label="추정 평균연소득"
              value={formatIncomeManwon(scopeAvgIncome)}
            />
          </section>

          <section style={grid4}>
            {!isLegalDongScope && (
              <InfoCard
                label={
                  isSigunguScope ? "가입자 수 1위 법정동" : "가입자 수 1위 지역"
                }
                value={
                  isSigunguScope
                    ? topLegalDongByWorkers?.legal_dong_name ?? "-"
                    : topWorkerRegion?.sigungu_name ?? "-"
                }
                subText={
                  isSigunguScope
                    ? topLegalDongByWorkers
                      ? `${formatNumber(topLegalDongByWorkers.total_workers)}명`
                      : "-"
                    : topWorkerRegion
                    ? `${formatNumber(topWorkerRegion.total_workers)}명`
                    : "-"
                }
              />
            )}

            <InfoCard
              label="가입자 수 1위 업종"
              value={topIndustryByWorkers?.industry_name ?? "-"}
              subText={
                topIndustryByWorkers
                  ? `${formatNumber(topIndustryByWorkers.total_workers)}명`
                  : "-"
              }
            />

            <InfoCard
              label="대표 기업"
              value={topCompanyByWorkers?.company_name ?? "-"}
              subText={
                topCompanyByWorkers
                  ? `${formatNumber(topCompanyByWorkers.subscriber_count)}명`
                  : "-"
              }
            />

            <InfoCard label="정책 해석 축" value="지역 × 동 × 업종 × 기업" />
          </section>

          <section style={isLegalDongScope ? grid2 : grid4}>
            {!isLegalDongScope && (
              <>
                <InfoCard
                  label="추정 평균연소득 1위 지역"
                  value={topIncomeRegion?.sigungu_name ?? "-"}
                  subText={
                    topIncomeRegion
                      ? formatIncomeManwon(
                          topIncomeRegion.estimated_avg_annual_income
                        )
                      : "-"
                  }
                />

                <InfoCard
                  label="고연소득 법정동"
                  value={topLegalDongByIncome?.legal_dong_name ?? "-"}
                  subText={
                    topLegalDongByIncome
                      ? formatIncomeManwon(
                          topLegalDongByIncome.estimated_avg_annual_income
                        )
                      : "-"
                  }
                />
              </>
            )}

            <InfoCard
              label="고연소득 업종"
              value={topIndustryByIncome?.industry_name ?? "-"}
              subText={
                topIndustryByIncome
                  ? formatIncomeManwon(
                      topIndustryByIncome.estimated_avg_annual_income
                    )
                  : "-"
              }
            />

            <InfoCard
              label="고연소득 대표 기업"
              value={topCompanyByIncome?.company_name ?? "-"}
              subText={
                topCompanyByIncome
                  ? formatIncomeManwon(
                      topCompanyByIncome.estimated_avg_annual_income
                    )
                  : "-"
              }
            />
          </section>

          {!isLegalDongScope && (
            <section style={grid4}>
              <InfoCard
                label="상위 3개 공간 가입자 비중"
                value={`${spatialTop3WorkerShare.toFixed(1)}%`}
                subText={
                  selectedSigunguCode === "all"
                    ? "시군구 집중도"
                    : "법정동 집중도"
                }
              />
              <InfoCard
                label="상위 3개 업종 가입자 비중"
                value={`${top3IndustryWorkerShare.toFixed(1)}%`}
                subText="산업 집중도"
              />
              <InfoCard
                label="상위 3개 법정동 가입자 비중"
                value={`${top3LegalDongWorkerShare.toFixed(1)}%`}
                subText="동 단위 집중도"
              />
              <InfoCard
                label="분석 활용 방향"
                value={isSigunguScope ? "동별 거점 파악" : "지역별 집중도 비교"}
                subText={isSigunguScope ? "법정동 단위" : "시군구 단위"}
              />
            </section>
          )}

          <section style={grid2}>
            <div style={cardStyle}>
              <div style={labelStyle}>해석 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.65 }}>
                시군구는 큰 고용권역을, 법정동은 실제 고용 클러스터를, 업종은
                산업구조를, 대표 기업은 고용을 만드는 핵심 사업장을 보여줍니다.
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.65 }}>
                법정동 단위 분석은 문현동, 우동, 장안읍처럼 실제 정책 현장과
                가까운 산업·고용 거점을 찾는 데 활용할 수 있습니다.
              </div>
            </div>
          </section>
          {isLegalDongScope && (
            <section style={grid1}>
              <div style={cardStyle}>
                <div style={labelStyle}>법정동 단위 해석</div>
                <div style={{ color: "#334155", lineHeight: 1.7 }}>
                  <strong>{currentScopeLabel}</strong>은 단일 법정동 기준으로
                  조회된 결과입니다. 따라서 법정동 간 순위보다는 해당 동 내부의
                  <strong>
                    {" "}
                    업종 구조, 대표 기업, 고용 규모, 추정 평균연소득
                  </strong>
                  을 중심으로 해석하는 것이 적절합니다.
                </div>
              </div>
            </section>
          )}

          {!isSigunguScope && (
            <>
              <section style={grid2}>
                <RegionBarChart
                  title={`${
                    currentScopeLabel || data.sido_name
                  } 시군구별 가입자 수`}
                  data={workerChartData}
                  dataKey="workerCount"
                  barColor="#2563eb"
                />
                <RegionBarChart
                  title={`${
                    currentScopeLabel || data.sido_name
                  } 시군구별 사업장 수`}
                  data={businessChartData}
                  dataKey="businessCount"
                  barColor="#0f766e"
                />
              </section>

              <section style={grid1}>
                <RegionBarChart
                  title={`${
                    currentScopeLabel || data.sido_name
                  } 시군구별 추정 평균연소득(만원)`}
                  data={incomeChartData}
                  dataKey="income"
                  barColor="#7c3aed"
                />
              </section>
            </>
          )}

          {!isLegalDongScope && (
            <section style={grid2}>
              <RegionBarChart
                title={`${
                  currentScopeLabel || data.sido_name
                } 법정동별 가입자 수 TOP10`}
                data={legalDongWorkerChartData}
                dataKey="workerCount"
                barColor="#2563eb"
              />
              <RegionBarChart
                title={`${
                  currentScopeLabel || data.sido_name
                } 법정동별 추정 평균연소득 TOP10(만원)`}
                data={legalDongIncomeChartData}
                dataKey="income"
                barColor="#7c3aed"
              />
            </section>
          )}

          <section style={grid2}>
            <RegionBarChart
              title={`${
                currentScopeLabel || data.sido_name
              } 업종별 가입자 수 TOP10`}
              data={industryWorkerChartData}
              dataKey="workerCount"
              barColor="#2563eb"
            />
            <RegionBarChart
              title={`${
                currentScopeLabel || data.sido_name
              } 업종별 추정 평균연소득 TOP10(만원)`}
              data={industryIncomeChartData}
              dataKey="income"
              barColor="#7c3aed"
            />
          </section>

          {!isLegalDongScope && (
            <section style={tableCard}>
              <h2 style={sectionTitle}>
                {currentScopeLabel || data.sido_name} 법정동 TOP10
              </h2>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>순위</th>
                    <th style={thStyle}>법정동</th>
                    <th style={thStyle}>전체 지역명</th>
                    <th style={thStyleRight}>사업장 수</th>
                    <th style={thStyleRight}>총 가입자 수</th>
                    <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                    <th style={thStyleRight}>추정 평균연소득</th>
                  </tr>
                </thead>
                <tbody>
                  {data.legal_dong_top10?.map((item, index) => (
                    <tr key={item.legal_dong_code}>
                      <td style={tdStyle}>{index + 1}</td>

                      <td style={companyNameCell} title={item.legal_dong_name}>
                        {item.legal_dong_name}
                      </td>

                      <td style={mutedCell} title={item.legal_dong_full_name}>
                        {shortText(item.legal_dong_full_name, 34)}
                      </td>

                      <td style={strongNumberCell}>
                        {formatNumber(item.business_count)}
                      </td>

                      <td style={strongNumberCell}>
                        {formatNumber(item.total_workers)}
                      </td>

                      <td style={tdStyleRight}>
                        {formatNumber(item.avg_workers)}
                      </td>

                      <td style={strongNumberCell}>
                        {formatIncomeManwon(item.estimated_avg_annual_income)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section style={tableCard}>
            <h2 style={sectionTitle}>
              {currentScopeLabel || data.sido_name} 대표 기업 TOP20
            </h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>기업명</th>
                  <th style={thStyle}>업종</th>
                  <th style={thStyle}>주소</th>
                  <th style={thStyleRight}>가입자 수</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                </tr>
              </thead>
              <tbody>
                {data.company_top20?.map((item, index) => (
                  <tr
                    key={`${item.company_name}-${item.business_number}-${index}`}
                  >
                    <td style={tdStyle}>{index + 1}</td>

                    <td style={companyNameCell} title={item.company_name}>
                      {shortText(item.company_name, 26)}
                    </td>

                    <td style={mutedCell} title={item.industry_name}>
                      {shortText(item.industry_name, 24)}
                    </td>

                    <td style={mutedCell} title={item.full_address}>
                      {shortText(item.full_address, 36)}
                    </td>

                    <td style={strongNumberCell}>
                      {formatNumber(item.subscriber_count)}
                    </td>

                    <td style={strongNumberCell}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={tableCard}>
            <h2 style={sectionTitle}>
              {currentScopeLabel || data.sido_name} 업종 TOP10
            </h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>업종</th>
                  <th style={thStyleRight}>사업장 수</th>
                  <th style={thStyleRight}>총 가입자 수</th>
                  <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                </tr>
              </thead>

              <tbody>
                {data.industry_top10.map((item, index) => (
                  <tr key={`${item.industry_name}-${index}`}>
                    <td style={tdStyle}>{index + 1}</td>

                    <td style={companyNameCell} title={item.industry_name}>
                      {shortText(item.industry_name, 30)}
                    </td>

                    <td style={strongNumberCell}>
                      {formatNumber(item.business_count)}
                    </td>

                    <td style={strongNumberCell}>
                      {formatNumber(item.total_workers)}
                    </td>

                    <td style={tdStyleRight}>
                      {formatNumber(item.avg_workers)}
                    </td>

                    <td style={strongNumberCell}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {!isSigunguScope && (
            <section style={tableCard}>
              <h2 style={sectionTitle}>{data.sido_name} 시군구 상세 테이블</h2>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>순위</th>
                    <th style={thStyle}>지역</th>
                    <th style={thStyleRight}>사업장 수</th>
                    <th style={thStyleRight}>사업장 비중(%)</th>
                    <th style={thStyleRight}>총 가입자 수</th>
                    <th style={thStyleRight}>가입자 비중(%)</th>
                    <th style={thStyleRight}>고용-사업장 비중 차이</th>
                    <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                    <th style={thStyleRight}>추정 평균연소득</th>
                  </tr>
                </thead>
                <tbody>
                  {data.region_summary.map((item, index) => {
                    const businessShare =
                      totalBusinesses > 0
                        ? (item.business_count / totalBusinesses) * 100
                        : 0;

                    const workerShare =
                      totalWorkers > 0
                        ? (item.total_workers / totalWorkers) * 100
                        : 0;

                    const shareGap = workerShare - businessShare;

                    return (
                      <tr key={item.region_key}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>{item.full_region_name}</td>
                        <td style={tdStyleRight}>
                          {formatNumber(item.business_count)}
                        </td>
                        <td style={tdStyleRight}>
                          {businessShare.toFixed(1)}%
                        </td>
                        <td style={tdStyleRight}>
                          {formatNumber(item.total_workers)}
                        </td>
                        <td style={tdStyleRight}>{workerShare.toFixed(1)}%</td>
                        <td
                          style={{
                            ...tdStyleRight,
                            color: shareGap >= 0 ? "#2563eb" : "#dc2626",
                            fontWeight: 700,
                          }}
                        >
                          {shareGap >= 0 ? "+" : ""}
                          {shareGap.toFixed(1)}%p
                        </td>
                        <td style={tdStyleRight}>
                          {formatNumber(item.avg_workers)}
                        </td>
                        <td style={tdStyleRight}>
                          {formatIncomeManwon(item.estimated_avg_annual_income)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  subText,
}: {
  label: string;
  value: string | number;
  subText?: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyleSmall}>{value}</div>
      {subText && <div style={subTextStyle}>{subText}</div>}
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "8px",
};

const pageSubtitle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
};

const filterBox: React.CSSProperties = {
  marginBottom: "20px",
  padding: "18px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  display: "flex",
  gap: "14px",
  alignItems: "end",
  flexWrap: "wrap",
};

const filterGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  flex: 1,
  minWidth: "720px",
};

const emptyBox: React.CSSProperties = {
  padding: "28px",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  background: "#f8fafc",
  color: "#475569",
  textAlign: "center",
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  background: "#ffffff",
  color: "#0f172a",
  height: "42px",
};

const grid5: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const grid4: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
  marginBottom: "18px",
};

const grid1: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "18px",
  marginBottom: "18px",
};

const cardStyle: React.CSSProperties = {
  padding: "18px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  minHeight: "88px",
  boxSizing: "border-box",
};

const tableCard: React.CSSProperties = {
  ...cardStyle,
  overflowX: "auto",
  marginBottom: "22px",
  padding: "22px 24px",
  maxWidth: "100%",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "18px",
  fontSize: "20px",
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.03em",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "8px",
  fontWeight: 800,
  letterSpacing: "-0.01em",
};

const valueStyleSmall: React.CSSProperties = {
  fontSize: "21px",
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.35,
  letterSpacing: "-0.03em",
  wordBreak: "keep-all",
};

const subTextStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 10px",
  borderBottom: "1px solid #cbd5e1",
  whiteSpace: "nowrap",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 800,
  background: "#f8fafc",
};

const thStyleRight: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eef2f7",
  whiteSpace: "nowrap",
  color: "#0f172a",
  fontSize: "14px",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const emptyTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: "8px",
};

const emptyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#475569",
  lineHeight: 1.6,
};

const emptyHint: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "13px",
  color: "#64748b",
};

const resultSummaryBox: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px 20px",
  borderRadius: "16px",
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  marginBottom: "16px",
};

const resultSummaryLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: "4px",
};

const resultSummaryTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.03em",
};

const resultSummaryMeta: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 700,
};

const companyNameCell: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
  color: "#0f172a",
  minWidth: "180px",
};

const mutedCell: React.CSSProperties = {
  ...tdStyle,
  color: "#475569",
};

const strongNumberCell: React.CSSProperties = {
  ...tdStyleRight,
  fontWeight: 800,
  color: "#0f172a",
};
