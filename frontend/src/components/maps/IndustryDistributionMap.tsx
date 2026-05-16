import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { IndustryDistributionMapPoint } from "../../types/employment";

type IndustryDistributionMapProps = {
  data: IndustryDistributionMapPoint[];
  industryName: string;
  scope: "nationwide" | "sido";
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatIncomeManwon(value: number) {
  if (!value) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

function getRadius(totalWorkers: number) {
  if (totalWorkers >= 200000) return 24;
  if (totalWorkers >= 100000) return 20;
  if (totalWorkers >= 50000) return 16;
  if (totalWorkers >= 20000) return 13;
  if (totalWorkers >= 10000) return 11;
  if (totalWorkers >= 5000) return 9;
  return 7;
}

function getIncomeColor(income: number) {
  const incomeManwon = income / 10000;

  if (incomeManwon >= 5000) return "#7c3aed";
  if (incomeManwon >= 4500) return "#2563eb";
  if (incomeManwon >= 4300) return "#0f766e";
  if (incomeManwon >= 4100) return "#f59e0b";
  return "#ef4444";
}

function getValidMapPoints(data: IndustryDistributionMapPoint[]) {
  return data.filter(
    (item) =>
      typeof item.lat === "number" &&
      typeof item.lng === "number" &&
      item.total_workers > 0
  );
}

export default function IndustryDistributionMap({
  data,
  industryName,
  scope,
}: IndustryDistributionMapProps) {
  const validPoints = getValidMapPoints(data);

  if (validPoints.length === 0) {
    return (
      <section style={emptyBox}>
        <strong>지도 표시 데이터가 없습니다.</strong>
        <br />
        현재 선택 범위는 좌표 데이터가 없어 지도 대신 하단 TOP20 표를 중심으로
        확인하는 것이 적절합니다.
      </section>
    );
  }

  return (
    <section style={mapCard}>
      <div style={mapHeader}>
        <div>
          <h2 style={titleStyle}>산업 분포 지도</h2>
          <p style={descStyle}>
            선택 업종의 시도별 고용 분포를 보여줍니다. 원의 크기는 가입자 수,
            색상은 추정 평균연소득 수준을 의미합니다.
          </p>
          <p style={industryStyle}>
            선택 업종: <strong>{industryName}</strong>
          </p>
        </div>

        <div style={mapMiniInfo}>
          <div>원 크기: 선택 업종 가입자 수</div>
          <div>색상: 추정 평균연소득</div>
          <div style={{ marginTop: "6px", color: "#64748b" }}>
            {scope === "nationwide" ? "전국 시도 단위" : "시도 내부 지역 단위"}
          </div>
        </div>
      </div>

      <div style={mapWrapper}>
        <MapContainer
          center={[36.3, 127.8]}
          zoom={7}
          scrollWheelZoom={false}
          style={{
            height: "420px",
            width: "100%",
            borderRadius: "14px",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {validPoints.map((item) => {
            const color = getIncomeColor(item.estimated_avg_annual_income);

            return (
              <CircleMarker
                key={item.region_code}
                center={[item.lat as number, item.lng as number]}
                radius={getRadius(item.total_workers)}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.65,
                  weight: 2,
                }}
              >
                <Tooltip
                  direction="bottom"
                  offset={[0, 12]}
                  opacity={1}
                  sticky
                  className="employment-map-tooltip"
                >
                  <div style={{ minWidth: "210px", lineHeight: 1.65 }}>
                    <strong style={{ fontSize: "14px" }}>
                      {item.region_name}
                    </strong>
                    <br />
                    업종: {industryName}
                    <br />
                    사업장 수: {formatNumber(item.business_count)}개
                    <br />
                    가입자 수: {formatNumber(item.total_workers)}명
                    <br />
                    사업장당 평균 가입자 수: {formatNumber(item.avg_workers)}명
                    <br />
                    추정 평균연소득:{" "}
                    {formatIncomeManwon(item.estimated_avg_annual_income)}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        <div style={legendBox}>
          <div style={legendTitle}>평균연봉 범례</div>
          <LegendItem color="#7c3aed" label="5,000만원 이상" />
          <LegendItem color="#2563eb" label="4,500만원 이상" />
          <LegendItem color="#0f766e" label="4,300만원 이상" />
          <LegendItem color="#f59e0b" label="4,100만원 이상" />
          <LegendItem color="#ef4444" label="4,100만원 미만" />
        </div>
      </div>
    </section>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={legendItem}>
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "999px",
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

const mapCard: React.CSSProperties = {
  padding: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  marginBottom: "24px",
};

const mapHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "22px",
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-0.03em",
};

const descStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
};

const industryStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#0f172a",
  fontSize: "14px",
};

const mapMiniInfo: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  minWidth: "210px",
  fontSize: "14px",
  lineHeight: 1.6,
};

const mapWrapper: React.CSSProperties = {
  height: "420px",
  width: "100%",
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  position: "relative",
  zIndex: 1,
};

const legendBox: React.CSSProperties = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  zIndex: 500,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px 14px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
  fontSize: "13px",
};

const legendTitle: React.CSSProperties = {
  fontWeight: 800,
  marginBottom: "8px",
  color: "#0f172a",
};

const legendItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "6px",
  color: "#334155",
};

const emptyBox: React.CSSProperties = {
  padding: "28px",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#475569",
  textAlign: "center",
  lineHeight: 1.7,
  marginBottom: "24px",
};
