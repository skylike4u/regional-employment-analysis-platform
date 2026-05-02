import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
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
          const workerRank = workerRankMap.get(item.sido_code);
          const incomeRank = incomeRankMap.get(item.sido_code);

          return (
            <CircleMarker
              key={item.sido_code}
              center={[item.lat as number, item.lng as number]}
              radius={getRadius(item.total_workers)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.58,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ minWidth: "160px", lineHeight: 1.6 }}>
                  <strong>{item.sido_name}</strong>
                  <br />
                  고용 규모 {workerRank ?? "-"}위 · 평균연소득{" "}
                  {incomeRank ?? "-"}위
                  <br />
                  가입자 {formatNumber(item.total_workers)}명
                  <br />
                  평균연소득{" "}
                  {formatIncomeManwon(item.estimated_avg_annual_income)}
                </div>
              </Tooltip>

              <Popup>
                <div style={{ minWidth: "190px", lineHeight: 1.7 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "15px",
                      marginBottom: "6px",
                    }}
                  >
                    {item.sido_name}
                  </div>

                  <div>고용 규모 순위: {workerRank ?? "-"}위</div>
                  <div>평균연소득 순위: {incomeRank ?? "-"}위</div>
                  <hr style={{ border: 0, borderTop: "1px solid #e5e7eb" }} />
                  <div>가입자 수: {formatNumber(item.total_workers)}명</div>
                  <div>사업장 수: {formatNumber(item.business_count)}개</div>
                  <div>
                    사업장당 평균 가입자 수: {formatNumber(item.avg_workers)}명
                  </div>
                  <div>
                    추정 평균연소득:{" "}
                    {formatIncomeManwon(item.estimated_avg_annual_income)}
                  </div>
                </div>
              </Popup>
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
        <div
          style={{
            fontWeight: 800,
            marginBottom: "8px",
            color: "#0f172a",
          }}
        >
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
