import { useState } from "react";
import NationwideDashboard from "./pages/NationwideDashboard";
import BusanDashboard from "./pages/BusanDashboard";
import IndustryDashboard from "./pages/IndustryDashboard";

type ActiveTab = "overview" | "region" | "industry";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("region");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <main
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "28px 24px 28px",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: "0 0 8px",
            }}
          >
            지역산업·고용 분석 대시보드
          </h1>

          <p
            style={{
              margin: "0 0 18px",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            국민연금 가입 사업장 데이터를 기반으로 전국, 지역, 산업 단위의 고용
            구조와 추정 평균연소득을 분석합니다.
          </p>

          <nav
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              전체 개요
            </TabButton>

            <TabButton
              active={activeTab === "region"}
              onClick={() => setActiveTab("region")}
            >
              지역 탐색
            </TabButton>

            <TabButton
              active={activeTab === "industry"}
              onClick={() => setActiveTab("industry")}
            >
              산업 탐색
            </TabButton>
          </nav>
        </header>

        {activeTab === "overview" && <NationwideDashboard />}
        {activeTab === "region" && <BusanDashboard />}
        {activeTab === "industry" && <IndustryDashboard />}

        <DashboardFooter />
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: "12px",
        border: active ? "1px solid #0f766e" : "1px solid #cbd5e1",
        background: active ? "#0f766e" : "#ffffff",
        color: active ? "#ffffff" : "#0f172a",
        fontWeight: 800,
        fontSize: "14px",
        cursor: "pointer",
        boxShadow: active
          ? "0 6px 16px rgba(15, 118, 110, 0.22)"
          : "0 2px 8px rgba(15, 23, 42, 0.04)",
      }}
    >
      {children}
    </button>
  );
}

function DashboardFooter() {
  return (
    <footer
      style={{
        marginTop: "32px",
        padding: "18px 20px",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        background: "#ffffff",
        color: "#475569",
        fontSize: "12px",
        lineHeight: 1.7,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
      }}
    >
      <strong style={{ color: "#0f172a" }}>데이터 출처 및 해석 유의사항</strong>
      <br />
      출처: 공공데이터포털 「국민연금공단_국민연금 가입 사업장 내역」
      <br />
      본 데이터는 전체 사업장을 대상으로 한 전수 데이터가 아니며, 가입자 수 3인
      이상 법인사업장 및 가입자 수 10인 이상 개인사업장을 기준으로 제공됩니다.
      따라서 소규모 사업장이나 일부 사업장은 분석 대상에서 제외될 수 있습니다.
      <br />
      추정 평균연소득은 국민연금 총 보험요율을 활용해 역산한 참고 지표이며,
      기준소득월액 상한, 가입 형태, 업종 특성 등에 따라 실제 평균임금과 차이가
      있을 수 있습니다. 지역 간 상대 비교를 위한 보조 지표로 활용하는 것이
      적절합니다.
      <br />
      행정구역 코드는 시계열 분석을 위해 특별자치도 전환 등 코드 변경 이력을
      별도 alias 기준으로 보정할 수 있습니다.
    </footer>
  );
}
