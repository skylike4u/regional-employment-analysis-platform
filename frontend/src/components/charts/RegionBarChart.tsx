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

export default function RegionBarChart({
  title,
  data,
  dataKey,
  barColor = "#2563eb",
}: RegionBarChartProps) {
  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#ffffff",
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: "20px",
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="district"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
            />

            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatTick(Number(value))}
              domain={[0, "dataMax"]}
              allowDecimals={false}
              reversed={false}
            />

            <Tooltip
              formatter={(value) => [formatTick(Number(value)), dataKey]}
              labelStyle={{ fontWeight: 700 }}
            />

            <Bar
              dataKey={dataKey}
              fill={barColor}
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
