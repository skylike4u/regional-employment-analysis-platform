export default function DashboardHeader() {
  return (
    <header
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 24px 12px",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "34px",
          fontWeight: 800,
          color: "#0f172a",
          letterSpacing: "-0.04em",
        }}
      >
        지역산업·고용 분석 대시보드
      </h1>

      <p
        style={{
          marginTop: "8px",
          marginBottom: 0,
          color: "#64748b",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        전국 17개 시도의 산업구조와 고용 특성을 국민연금 가입 사업장 데이터
        기반으로 분석합니다.
      </p>
    </header>
  );
}
