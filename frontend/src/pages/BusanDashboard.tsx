import { useMemo, useState } from "react";
import { fetchRegionSummaryReal } from "../api/workers";
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

export default function BusanDashboard() {
  const [draftSidoCode, setDraftSidoCode] = useState("26");
  const [data, setData] = useState<RegionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      const result = await fetchRegionSummaryReal(draftSidoCode);
      setData(result as RegionSummaryResponse);
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

  const totalBusinesses = useMemo(() => {
    return (
      data?.region_summary.reduce(
        (sum, item) => sum + item.business_count,
        0
      ) ?? 0
    );
  }, [data]);

  const totalWorkers = useMemo(() => {
    return (
      data?.region_summary.reduce((sum, item) => sum + item.total_workers, 0) ??
      0
    );
  }, [data]);

  const weightedAvgIncome = useMemo(() => {
    if (!data || totalWorkers <= 0) return 0;

    const totalEstimatedIncome = data.region_summary.reduce(
      (sum, item) =>
        sum + item.estimated_avg_annual_income * item.total_workers,
      0
    );

    return Math.round(totalEstimatedIncome / totalWorkers);
  }, [data, totalWorkers]);

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

  const top3WorkerShare = useMemo(() => {
    if (!data || totalWorkers <= 0) return 0;

    const top3Workers = data.region_summary
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3Workers / totalWorkers) * 100;
  }, [data, totalWorkers]);

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
        <div>
          <label style={labelStyle}>분석 지역 선택</label>
          <select
            value={draftSidoCode}
            onChange={(e) => setDraftSidoCode(e.target.value)}
            style={selectStyle}
          >
            {REGION_OPTIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #0f766e",
            background: loading ? "#94a3b8" : "#0f766e",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700,
            height: "42px",
          }}
        >
          {loading ? "조회 중..." : "분석 조회"}
        </button>
      </section>

      {!hasSearched && !loading && (
        <section style={emptyBox}>
          <strong>{selectedRegionName}</strong>이 선택되어 있습니다.
          <br />
          분석 조회 버튼을 누르면 시군구·법정동·업종·대표 기업 분석이
          표시됩니다.
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
          <section style={grid5}>
            <InfoCard label="분석 지역" value={data.sido_name} />
            <InfoCard label="시군구 수" value={data.region_summary.length} />
            <InfoCard
              label="총 사업장 수"
              value={formatNumber(totalBusinesses)}
            />
            <InfoCard label="총 가입자 수" value={formatNumber(totalWorkers)} />
            <InfoCard
              label="추정 평균연소득"
              value={formatIncomeManwon(weightedAvgIncome)}
            />
          </section>

          <section style={grid4}>
            <InfoCard
              label="가입자 수 1위 지역"
              value={topWorkerRegion?.sigungu_name ?? "-"}
              subText={
                topWorkerRegion
                  ? `${formatNumber(topWorkerRegion.total_workers)}명`
                  : "-"
              }
            />
            <InfoCard
              label="가입자 수 1위 법정동"
              value={topLegalDongByWorkers?.legal_dong_name ?? "-"}
              subText={
                topLegalDongByWorkers
                  ? `${formatNumber(topLegalDongByWorkers.total_workers)}명`
                  : "-"
              }
            />
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
          </section>

          <section style={grid4}>
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

          <section style={grid4}>
            <InfoCard
              label="상위 3개 지역 가입자 비중"
              value={`${top3WorkerShare.toFixed(1)}%`}
              subText="공간 집중도"
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
            <InfoCard label="정책 해석 축" value="지역 × 동 × 업종 × 기업" />
          </section>

          <section style={grid2}>
            <div style={cardStyle}>
              <div style={labelStyle}>해석 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                시군구는 큰 고용권역을, 법정동은 실제 고용 클러스터를, 업종은
                산업구조를, 대표 기업은 고용을 만드는 핵심 사업장을 보여줍니다.
              </div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                법정동 단위 분석은 문현동, 우동, 장안읍처럼 실제 정책 현장과
                가까운 산업·고용 거점을 찾는 데 활용할 수 있습니다.
              </div>
            </div>
          </section>

          <section style={grid2}>
            <RegionBarChart
              title={`${data.sido_name} 시군구별 가입자 수`}
              data={workerChartData}
              dataKey="workerCount"
              barColor="#2563eb"
            />
            <RegionBarChart
              title={`${data.sido_name} 시군구별 사업장 수`}
              data={businessChartData}
              dataKey="businessCount"
              barColor="#0f766e"
            />
          </section>

          <section style={grid1}>
            <RegionBarChart
              title={`${data.sido_name} 시군구별 추정 평균연소득(만원)`}
              data={incomeChartData}
              dataKey="income"
              barColor="#7c3aed"
            />
          </section>

          <section style={grid2}>
            <RegionBarChart
              title={`${data.sido_name} 법정동별 가입자 수 TOP10`}
              data={legalDongWorkerChartData}
              dataKey="workerCount"
              barColor="#2563eb"
            />
            <RegionBarChart
              title={`${data.sido_name} 법정동별 추정 평균연소득 TOP10(만원)`}
              data={legalDongIncomeChartData}
              dataKey="income"
              barColor="#7c3aed"
            />
          </section>

          <section style={grid2}>
            <RegionBarChart
              title={`${data.sido_name} 업종별 가입자 수 TOP10`}
              data={industryWorkerChartData}
              dataKey="workerCount"
              barColor="#2563eb"
            />
            <RegionBarChart
              title={`${data.sido_name} 업종별 추정 평균연소득 TOP10(만원)`}
              data={industryIncomeChartData}
              dataKey="income"
              barColor="#7c3aed"
            />
          </section>

          <section style={tableCard}>
            <h2 style={sectionTitle}>{data.sido_name} 법정동 TOP10</h2>
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
                    <td style={tdStyle}>{item.legal_dong_name}</td>
                    <td style={tdStyle}>{item.legal_dong_full_name}</td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.business_count)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.total_workers)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.avg_workers)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={tableCard}>
            <h2 style={sectionTitle}>{data.sido_name} 대표 기업 TOP20</h2>
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
                    <td style={tdStyle}>{item.company_name}</td>
                    <td style={tdStyle} title={item.industry_name}>
                      {shortText(item.industry_name, 22)}
                    </td>
                    <td style={tdStyle} title={item.full_address}>
                      {shortText(item.full_address, 28)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.subscriber_count)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={tableCard}>
            <h2 style={sectionTitle}>{data.sido_name} 업종 TOP10</h2>
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
                    <td style={tdStyle}>{item.industry_name}</td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.business_count)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.total_workers)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.avg_workers)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

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
                      <td style={tdStyleRight}>{businessShare.toFixed(1)}%</td>
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
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  display: "flex",
  gap: "12px",
  alignItems: "end",
  flexWrap: "wrap",
};

const emptyBox: React.CSSProperties = {
  padding: "28px",
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  background: "#ffffff",
  color: "#475569",
  textAlign: "center",
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "240px",
  fontSize: "15px",
  background: "#ffffff",
};

const grid5: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const grid4: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const grid1: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "20px",
  marginBottom: "20px",
};

const cardStyle: React.CSSProperties = {
  padding: "20px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
};

const tableCard: React.CSSProperties = {
  ...cardStyle,
  overflowX: "auto",
  marginBottom: "20px",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "10px",
  fontWeight: 700,
};

const valueStyleSmall: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.4,
};

const subTextStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#64748b",
  fontSize: "14px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 8px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const thStyleRight: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
