export default function DataSourceNotice() {
  return (
    <section
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "14px 18px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#ffffff",
        color: "#475569",
        fontSize: "12px",
        lineHeight: 1.6,
      }}
    >
      <strong style={{ color: "#0f172a" }}>데이터 출처 및 해석 유의사항</strong>
      <br />
      - 출처: 공공데이터포털 「국민연금공단_국민연금 가입 사업장 내역」
      <br />본 데이터는 사업장 단위 신고자료 기반이며, 소규모 사업장 등은 일부
      제외될 수 있습니다.
      <br />
      해당 데이터는 <strong> 가입자 수 3인 이상 법인사업장</strong> 및
      <strong> 가입자 수 10인 이상 개인사업장</strong>을 기준으로 제공되어
      소규모 사업장이나 일부 사업장은 분석 대상에서 제외될 수 있습니다.
      <br />
      추정 평균연소득은 국민연금 보험료 기준의 보조 지표로, 실제 임금과 차이가
      있을 수 있습니다.
    </section>
  );
}
