import { useMemo, useState } from "react";
import { fetchNationwideSummaryReal } from "../api/workers";
import { formatNumber } from "../utils/format";
import RegionBarChart from "../components/charts/RegionBarChart";
import NationwideEmploymentMap from "../components/maps/NationwideEmploymentMap";

type SidoSummaryItem = {
  sido_code: string;
  sido_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  applied_pension_rate: number;
  lat?: number;
  lng?: number;
};

type NationwideSummaryResponse = {
  message: string;
  encoding: string;
  row_count: number;
  nationwide_summary: SidoSummaryItem[];
};

function formatIncomeManwon(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

type NationwideDashboardProps = {
  onSelectSido: (sidoCode: string) => void;
};

export default function NationwideDashboard({
  onSelectSido,
}: NationwideDashboardProps) {
  const [data, setData] = useState<NationwideSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      const result = await fetchNationwideSummaryReal();
      setData(result);
    } catch (error) {
      console.error(error);
      setErrorMessage("전국 시도 요약 API 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.nationwide_summary ?? [];

  const totalBusinesses = useMemo(() => {
    return summary.reduce((sum, item) => sum + item.business_count, 0);
  }, [summary]);

  const totalWorkers = useMemo(() => {
    return summary.reduce((sum, item) => sum + item.total_workers, 0);
  }, [summary]);

  const weightedAvgIncome = useMemo(() => {
    if (totalWorkers <= 0) return 0;

    const totalIncome = summary.reduce(
      (sum, item) =>
        sum + item.estimated_avg_annual_income * item.total_workers,
      0
    );

    return Math.round(totalIncome / totalWorkers);
  }, [summary, totalWorkers]);

  const topWorkerSido = useMemo(() => {
    return [...summary].sort((a, b) => b.total_workers - a.total_workers)[0];
  }, [summary]);

  const topIncomeSido = useMemo(() => {
    return [...summary]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )[0];
  }, [summary]);

  const topBusinessSido = useMemo(() => {
    return [...summary].sort((a, b) => b.business_count - a.business_count)[0];
  }, [summary]);

  const topAvgWorkersSido = useMemo(() => {
    return [...summary].sort((a, b) => b.avg_workers - a.avg_workers)[0];
  }, [summary]);

  const top3WorkerShare = useMemo(() => {
    if (totalWorkers <= 0) return 0;

    const top3Workers = [...summary]
      .sort((a, b) => b.total_workers - a.total_workers)
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3Workers / totalWorkers) * 100;
  }, [summary, totalWorkers]);

  const workerChartData = useMemo(() => {
    return [...summary]
      .sort((a, b) => b.total_workers - a.total_workers)
      .map((item) => ({
        district: item.sido_name,
        workerCount: item.total_workers,
      }));
  }, [summary]);

  const businessChartData = useMemo(() => {
    return [...summary]
      .sort((a, b) => b.business_count - a.business_count)
      .map((item) => ({
        district: item.sido_name,
        businessCount: item.business_count,
      }));
  }, [summary]);

  const incomeChartData = useMemo(() => {
    return [...summary]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )
      .map((item) => ({
        district: item.sido_name,
        income: Math.round(item.estimated_avg_annual_income / 10000),
      }));
  }, [summary]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 style={pageTitle}>전체 개요</h1>
        <p style={pageSubtitle}>
          전국 17개 시도의 고용 규모, 사업장 분포, 추정 평균연소득을 한눈에
          비교합니다.
        </p>
      </header>

      <section style={filterBox}>
        <div>
          <div style={labelStyle}>전국 시도 데이터 조회</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>
            버튼을 누르면 전국 17개 시도 요약 데이터를 집계합니다.
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #7c3aed",
            background: loading ? "#94a3b8" : "#7c3aed",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {loading ? "조회 중..." : "전국 분석 조회"}
        </button>
      </section>

      {!hasSearched && !loading && (
        <section style={emptyBox}>
          <strong>전국 17개 시도 비교 분석</strong>
          <br />
          조회 버튼을 누르면 전국 시도별 사업장 수, 가입자 수, 추정 평균연소득
          데이터가 표시됩니다.
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          전국 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          <section style={grid4}>
            <InfoCard
              label="전국 사업장 수"
              value={formatNumber(totalBusinesses)}
            />

            <InfoCard
              label="전국 가입자 수"
              value={formatNumber(totalWorkers)}
            />

            <InfoCard
              label="추정 평균연소득"
              value={formatIncomeManwon(weightedAvgIncome)}
            />

            <InfoCard
              label="상위 3개 시도 집중도"
              value={`${top3WorkerShare.toFixed(1)}%`}
              subText="전국 가입자 기준"
            />
          </section>

          <section style={grid4}>
            <InfoCard
              label="가입자 수 1위"
              value={topWorkerSido?.sido_name ?? "-"}
              subText={
                topWorkerSido
                  ? `${formatNumber(topWorkerSido.total_workers)}명`
                  : "-"
              }
            />

            <InfoCard
              label="평균연봉 1위"
              value={topIncomeSido?.sido_name ?? "-"}
              subText={
                topIncomeSido
                  ? formatIncomeManwon(
                      topIncomeSido.estimated_avg_annual_income
                    )
                  : "-"
              }
            />

            <InfoCard
              label="사업장 수 1위"
              value={topBusinessSido?.sido_name ?? "-"}
              subText={
                topBusinessSido
                  ? `${formatNumber(topBusinessSido.business_count)}개`
                  : "-"
              }
            />

            <InfoCard
              label="평균 사업장 규모 1위"
              value={topAvgWorkersSido?.sido_name ?? "-"}
              subText={
                topAvgWorkersSido
                  ? `${formatNumber(topAvgWorkersSido.avg_workers)}명 / 사업장`
                  : "-"
              }
            />
          </section>

          <section style={mapCardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 8px", fontSize: "22px" }}>
                  전국 고용 지도
                </h2>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
                  원의 크기는 가입자 수, 색상은 추정 평균연소득 수준을
                  의미합니다.
                </p>
              </div>

              <div style={mapMiniInfo}>
                원 크기: 가입자 수
                <br />
                색상: 추정 평균연소득
              </div>
            </div>

            <NationwideEmploymentMap
              data={summary}
              onSelectSido={onSelectSido}
            />
          </section>

          <section style={grid2}>
            <div style={cardStyle}>
              <div style={labelStyle}>핵심 해석</div>
              <p style={paragraphStyle}>
                가입자 수는 고용 규모를, 사업장 수는 기업 활동 밀집도를, 추정
                평균연소득은 지역 고용의 질적 수준을 비교하는 참고 지표입니다.
              </p>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <p style={paragraphStyle}>
                고용 규모가 큰 지역은 정책 전달 거점으로, 추정 평균연소득이 높은
                지역은 고부가가치 산업이 집중된 지역으로 해석할 수 있습니다.
              </p>
            </div>
          </section>

          <section style={grid2}>
            <RegionBarChart
              title="시도별 가입자 수"
              data={workerChartData}
              dataKey="workerCount"
              barColor="#2563eb"
            />
            <RegionBarChart
              title="시도별 사업장 수"
              data={businessChartData}
              dataKey="businessCount"
              barColor="#0f766e"
            />
          </section>

          <section style={grid1}>
            <RegionBarChart
              title="시도별 추정 평균연소득(만원)"
              data={incomeChartData}
              dataKey="income"
              barColor="#7c3aed"
            />
          </section>

          <section style={tableCard}>
            <h2 style={sectionTitle}>전국 시도 요약 테이블</h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>지역</th>
                  <th style={thStyleRight}>사업장 수</th>
                  <th style={thStyleRight}>총 가입자 수</th>
                  <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                  <th style={thStyleRight}>가입자 비중</th>
                </tr>
              </thead>

              <tbody>
                {[...summary]
                  .sort((a, b) => b.total_workers - a.total_workers)
                  .map((item, index) => {
                    const workerShare =
                      totalWorkers > 0
                        ? (item.total_workers / totalWorkers) * 100
                        : 0;

                    const isTop3 = index < 3;

                    return (
                      <tr
                        key={item.sido_code}
                        style={{
                          background: isTop3 ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              background:
                                index === 0
                                  ? "#0f766e"
                                  : index === 1
                                  ? "#2563eb"
                                  : index === 2
                                  ? "#7c3aed"
                                  : "#e2e8f0",
                              color: isTop3 ? "#ffffff" : "#334155",
                              fontWeight: 900,
                              fontSize: "13px",
                            }}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: isTop3 ? 900 : 600,
                            color: isTop3 ? "#0f172a" : "#334155",
                          }}
                        >
                          {item.sido_name}
                        </td>

                        <td style={tdStyleRight}>
                          {formatNumber(item.business_count)}
                        </td>

                        <td
                          style={{
                            ...tdStyleRight,
                            fontWeight: isTop3 ? 900 : 500,
                            color: isTop3 ? "#0f766e" : "#0f172a",
                          }}
                        >
                          {formatNumber(item.total_workers)}
                        </td>

                        <td style={tdStyleRight}>
                          {formatNumber(item.avg_workers)}
                        </td>

                        <td
                          style={{
                            ...tdStyleRight,
                            fontWeight: 800,
                            color: "#7c3aed",
                          }}
                        >
                          {formatIncomeManwon(item.estimated_avg_annual_income)}
                        </td>

                        <td
                          style={{
                            ...tdStyleRight,
                            fontWeight: isTop3 ? 900 : 600,
                            color: isTop3 ? "#2563eb" : "#334155",
                          }}
                        >
                          {workerShare.toFixed(1)}%
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
      <div style={valueStyle}>{value}</div>
      {subText && <div style={subTextStyle}>{subText}</div>}
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontSize: "30px",
  fontWeight: 900,
  margin: "0 0 8px",
  letterSpacing: "-0.03em",
};

const pageSubtitle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
};

const filterBox: React.CSSProperties = {
  marginBottom: "20px",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
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

const mapMiniInfo: React.CSSProperties = {
  padding: "16px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#334155",
  minWidth: "220px",
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

const valueStyle: React.CSSProperties = {
  fontSize: "21px",
  fontWeight: 900,
  color: "#111827",
  lineHeight: 1.35,
};

const subTextStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#64748b",
  fontSize: "13px",
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  color: "#334155",
  lineHeight: 1.7,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 8px",
  borderBottom: "1px solid #cbd5e1",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 800,
};

const thStyleRight: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid #f1f5f9",
  whiteSpace: "nowrap",
  fontSize: "14px",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};

const mapCardStyle: React.CSSProperties = {
  ...cardStyle,
  position: "relative",
  zIndex: 1,
  overflow: "visible",
  marginBottom: "28px",
};
