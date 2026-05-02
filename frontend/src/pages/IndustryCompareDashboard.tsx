import { useMemo, useState } from "react";
import { fetchIndustryCompareReal } from "../api/workers";
import { REGION_OPTIONS } from "../constants/regions";
import { formatNumber } from "../utils/format";
import type { IndustryCompareApiResponse } from "../types/employment";

function formatGap(value: number) {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function shortenIndustryName(name: string, maxLength = 18) {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}

export default function IndustryCompareDashboard() {
  const [leftDraftCode, setLeftDraftCode] = useState("11");
  const [rightDraftCode, setRightDraftCode] = useState("26");
  const [data, setData] = useState<IndustryCompareApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSameSelection = leftDraftCode === rightDraftCode;

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      const result = await fetchIndustryCompareReal(
        leftDraftCode,
        rightDraftCode
      );
      setData(result);
    } catch (error) {
      console.error(error);
      setErrorMessage("업종 비교 API 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    setLeftDraftCode(rightDraftCode);
    setRightDraftCode(leftDraftCode);
  }

  const leftRegionName = data?.left_region.sido_name ?? "왼쪽 지역";
  const rightRegionName = data?.right_region.sido_name ?? "오른쪽 지역";

  const commonStrongIndustries = useMemo(() => {
    if (!data) return [];

    return data.industry_compare
      .filter(
        (item) => item.left_total_workers > 0 && item.right_total_workers > 0
      )
      .slice(0, 10);
  }, [data]);

  const leftStrongIndustries = useMemo(() => {
    if (!data) return [];

    return [...data.industry_compare]
      .filter((item) => item.total_workers_gap > 0)
      .sort((a, b) => b.total_workers_gap - a.total_workers_gap)
      .slice(0, 10);
  }, [data]);

  const rightStrongIndustries = useMemo(() => {
    if (!data) return [];

    return [...data.industry_compare]
      .filter((item) => item.total_workers_gap < 0)
      .sort((a, b) => a.total_workers_gap - b.total_workers_gap)
      .slice(0, 10);
  }, [data]);

  const topGapIndustry = data?.industry_compare[0];

  const selectedLeftName =
    REGION_OPTIONS.find((region) => region.code === leftDraftCode)?.name ??
    "왼쪽 지역";

  const selectedRightName =
    REGION_OPTIONS.find((region) => region.code === rightDraftCode)?.name ??
    "오른쪽 지역";

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px 24px 32px",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <header style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "8px",
          }}
        >
          업종 비교 대시보드
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            marginBottom: "20px",
          }}
        >
          두 지역의 업종별 가입자 수와 사업장 수를 비교해 산업 구조 차이를
          분석합니다.
        </p>
      </header>

      <section
        style={{
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
        }}
      >
        <div>
          <label htmlFor="left-industry-sido-select" style={labelStyle}>
            왼쪽 지역 선택
          </label>
          <select
            id="left-industry-sido-select"
            value={leftDraftCode}
            onChange={(e) => setLeftDraftCode(e.target.value)}
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
          <label htmlFor="right-industry-sido-select" style={labelStyle}>
            오른쪽 지역 선택
          </label>
          <select
            id="right-industry-sido-select"
            value={rightDraftCode}
            onChange={(e) => setRightDraftCode(e.target.value)}
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
          disabled={isSameSelection || loading}
          style={{
            padding: "10px 16px",
            borderRadius: "14px",
            border: "1px solid #ea580c",
            background: isSameSelection || loading ? "#94a3b8" : "#ea580c",
            color: "#ffffff",
            cursor: isSameSelection || loading ? "not-allowed" : "pointer",
            fontWeight: 600,
            height: "42px",
          }}
        >
          {loading ? "조회 중..." : "업종 비교 조회"}
        </button>

        <button
          onClick={handleSwap}
          style={{
            padding: "10px 16px",
            borderRadius: "14px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#111827",
            cursor: "pointer",
            fontWeight: 600,
            height: "42px",
          }}
        >
          좌우 변경
        </button>

        {isSameSelection && (
          <div
            style={{
              width: "100%",
              color: "#dc2626",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            같은 지역끼리는 비교할 수 없습니다. 서로 다른 지역을 선택해주세요.
          </div>
        )}
      </section>

      {!data && !loading && !errorMessage && (
        <section
          style={{
            padding: "28px",
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            background: "#ffffff",
            color: "#475569",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          <strong>{selectedLeftName}</strong>과{" "}
          <strong>{selectedRightName}</strong>이 선택되어 있습니다.
          <br />
          업종 비교 조회 버튼을 누르면 두 지역의 산업 구조 차이가 표시됩니다.
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          업종 비교 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={cardStyle}>
              <div style={labelStyle}>왼쪽 지역</div>
              <div style={valueStyle}>{data.left_region.sido_name}</div>
              <div style={subTextStyle}>
                표본 수 {formatNumber(data.left_region.row_count)}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>오른쪽 지역</div>
              <div style={valueStyle}>{data.right_region.sido_name}</div>
              <div style={subTextStyle}>
                표본 수 {formatNumber(data.right_region.row_count)}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>가장 큰 업종 격차</div>
              <div style={valueStyleSmall}>
                {topGapIndustry
                  ? shortenIndustryName(topGapIndustry.industry_name, 20)
                  : "-"}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>가입자 수 격차</div>
              <div
                style={{
                  ...valueStyle,
                  color:
                    topGapIndustry && topGapIndustry.total_workers_gap >= 0
                      ? "#2563eb"
                      : "#dc2626",
                }}
              >
                {topGapIndustry
                  ? formatGap(topGapIndustry.total_workers_gap)
                  : "-"}
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div style={cardStyle}>
              <div style={labelStyle}>해석 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                업종별 가입자 수 격차는 두 지역의 산업 구조 차이를 보여주는 핵심
                지표입니다. 양수는 <strong>{leftRegionName}</strong> 우위,
                음수는 <strong>{rightRegionName}</strong> 우위를 의미합니다.
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                한 지역에 강하게 집중된 업종은 지역의 핵심 산업 또는 정책 타겟
                산업으로 볼 수 있으며, 공통으로 높은 업종은 양 지역 모두의 기반
                산업으로 해석할 수 있습니다.
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <IndustryListCard
              title={`${data.left_region.sido_name} 우위 업종 TOP 10`}
              list={leftStrongIndustries}
              side="left"
              emptyMessage={`${data.left_region.sido_name} 우위 업종이 없습니다.`}
            />

            <IndustryListCard
              title={`${data.right_region.sido_name} 우위 업종 TOP 10`}
              list={rightStrongIndustries}
              side="right"
              emptyMessage={`${data.right_region.sido_name} 우위 업종이 없습니다.`}
            />
          </section>

          <section
            style={{
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#ffffff",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
              공통 상위 업종
            </h2>
            <p style={{ marginTop: 0, color: "#64748b" }}>
              양쪽 지역에 모두 존재하며 가입자 수 격차가 큰 업종입니다.
            </p>

            <IndustryCompareTable
              list={commonStrongIndustries}
              leftRegionName={leftRegionName}
              rightRegionName={rightRegionName}
            />
          </section>

          <section
            style={{
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#ffffff",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
              전체 업종 비교 테이블
            </h2>

            <IndustryCompareTable
              list={data.industry_compare}
              leftRegionName={leftRegionName}
              rightRegionName={rightRegionName}
            />
          </section>
        </>
      )}
    </div>
  );
}

function IndustryListCard({
  title,
  list,
  side,
  emptyMessage,
}: {
  title: string;
  list: {
    industry_name: string;
    left_total_workers: number;
    right_total_workers: number;
    total_workers_gap: number;
  }[];
  side: "left" | "right";
  emptyMessage: string;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0, marginBottom: "16px" }}>{title}</h2>

      {list.length === 0 ? (
        <div
          style={{
            padding: "24px",
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            background: "#f8fafc",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {emptyMessage}
          <br />
          선택된 비교 기준에서 가입자 수 기준 우위 업종이 확인되지 않습니다.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>순위</th>
              <th style={thStyle}>업종</th>
              <th style={thStyleRight}>가입자 격차</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, index) => {
              const gap =
                side === "left"
                  ? item.total_workers_gap
                  : Math.abs(item.total_workers_gap);

              return (
                <tr key={`${title}-${item.industry_name}`}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>{item.industry_name}</td>
                  <td style={tdStyleRight}>{formatNumber(gap)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function IndustryCompareTable({
  list,
  leftRegionName,
  rightRegionName,
}: {
  list: {
    industry_name: string;
    left_business_count: number;
    right_business_count: number;
    business_count_gap: number;
    left_total_workers: number;
    right_total_workers: number;
    total_workers_gap: number;
    left_avg_workers: number;
    right_avg_workers: number;
  }[];
  leftRegionName: string;
  rightRegionName: string;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={thStyle}>순위</th>
          <th style={thStyle}>업종</th>
          <th style={thStyleRight}>{leftRegionName} 가입자</th>
          <th style={thStyleRight}>{rightRegionName} 가입자</th>
          <th style={thStyleRight}>가입자 격차</th>
          <th style={thStyleRight}>{leftRegionName} 사업장</th>
          <th style={thStyleRight}>{rightRegionName} 사업장</th>
          <th style={thStyleRight}>사업장 격차</th>
        </tr>
      </thead>
      <tbody>
        {list.map((item, index) => (
          <tr key={`${item.industry_name}-${index}`}>
            <td style={tdStyle}>{index + 1}</td>
            <td style={tdStyle}>{item.industry_name}</td>
            <td style={tdStyleRight}>
              {formatNumber(item.left_total_workers)}
            </td>
            <td style={tdStyleRight}>
              {formatNumber(item.right_total_workers)}
            </td>
            <td
              style={{
                ...tdStyleRight,
                color: item.total_workers_gap >= 0 ? "#2563eb" : "#dc2626",
                fontWeight: 600,
              }}
            >
              {formatGap(item.total_workers_gap)}
            </td>
            <td style={tdStyleRight}>
              {formatNumber(item.left_business_count)}
            </td>
            <td style={tdStyleRight}>
              {formatNumber(item.right_business_count)}
            </td>
            <td
              style={{
                ...tdStyleRight,
                color: item.business_count_gap >= 0 ? "#2563eb" : "#dc2626",
                fontWeight: 600,
              }}
            >
              {formatGap(item.business_count_gap)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  minWidth: "240px",
  fontSize: "15px",
  background: "#ffffff",
};

const cardStyle: React.CSSProperties = {
  padding: "20px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
};

const valueStyleSmall: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
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
};

const thStyleRight: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  borderBottom: "1px solid #f1f5f9",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
