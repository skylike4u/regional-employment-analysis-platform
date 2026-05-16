import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { formatNumber } from "../../utils/format";

type SidoMapItem = {
  sido_code: string;
  sido_name: string;
  business_count: number;
  total_workers: number;
  avg_workers: number;
  estimated_avg_annual_income: number;
  lat?: number;
  lng?: number;
};

type NationwideEmploymentMapProps = {
  data: SidoMapItem[];
  onSelectSido: (sidoCode: string) => void;
};

function formatIncomeManwon(value: number) {
  if (!value || value <= 0) return "-";
  return `${formatNumber(Math.round(value / 10000))}만원`;
}

function getRadius(totalWorkers: number) {
  if (totalWorkers >= 3_000_000) return 24;
  if (totalWorkers >= 2_000_000) return 21;
  if (totalWorkers >= 1_000_000) return 18;
  if (totalWorkers >= 500_000) return 15;
  if (totalWorkers >= 200_000) return 12;
  return 9;
}

function getIncomeColor(income: number) {
  const incomeManwon = income / 10000;

  if (incomeManwon >= 4700) return "#7c3aed";
  if (incomeManwon >= 4500) return "#2563eb";
  if (incomeManwon >= 4300) return "#0f766e";
  if (incomeManwon >= 4100) return "#f59e0b";
  return "#ef4444";
}

export default function NationwideEmploymentMap({
  data,
  onSelectSido,
}: NationwideEmploymentMapProps) {
  const center: LatLngExpression = [36.2, 127.8];

  const validData = data.filter(
    (item) => typeof item.lat === "number" && typeof item.lng === "number"
  );

  const workerRankMap = new Map(
    [...validData]
      .sort((a, b) => b.total_workers - a.total_workers)
      .map((item, index) => [item.sido_code, index + 1])
  );

  const incomeRankMap = new Map(
    [...validData]
      .filter((item) => item.estimated_avg_annual_income > 0)
      .sort(
        (a, b) => b.estimated_avg_annual_income - a.estimated_avg_annual_income
      )
      .map((item, index) => [item.sido_code, index + 1])
  );

  const businessRankMap = new Map(
    [...validData]
      .sort((a, b) => b.business_count - a.business_count)
      .map((item, index) => [item.sido_code, index + 1])
  );

  const avgWorkersRankMap = new Map(
    [...validData]
      .sort((a, b) => b.avg_workers - a.avg_workers)
      .map((item, index) => [item.sido_code, index + 1])
  );

  const legendItems = [
    { color: "#7c3aed", label: "4,700만원 이상" },
    { color: "#2563eb", label: "4,500만원 이상" },
    { color: "#0f766e", label: "4,300만원 이상" },
    { color: "#f59e0b", label: "4,100만원 이상" },
    { color: "#ef4444", label: "4,100만원 미만" },
  ];

  return (
    <div
      style={{
        height: "420px",
        width: "100%",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        position: "relative",
        zIndex: 1,
        marginBottom: "24px",
      }}
    >
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validData.map((item) => {
          const color = getIncomeColor(item.estimated_avg_annual_income);

          return (
            <CircleMarker
              key={item.sido_code}
              center={[item.lat as number, item.lng as number]}
              radius={getRadius(item.total_workers)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onSelectSido(item.sido_code),
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
                  <strong style={{ fontSize: "15px" }}>{item.sido_name}</strong>
                  <br />
                  고용 규모: {workerRankMap.get(item.sido_code) ?? "-"}위
                  <br />
                  사업장 수: {businessRankMap.get(item.sido_code) ?? "-"}위
                  <br />
                  평균연소득: {incomeRankMap.get(item.sido_code) ?? "-"}위
                  <br />
                  평균 사업장 규모:{" "}
                  {avgWorkersRankMap.get(item.sido_code) ?? "-"}위
                  <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />
                  가입자 수: {formatNumber(item.total_workers)}명
                  <br />
                  사업장 수: {formatNumber(item.business_count)}개
                  <br />
                  사업장당 평균 가입자 수: {formatNumber(item.avg_workers)}명
                  <br />
                  추정 평균연소득:{" "}
                  {formatIncomeManwon(item.estimated_avg_annual_income)}
                  <br />
                  <span style={{ color: "#0f766e", fontWeight: 800 }}>
                    클릭하면 지역 탐색으로 이동
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          bottom: "14px",
          left: "14px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "12px 14px",
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
          zIndex: 1000,
          fontSize: "12px",
          color: "#334155",
          minWidth: "150px",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: "8px", color: "#0f172a" }}>
          평균연봉 범례
        </div>

        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: item.color,
                display: "inline-block",
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
