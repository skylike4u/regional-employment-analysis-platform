import { useMemo, useState } from "react";
import { fetchNationwideSigunguRankingReal } from "../api/workers";
import { formatNumber } from "../utils/format";

type SigunguRankingItem = {
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

type SigunguRankingApiResponse = {
  message: string;
  encoding: string;
  row_count: number;
  income_top20: SigunguRankingItem[];
  worker_top20: SigunguRankingItem[];
  business_top20: SigunguRankingItem[];
  all_sigungu_ranking: SigunguRankingItem[];
};

function formatIncomeManwon(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

export default function NationwideSigunguRankingDashboard() {
  const [data, setData] = useState<SigunguRankingApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      const result = await fetchNationwideSigunguRankingReal();
      setData(result);
    } catch (error) {
      console.error(error);
      setErrorMessage("전국 시군구 랭킹 API 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const topIncomeRegion = data?.income_top20[0];
  const topWorkerRegion = data?.worker_top20[0];
  const topBusinessRegion = data?.business_top20[0];

  const weightedAvgIncome = useMemo(() => {
    if (!data) return 0;

    const totalWorkers = data.all_sigungu_ranking.reduce(
      (sum, item) => sum + item.total_workers,
      0
    );

    if (totalWorkers <= 0) return 0;

    const totalIncome = data.all_sigungu_ranking.reduce(
      (sum, item) =>
        sum + item.estimated_avg_annual_income * item.total_workers,
      0
    );

    return Math.round(totalIncome / totalWorkers);
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
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "8px",
          }}
        >
          전국 시군구 랭킹 대시보드
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: 0,
          }}
        >
          전국 시군구 단위로 추정 평균연소득, 가입자 수, 사업장 수 상위 지역을
          비교합니다.
        </p>
      </header>

      <section style={filterBox}>
        <div>
          <div style={labelStyle}>전국 시군구 랭킹 조회</div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            버튼을 누르면 전국 시군구 단위 랭킹 데이터를 집계합니다.
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #be123c",
            background: loading ? "#94a3b8" : "#be123c",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700,
            height: "42px",
          }}
        >
          {loading ? "조회 중..." : "랭킹 조회"}
        </button>
      </section>

      {!hasSearched && !loading && (
        <section style={emptyBox}>
          <strong>전국 시군구 랭킹 분석</strong>
          <br />
          랭킹 조회 버튼을 누르면 전국 시군구별 추정 평균연소득, 가입자 수,
          사업장 수 순위가 표시됩니다.
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          전국 시군구 랭킹 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          <section style={grid4}>
            <div style={cardStyle}>
              <div style={labelStyle}>추정 평균연소득 1위</div>
              <div style={valueStyleSmall}>
                {topIncomeRegion?.full_region_name ?? "-"}
              </div>
              <div style={subTextStyle}>
                {topIncomeRegion
                  ? formatIncomeManwon(
                      topIncomeRegion.estimated_avg_annual_income
                    )
                  : "-"}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>가입자 수 1위</div>
              <div style={valueStyleSmall}>
                {topWorkerRegion?.full_region_name ?? "-"}
              </div>
              <div style={subTextStyle}>
                {topWorkerRegion
                  ? formatNumber(topWorkerRegion.total_workers)
                  : "-"}
                명
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>사업장 수 1위</div>
              <div style={valueStyleSmall}>
                {topBusinessRegion?.full_region_name ?? "-"}
              </div>
              <div style={subTextStyle}>
                {topBusinessRegion
                  ? formatNumber(topBusinessRegion.business_count)
                  : "-"}
                개
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>전국 추정 평균연소득</div>
              <div style={valueStyle}>
                {formatIncomeManwon(weightedAvgIncome)}
              </div>
            </div>
          </section>

          <section style={grid2}>
            <RankingCard
              title="추정 평균연소득 TOP 20"
              list={data.income_top20}
              valueKey="income"
            />

            <RankingCard
              title="가입자 수 TOP 20"
              list={data.worker_top20}
              valueKey="workers"
            />
          </section>

          <section style={grid2}>
            <RankingCard
              title="사업장 수 TOP 20"
              list={data.business_top20}
              valueKey="business"
            />

            <div style={cardStyle}>
              <div style={labelStyle}>해석 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.7 }}>
                추정 평균연소득 상위 지역은 고부가가치 산업, 대형 사업장,
                본사·연구개발·제조 핵심 거점이 집중된 지역일 가능성이 높습니다.
                가입자 수 상위 지역은 고용 규모의 중심지이며, 사업장 수 상위
                지역은 기업 활동 밀집 지역으로 볼 수 있습니다.
              </div>
            </div>
          </section>

          <section style={tableCard}>
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
              전국 시군구 전체 랭킹
            </h2>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>지역</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                  <th style={thStyleRight}>사업장 수</th>
                  <th style={thStyleRight}>가입자 수</th>
                  <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                </tr>
              </thead>

              <tbody>
                {data.all_sigungu_ranking.map((item, index) => (
                  <tr key={item.region_key}>
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>{item.full_region_name}</td>
                    <td style={tdStyleRight}>
                      {formatIncomeManwon(item.estimated_avg_annual_income)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.business_count)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.total_workers)}
                    </td>
                    <td style={tdStyleRight}>
                      {formatNumber(item.avg_workers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function RankingCard({
  title,
  list,
  valueKey,
}: {
  title: string;
  list: SigunguRankingItem[];
  valueKey: "income" | "workers" | "business";
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0, marginBottom: "16px" }}>{title}</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>순위</th>
            <th style={thStyle}>지역</th>
            <th style={thStyleRight}>값</th>
          </tr>
        </thead>

        <tbody>
          {list.map((item, index) => {
            let value = "";

            if (valueKey === "income") {
              value = formatIncomeManwon(item.estimated_avg_annual_income);
            }

            if (valueKey === "workers") {
              value = `${formatNumber(item.total_workers)}명`;
            }

            if (valueKey === "business") {
              value = `${formatNumber(item.business_count)}개`;
            }

            return (
              <tr key={`${title}-${item.region_key}`}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>{item.full_region_name}</td>
                <td style={tdStyleRight}>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "10px",
  fontWeight: 700,
};

const valueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const valueStyleSmall: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.4,
};

const subTextStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#64748b",
  fontSize: "14px",
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
