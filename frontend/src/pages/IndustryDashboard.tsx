import { useEffect, useMemo, useState } from "react";
import { fetchIndustryDistributionReal } from "../api/workers";
import { REGION_OPTIONS } from "../constants/regions";
import IndustryDistributionMap from "../components/maps/IndustryDistributionMap";
import type {
  IndustryDistributionApiResponse,
  IndustryDistributionScope,
  IndustryOption,
} from "../types/employment";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value ?? 0);
}

function formatIncomeManwon(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

function shortText(value: string, maxLength = 26) {
  if (!value) return "-";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getRegionName(item: {
  region_name?: string;
  full_region_name?: string;
  sido_name?: string;
  sigungu_name?: string;
}) {
  return (
    item.region_name ||
    item.full_region_name ||
    [item.sido_name, item.sigungu_name].filter(Boolean).join(" ") ||
    "-"
  );
}

export default function IndustryDashboard() {
  const [scope, setScope] = useState<IndustryDistributionScope>("nationwide");
  const [draftSidoCode, setDraftSidoCode] = useState("26");
  const [selectedIndustryName, setSelectedIndustryName] = useState("all");
  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);

  const [data, setData] = useState<IndustryDistributionApiResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function loadInitialIndustryOptions() {
      try {
        const result = await fetchIndustryDistributionReal({
          scope: "nationwide",
        });

        setIndustryOptions(result.industry_options);

        if (result.industry_name) {
          setSelectedIndustryName(result.industry_name);
        }
      } catch (error) {
        console.error("업종 목록 초기 로딩 실패:", error);
      }
    }

    loadInitialIndustryOptions();
  }, []);

  async function handleSearch() {
    try {
      setLoading(true);
      setErrorMessage("");
      setHasSearched(true);

      const result = await fetchIndustryDistributionReal({
        scope,
        sidoCode: scope === "sido" ? draftSidoCode : undefined,
        industryName: selectedIndustryName,
      });

      setData(result);
      setIndustryOptions(result.industry_options);
      setSelectedIndustryName(result.industry_name);
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "업종 분포 데이터를 불러오지 못했습니다.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  const selectedSidoName =
    REGION_OPTIONS.find((region) => region.code === draftSidoCode)?.name ??
    "선택 지역";

  const currentScopeLabel =
    scope === "nationwide" ? "전국" : data?.sido_name ?? selectedSidoName;

  const summary = data?.summary;

  const topRegionName = data?.top_region ? getRegionName(data.top_region) : "-";

  const topCompany = data?.company_top20?.[0];

  const validMapPointCount = useMemo(() => {
    return (
      data?.map_points.filter(
        (item) => typeof item.lat === "number" && typeof item.lng === "number"
      ).length ?? 0
    );
  }, [data]);

  const mapAvailable = validMapPointCount > 0;

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px 24px 32px",
      }}
    >
      <header style={{ marginBottom: "24px" }}>
        <h1 style={pageTitle}>산업탐색</h1>
        <p style={pageSubtitle}>
          특정 업종이 전국 또는 선택한 시도 안에서 어디에 집중되어 있는지
          확인합니다.
        </p>
      </header>

      <section style={filterBox}>
        <div style={filterGrid}>
          <div>
            <label style={labelStyle}>분석 범위</label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as IndustryDistributionScope);
                setData(null);
                setErrorMessage("");
                setHasSearched(false);
              }}
              style={selectStyle}
            >
              <option value="nationwide">전국 단위</option>
              <option value="sido">시도 단위</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>시도</label>
            <select
              value={draftSidoCode}
              onChange={(e) => {
                setDraftSidoCode(e.target.value);
                setData(null);
                setErrorMessage("");
                setHasSearched(false);
              }}
              style={selectStyle}
              disabled={scope === "nationwide"}
            >
              {REGION_OPTIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>업종</label>
            <select
              value={selectedIndustryName}
              onChange={(e) => {
                setSelectedIndustryName(e.target.value);
                setData(null);
                setErrorMessage("");
                setHasSearched(false);
              }}
              style={selectStyle}
            >
              <option value="all">업종을 선택하세요</option>
              {industryOptions.map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleSearch} disabled={loading} style={searchButton}>
          {loading ? "조회 중..." : "산업 분포 조회"}
        </button>
      </section>

      {!hasSearched && !loading && (
        <section style={emptyBox}>
          <div style={emptyTitle}>산업 분포 분석 대기 중</div>
          <div style={emptyText}>
            분석 범위와 업종을 선택한 뒤 조회 버튼을 누르면, 선택 업종의 공간적
            분포와 집중 지역을 확인할 수 있습니다.
          </div>
          <div style={emptyHint}>
            전국 단위는 시도별 지도 분포를, 시도 단위는 집중 지역 TOP20과 대표
            기업을 중심으로 확인합니다.
          </div>
        </section>
      )}

      {loading && (
        <div style={{ padding: "24px" }}>
          업종 분포 데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && errorMessage && (
        <div style={{ padding: "24px", color: "red" }}>{errorMessage}</div>
      )}

      {!loading && !errorMessage && data && summary && (
        <>
          <section style={resultSummaryBox}>
            <div>
              <div style={resultSummaryLabel}>현재 조회 범위</div>
              <div style={resultSummaryTitle}>
                {currentScopeLabel} · {data.industry_name}
              </div>
            </div>

            <div style={resultSummaryMeta}>
              <span>사업장 {formatNumber(summary.business_count)}개</span>
              <span>가입자 {formatNumber(summary.total_workers)}명</span>
              <span>
                추정 평균연소득{" "}
                {formatIncomeManwon(summary.estimated_avg_annual_income)}
              </span>
            </div>
          </section>

          <section style={grid4}>
            <InfoCard label="선택 업종" value={data.industry_name} />

            <InfoCard
              label={
                scope === "nationwide" ? "전국 사업장 수" : "시도 내 사업장 수"
              }
              value={formatNumber(summary.business_count)}
            />

            <InfoCard
              label={
                scope === "nationwide" ? "전국 가입자 수" : "시도 내 가입자 수"
              }
              value={formatNumber(summary.total_workers)}
            />

            <InfoCard
              label="추정 평균연소득"
              value={formatIncomeManwon(summary.estimated_avg_annual_income)}
            />
          </section>

          <section style={grid4}>
            <InfoCard
              label="최대 집중 지역"
              value={topRegionName}
              subText="가입자 수 기준"
            />

            <InfoCard
              label="사업장당 평균 가입자 수"
              value={`${formatNumber(summary.avg_workers)}명`}
              subText="선택 업종 기준"
            />

            <InfoCard
              label="대표 기업"
              value={topCompany?.company_name ?? "-"}
              subText={
                topCompany
                  ? `${formatNumber(topCompany.subscriber_count)}명`
                  : "-"
              }
            />

            <InfoCard
              label="지도 표시 지역"
              value={
                mapAvailable
                  ? scope === "nationwide"
                    ? `${formatNumber(validMapPointCount)}개 시도`
                    : `${formatNumber(validMapPointCount)}개 지역`
                  : "제한"
              }
              subText={
                mapAvailable
                  ? scope === "nationwide"
                    ? "전국 시도 단위"
                    : "지역 좌표 기준"
                  : "좌표 데이터 없음"
              }
            />
          </section>

          <section style={grid2}>
            <div style={cardStyle}>
              <div style={labelStyle}>해석 포인트</div>
              <div style={paragraphStyle}>
                이 화면은 선택 업종이 어느 지역에 집중되어 있는지 보여줍니다.
                원의 크기가 큰 지역은 해당 업종의 고용 규모가 크고, 색상이
                진할수록 추정 평균연소득 수준이 높은 지역으로 볼 수 있습니다.
              </div>
            </div>

            <div style={cardStyle}>
              <div style={labelStyle}>정책 활용 포인트</div>
              <div style={paragraphStyle}>
                산업별 집중 지역과 대표 기업을 함께 보면 산업 육성, 기업지원,
                인력양성, 교통·입지 정책의 우선 검토 지역을 설정하는 데 활용할
                수 있습니다.
              </div>
            </div>
          </section>
          {data.scope === "nationwide" && (
            <IndustryDistributionMap
              data={data.map_points}
              industryName={data.industry_name}
              scope={data.scope}
            />
          )}

          <section style={tableCard}>
            <h2 style={sectionTitle}>
              {currentScopeLabel} · {data.industry_name} 집중 지역 TOP20
            </h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>지역</th>
                  <th style={thStyleRight}>사업장 수</th>
                  <th style={thStyleRight}>총 가입자 수</th>
                  <th style={thStyleRight}>사업장당 평균 가입자 수</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                </tr>
              </thead>

              <tbody>
                {data.region_top20.map((item, index) => (
                  <tr key={`${getRegionName(item)}-${index}`}>
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={strongCell}>{getRegionName(item)}</td>
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

          <section style={tableCard}>
            <h2 style={sectionTitle}>
              {currentScopeLabel} · {data.industry_name} 대표 기업 TOP20
            </h2>

            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>순위</th>
                  <th style={thStyle}>기업명</th>
                  <th style={thStyle}>지역/주소</th>
                  <th style={thStyleRight}>가입자 수</th>
                  <th style={thStyleRight}>추정 평균연소득</th>
                </tr>
              </thead>

              <tbody>
                {data.company_top20.map((item, index) => (
                  <tr
                    key={`${item.company_name}-${item.business_number}-${index}`}
                  >
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={strongCell} title={item.company_name}>
                      {shortText(item.company_name, 28)}
                    </td>
                    <td style={mutedCell} title={item.full_address}>
                      {shortText(item.full_address, 38)}
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

          {data.scope === "sido" && (
            <section style={mapNoticeBox}>
              <div style={mapNoticeTitle}>지도 시각화는 준비 중입니다</div>
              <div style={mapNoticeText}>
                현재 시도 단위 조회는 시군구별 좌표 데이터가 없어 지도 대신 집중
                지역 TOP20과 대표 기업 TOP20을 중심으로 제공합니다.
              </div>
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
      <div style={valueStyle}>{value}</div>
      {subText && <div style={subTextStyle}>{subText}</div>}
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: "8px",
  letterSpacing: "-0.03em",
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
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  flex: 1,
  minWidth: "720px",
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

const searchButton: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: "10px",
  border: "1px solid #ea580c",
  background: "#ea580c",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  height: "42px",
  minWidth: "120px",
  boxShadow: "0 4px 10px rgba(234, 88, 12, 0.24)",
};

const emptyBox: React.CSSProperties = {
  padding: "28px",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#475569",
  textAlign: "center",
  marginBottom: "20px",
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
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  marginBottom: "16px",
};

const resultSummaryLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#ea580c",
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

const cardStyle: React.CSSProperties = {
  padding: "18px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  minHeight: "88px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "8px",
  fontWeight: 800,
  letterSpacing: "-0.01em",
};

const valueStyle: React.CSSProperties = {
  fontSize: "20px",
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

const paragraphStyle: React.CSSProperties = {
  color: "#334155",
  lineHeight: 1.65,
  fontSize: "14px",
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

const strongCell: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
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

const mapNoticeBox: React.CSSProperties = {
  padding: "22px 24px",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#475569",
  textAlign: "center",
  lineHeight: 1.7,
  marginBottom: "24px",
};

const mapNoticeTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: "6px",
};

const mapNoticeText: React.CSSProperties = {
  fontSize: "14px",
  color: "#475569",
};
