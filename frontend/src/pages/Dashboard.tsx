import { useState } from "react";
import { fetchCompareReal } from "../api/workers";
import { REGION_OPTIONS } from "../constants/regions";
import { formatNumber } from "../utils/format";
import type { CompareApiResponse } from "../types/employment";

function formatIncomeManwon(value: number) {
  if (!value || value === 0) return "-";

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(Math.round(value / 10000))}만원`;
}

function formatIncomeManwonPlain(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

export default function Dashboard() {
  const [leftDraftCode, setLeftDraftCode] = useState("11");
  const [rightDraftCode, setRightDraftCode] = useState("26");

  const [data, setData] = useState<CompareApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      const result = await fetchCompareReal(leftDraftCode, rightDraftCode);
      setData(result);
    } catch (error) {
      console.error(error);
      setErrorMessage("비교 API 연결 실패");
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    setLeftDraftCode(rightDraftCode);
    setRightDraftCode(leftDraftCode);
  }

  const isSame = leftDraftCode === rightDraftCode;

  const workerRatio =
    data && data.right_region.total_workers > 0
      ? data.left_region.total_workers / data.right_region.total_workers
      : 0;

  const businessRatio =
    data && data.right_region.business_count > 0
      ? data.left_region.business_count / data.right_region.business_count
      : 0;

  const incomeGap = data
    ? data.left_region.estimated_avg_annual_income -
      data.right_region.estimated_avg_annual_income
    : 0;

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
          지역 비교 대시보드
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: 0,
          }}
        >
          두 지역을 선택한 뒤 비교 검색을 누르면 지역 간 사업장 수와 가입자 수를
          비교합니다.
        </p>
      </header>

      <section style={filterBox}>
        <select
          value={leftDraftCode}
          onChange={(e) => setLeftDraftCode(e.target.value)}
          style={select}
        >
          {REGION_OPTIONS.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>

        <select
          value={rightDraftCode}
          onChange={(e) => setRightDraftCode(e.target.value)}
          style={select}
        >
          {REGION_OPTIONS.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          disabled={isSame || loading}
          style={{
            ...btnPrimary,
            background: isSame || loading ? "#94a3b8" : "#2563eb",
            cursor: isSame || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "조회 중..." : "비교 검색"}
        </button>

        <button onClick={handleSwap} style={btnSecondary}>
          좌우 변경
        </button>
      </section>

      {isSame && (
        <div
          style={{
            color: "#dc2626",
            marginBottom: "16px",
            fontWeight: 600,
          }}
        >
          같은 지역끼리는 비교할 수 없습니다. 서로 다른 지역을 선택해주세요.
        </div>
      )}

      {!data && !loading && !errorMessage && (
        <section style={emptyBox}>
          비교할 두 지역을 선택한 뒤 <strong>비교 검색</strong> 버튼을
          눌러주세요.
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          비교 데이터를 불러오는 중입니다...
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          <section style={grid2}>
            <Card title={data.left_region.sido_name}>
              <p>사업장 수: {formatNumber(data.left_region.business_count)}</p>
              <p>가입자 수: {formatNumber(data.left_region.total_workers)}</p>
              <p>
                사업장당 평균 가입자 수:{" "}
                {formatNumber(data.left_region.avg_workers)}
              </p>
              <p>
                추정 평균연소득:{" "}
                <strong>
                  {formatIncomeManwonPlain(
                    data.left_region.estimated_avg_annual_income
                  )}
                </strong>
              </p>
            </Card>

            <Card title={data.right_region.sido_name}>
              <p>사업장 수: {formatNumber(data.right_region.business_count)}</p>
              <p>가입자 수: {formatNumber(data.right_region.total_workers)}</p>
              <p>
                사업장당 평균 가입자 수:{" "}
                {formatNumber(data.right_region.avg_workers)}
              </p>
              <p>
                추정 평균연소득:{" "}
                <strong>
                  {formatIncomeManwonPlain(
                    data.right_region.estimated_avg_annual_income
                  )}
                </strong>
              </p>
            </Card>
          </section>

          <Card title="비교 핵심">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <p>
                  사업장 수 차이:{" "}
                  {formatNumber(data.comparison.business_count_gap)}
                </p>
                <p>
                  가입자 수 차이:{" "}
                  {formatNumber(data.comparison.total_workers_gap)}
                </p>
                <p>
                  사업장당 평균 가입자 수 차이:{" "}
                  {formatNumber(data.comparison.avg_workers_gap)}
                </p>
                <p>
                  추정 평균연소득 차이:{" "}
                  <strong
                    style={{
                      color: incomeGap >= 0 ? "#2563eb" : "#dc2626",
                    }}
                  >
                    {formatIncomeManwon(incomeGap)}
                  </strong>
                </p>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={miniLabelStyle}>상대 비교</div>
                <p>
                  가입자 수 기준: <strong>{workerRatio.toFixed(2)}배</strong>
                </p>
                <p>
                  사업장 수 기준: <strong>{businessRatio.toFixed(2)}배</strong>
                </p>
                <p>
                  연소득 격차 기준:{" "}
                  <strong
                    style={{
                      color: incomeGap >= 0 ? "#2563eb" : "#dc2626",
                    }}
                  >
                    {incomeGap >= 0
                      ? `${data.left_region.sido_name} 우위`
                      : `${data.right_region.sido_name} 우위`}
                  </strong>
                </p>
              </div>
            </div>
          </Card>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "20px",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={card}>
              <div style={miniLabelStyle}>해석 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                사업장 수와 가입자 수 차이는 지역 간 고용 규모의 차이를
                보여주며, 추정 평균연소득은 국민연금 고지액을 기반으로 한 참고
                지표입니다.
              </div>
            </div>

            <div style={card}>
              <div style={miniLabelStyle}>유의사항</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                추정 평균연소득은 실제 임금이 아니라 국민연금 당월고지금액과 총
                보험료율을 역산한 값이므로 상한액 적용, 신고시차 등에 따라 실제
                급여 수준과 차이가 있을 수 있습니다.
              </div>
            </div>
          </section>

          <section style={grid2}>
            <RegionTable
              title={`${data.left_region.sido_name} 상위 지역`}
              list={data.left_region_summary}
            />

            <RegionTable
              title={`${data.right_region.sido_name} 상위 지역`}
              list={data.right_region_summary}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={card}>
      <h3
        style={{
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "20px",
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function RegionTable({
  title,
  list,
}: {
  title: string;
  list: {
    full_region_name: string;
    business_count: number;
    total_workers: number;
  }[];
}) {
  const totalWorkers = list.reduce((sum, item) => sum + item.total_workers, 0);
  const totalBusiness = list.reduce(
    (sum, item) => sum + item.business_count,
    0
  );

  return (
    <div style={card}>
      <h3
        style={{
          marginTop: 0,
          marginBottom: "16px",
          fontSize: "20px",
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        {title}
      </h3>

      <table style={table}>
        <thead>
          <tr>
            <th style={thStyle}>순위</th>
            <th style={thStyle}>지역</th>
            <th style={thRight}>사업장</th>
            <th style={thRight}>비중</th>
            <th style={thRight}>가입자</th>
            <th style={thRight}>비중</th>
          </tr>
        </thead>

        <tbody>
          {list.map((item, index) => {
            const businessShare =
              totalBusiness > 0
                ? (item.business_count / totalBusiness) * 100
                : 0;

            const workerShare =
              totalWorkers > 0 ? (item.total_workers / totalWorkers) * 100 : 0;

            return (
              <tr key={item.full_region_name}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>{item.full_region_name}</td>
                <td style={tdRight}>{formatNumber(item.business_count)}</td>
                <td style={tdRight}>{businessShare.toFixed(1)}%</td>
                <td style={tdRight}>{formatNumber(item.total_workers)}</td>
                <td style={tdRight}>{workerShare.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const filterBox: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
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
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "220px",
  fontSize: "15px",
  background: "#ffffff",
};

const btnPrimary: React.CSSProperties = {
  color: "white",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  background: "#ffffff",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  cursor: "pointer",
  fontWeight: 600,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginTop: "20px",
};

const card: React.CSSProperties = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
};

const miniLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: 700,
  marginBottom: "10px",
};

const table: React.CSSProperties = {
  width: "100%",
  marginTop: "10px",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 8px",
  borderBottom: "1px solid #e5e7eb",
};

const thRight: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid #f1f5f9",
};

const tdRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
