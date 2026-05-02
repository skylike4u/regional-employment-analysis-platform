import type React from "react";
import type { DistrictSummary } from "../types/employment";
import { formatNumber } from "../utils/format";

type Props = {
  data: DistrictSummary[];
};

export default function SummaryCards({ data }: Props) {
  const totalBusinesses = data.reduce(
    (sum, item) => sum + item.businessCount,
    0
  );
  const totalWorkers = data.reduce((sum, item) => sum + item.workerCount, 0);
  const avgWorkers =
    totalBusinesses === 0 ? 0 : Math.round(totalWorkers / totalBusinesses);
  const topDistrict = data[0]?.district ?? "-";

  const cardStyle: React.CSSProperties = {
    padding: "20px",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "10px",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "32px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginTop: "28px",
        marginBottom: "28px",
      }}
    >
      <div style={cardStyle}>
        <div style={labelStyle}>사업장 수</div>
        <div style={valueStyle}>{formatNumber(totalBusinesses)}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>총 근로자 수</div>
        <div style={valueStyle}>{formatNumber(totalWorkers)}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>평균 사업장 규모</div>
        <div style={valueStyle}>{formatNumber(avgWorkers)}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>상위 구·군</div>
        <div style={valueStyle}>{topDistrict}</div>
      </div>
    </div>
  );
}
