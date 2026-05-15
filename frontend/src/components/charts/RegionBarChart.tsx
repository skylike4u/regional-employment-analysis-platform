import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartDataItem = {
  district: string;
  [key: string]: string | number;
};

type RegionBarChartProps = {
  title: string;
  data: ChartDataItem[];
  dataKey: string;
  barColor?: string;
};

function formatTick(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function shortenLabel(value: string, maxLength = 7) {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function getMetricLabel(dataKey: string) {
  if (dataKey === "workerCount") return "가입자 수";
  if (dataKey === "businessCount") return "사업장 수";
  if (dataKey === "income") return "추정 평균연소득";
  return dataKey;
}

export default function RegionBarChart({
  title,
  data,
  dataKey,
  barColor = "#2563eb",
}: RegionBarChartProps) {
  const metricLabel = getMetricLabel(dataKey);

  return (
    <div
      style={{
        padding: "22px 24px",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: "19px",
          fontWeight: 900,
          color: "#0f172a",
          lineHeight: 1.35,
          letterSpacing: "-0.03em",
          wordBreak: "keep-all",
        }}
      >
        {title}
      </h2>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 18, right: 18, left: 4, bottom: 34 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />

            <XAxis
              dataKey="district"
              tick={{
                fontSize: 11,
                fill: "#64748b",
              }}
              tickFormatter={(value) => shortenLabel(String(value), 7)}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={64}
              tickMargin={8}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />

            <YAxis
              tick={{
                fontSize: 11,
                fill: "#64748b",
              }}
              tickFormatter={(value) => formatTick(Number(value))}
              domain={[0, "dataMax"]}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={58}
            />

            <Tooltip
              formatter={(value) => [
                dataKey === "income"
                  ? `${formatTick(Number(value))}만원`
                  : formatTick(Number(value)),
                metricLabel,
              ]}
              labelFormatter={(label) => String(label)}
              labelStyle={{
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "6px",
              }}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                fontSize: "13px",
              }}
            />

            <Bar
              dataKey={dataKey}
              fill={barColor}
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
