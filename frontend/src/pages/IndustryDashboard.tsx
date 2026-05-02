import { useMemo, useState } from "react";
import { fetchIndustrySummaryReal } from "../api/workers";
import RegionBarChart from "../components/charts/RegionBarChart";
import { REGION_OPTIONS } from "../constants/regions";
import type { IndustrySummaryApiResponse } from "../types/employment";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function shortenIndustryName(name: string, maxLength = 10) {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}

function getConcentrationLevel(top3Share: number) {
  if (top3Share >= 60) return "높음";
  if (top3Share >= 40) return "중간";
  return "낮음";
}

function getConcentrationMessage(top3Share: number) {
  if (top3Share >= 60) {
    return "상위 3개 업종에 고용이 강하게 집중된 산업 구조입니다.";
  }

  if (top3Share >= 40) {
    return "상위 3개 업종 중심의 중간 수준 산업 집중 구조입니다.";
  }

  return "고용이 여러 업종에 비교적 분산된 산업 구조입니다.";
}

function getDensityLabel(avgWorkers: number) {
  if (avgWorkers >= 100) return "대규모 고용 업종";
  if (avgWorkers >= 50) return "중규모 고용 업종";
  return "분산형 업종";
}

export default function IndustryDashboard() {
  const [draftSidoCode, setDraftSidoCode] = useState("26");
  const [selectedSidoCode, setSelectedSidoCode] = useState("");
  const [data, setData] = useState<IndustrySummaryApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData(sidoCode: string) {
    try {
      setLoading(true);
      setErrorMessage("");
      const result = await fetchIndustrySummaryReal(sidoCode);
      setData(result);
    } catch (error) {
      console.error(error);
      setErrorMessage("업종 구조 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setSelectedSidoCode(draftSidoCode);
    loadData(draftSidoCode);
  }

  const selectedRegionName =
    REGION_OPTIONS.find((region) => region.code === draftSidoCode)?.name ??
    "선택 지역";

  const totalWorkersAll = useMemo(() => {
    if (!data) return 0;
    return data.industry_summary.reduce(
      (sum, item) => sum + item.total_workers,
      0
    );
  }, [data]);

  const totalBusinessesAll = useMemo(() => {
    if (!data) return 0;
    return data.industry_summary.reduce(
      (sum, item) => sum + item.business_count,
      0
    );
  }, [data]);

  const topIndustryName = data?.industry_summary[0]?.industry_name ?? "-";
  const topIndustryWorkers = data?.industry_summary[0]?.total_workers ?? 0;

  const top1IndustryShare = useMemo(() => {
    if (!data || totalWorkersAll === 0) return 0;
    return (
      ((data.industry_summary[0]?.total_workers ?? 0) / totalWorkersAll) * 100
    );
  }, [data, totalWorkersAll]);

  const top3IndustryShare = useMemo(() => {
    if (!data || totalWorkersAll === 0) return 0;

    const top3Workers = data.industry_summary
      .slice(0, 3)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top3Workers / totalWorkersAll) * 100;
  }, [data, totalWorkersAll]);

  const top5IndustryShare = useMemo(() => {
    if (!data || totalWorkersAll === 0) return 0;

    const top5Workers = data.industry_summary
      .slice(0, 5)
      .reduce((sum, item) => sum + item.total_workers, 0);

    return (top5Workers / totalWorkersAll) * 100;
  }, [data, totalWorkersAll]);

  const concentrationLevel = getConcentrationLevel(top3IndustryShare);
  const concentrationMessage = getConcentrationMessage(top3IndustryShare);

  const highestDensityIndustry = useMemo(() => {
    if (!data || data.industry_summary.length === 0) return null;

    return [...data.industry_summary].sort(
      (a, b) => b.avg_workers - a.avg_workers
    )[0];
  }, [data]);

  const workerChartData = useMemo(() => {
    if (!data) return [];

    return [...data.industry_summary]
      .sort((a, b) => b.total_workers - a.total_workers)
      .slice(0, 10)
      .map((item) => ({
        district: shortenIndustryName(item.industry_name),
        workerCount: item.total_workers,
      }));
  }, [data]);

  const businessChartData = useMemo(() => {
    if (!data) return [];

    return [...data.industry_summary]
      .sort((a, b) => b.business_count - a.business_count)
      .slice(0, 10)
      .map((item) => ({
        district: shortenIndustryName(item.industry_name),
        businessCount: item.business_count,
      }));
  }, [data]);

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px 24px 32px",
        background: "#f8fafc",
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
          업종 구조 대시보드
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            marginBottom: "20px",
          }}
        >
          업종별 총 가입자 수와 사업장 수를 기준으로 지역 산업 구조를
          분석합니다.
        </p>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
          차트 라벨은 축약 표기이며, 표에서는 전체 업종명을 확인할 수 있습니다.
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
          <label
            htmlFor="industry-sido-select"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#475569",
              fontWeight: 600,
            }}
          >
            분석 지역 선택
          </label>
          <select
            id="industry-sido-select"
            value={draftSidoCode}
            onChange={(e) => setDraftSidoCode(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "14px",
              border: "1px solid #cbd5e1",
              minWidth: "240px",
              fontSize: "15px",
              background: "#ffffff",
            }}
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
            borderRadius: "14px",
            border: "1px solid #ea580c",
            background: loading ? "#94a3b8" : "#ea580c",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
            height: "42px",
          }}
        >
          {loading ? "조회 중..." : "조회"}
        </button>
      </section>

      {!selectedSidoCode && !loading && (
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
          <strong>{selectedRegionName}</strong>이 선택되어 있습니다.
          <br />
          조회 버튼을 누르면 해당 지역의 업종 구조 데이터가 표시됩니다.
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          업종 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && (
        <>
          {data.is_low_sample && (
            <section
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "14px",
                border: "1px solid #f59e0b",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ⚠ {data.quality_message} (현재 표본 수:{" "}
              {formatNumber(data.row_count)})
            </section>
          )}

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={cardStyle}>
              <div style={labelStyle}>분석 지역</div>
              <div style={valueStyle}>{data.sido_name}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>업종 집중도</div>
              <div style={valueStyle}>{concentrationLevel}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>가입자 수 1위 업종</div>
              <div style={valueStyleSmall}>{topIndustryName}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>1위 업종 총 가입자 수</div>
              <div style={valueStyle}>{formatNumber(topIndustryWorkers)}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>집계 업종 수</div>
              <div style={valueStyle}>
                {formatNumber(data.industry_summary.length)}
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={cardStyle}>
              <div style={labelStyle}>상위 1개 업종 비중</div>
              <div style={valueStyle}>{top1IndustryShare.toFixed(1)}%</div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>상위 3개 업종 비중</div>
              <div style={valueStyle}>{top3IndustryShare.toFixed(1)}%</div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>상위 5개 업종 비중</div>
              <div style={valueStyle}>{top5IndustryShare.toFixed(1)}%</div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>고용 밀도 1위 업종</div>
              <div style={valueStyleSmall}>
                {highestDensityIndustry?.industry_name ?? "-"}
              </div>
              <div style={{ marginTop: "8px", color: "#64748b" }}>
                사업장당 평균 가입자 수{" "}
                {highestDensityIndustry
                  ? formatNumber(highestDensityIndustry.avg_workers)
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
                {concentrationMessage}
                <br />
                상위 3개 업종 비중은 해당 지역 고용이 특정 산업에 얼마나
                의존하고 있는지 보여주는 지표입니다.
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <div style={{ color: "#334155", lineHeight: 1.6 }}>
                사업장 수는 많지만 가입자 비중이 낮은 업종은 소규모 사업장이
                많은 생활밀착형 업종일 수 있고, 사업장 수는 적지만 가입자 비중이
                높은 업종은 고용 파급력이 큰 핵심 업종일 수 있습니다.
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
            <RegionBarChart
              title={`${data.sido_name} 업종별 총 가입자 수 TOP 10`}
              data={workerChartData}
              dataKey="workerCount"
            />
            <RegionBarChart
              title={`${data.sido_name} 업종별 사업장 수 TOP 10`}
              data={businessChartData}
              dataKey="businessCount"
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
              {data.sido_name} 상위 업종
            </h2>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>업종</th>
                  <th style={thStyleRight}>사업장 수</th>
                  <th style={thStyleRight}>사업장 비중(%)</th>
                  <th style={thStyleRight}>총 가입자 수</th>
                  <th style={thStyleRight}>가입자 비중(%)</th>
                  <th style={thStyleRight}>고용-사업장 비중 차이</th>
                  <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                  <th style={thStyle}>해석</th>
                </tr>
              </thead>
              <tbody>
                {data.industry_summary.map((item, index) => {
                  const workerShare =
                    totalWorkersAll > 0
                      ? (item.total_workers / totalWorkersAll) * 100
                      : 0;

                  const businessShare =
                    totalBusinessesAll > 0
                      ? (item.business_count / totalBusinessesAll) * 100
                      : 0;

                  const shareGap = workerShare - businessShare;
                  const densityLabel = getDensityLabel(item.avg_workers);

                  return (
                    <tr key={`${item.industry_name}-${index}`}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}>{item.industry_name}</td>
                      <td style={tdStyleRight}>
                        {formatNumber(item.business_count)}
                      </td>
                      <td style={tdStyleRight}>
                        {formatPercent(businessShare)}
                      </td>
                      <td style={tdStyleRight}>
                        {formatNumber(item.total_workers)}
                      </td>
                      <td style={tdStyleRight}>{formatPercent(workerShare)}</td>
                      <td
                        style={{
                          ...tdStyleRight,
                          color: shareGap >= 0 ? "#2563eb" : "#dc2626",
                          fontWeight: 600,
                        }}
                      >
                        {shareGap >= 0 ? "+" : ""}
                        {shareGap.toFixed(1)}%p
                      </td>
                      <td style={tdStyleRight}>
                        {formatNumber(item.avg_workers)}
                      </td>
                      <td style={tdStyle}>{densityLabel}</td>
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

const cardStyle: React.CSSProperties = {
  padding: "20px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "10px",
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
