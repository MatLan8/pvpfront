import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReportLoadingPage from "../../components/ReportLoadingPage/ReportLoadingPage";
import Header from "../../components/Headers/AppHeader";
import TeamTab from "../../components/ReportTabs/TeamTab";
import PlayerTab from "../../components/ReportTabs/PlayerTab";
import { useSessionReportPage } from "../../hooks/useSessionReportPage";
import styles from "./TeamReportPage.module.css";

function ReportsForLeaderPage() {
  const { sessionCode: sessionCodeParam } = useParams();
  const sessionCode = sessionCodeParam;
  const [activeTab, setActiveTab] = useState("team");
  const navigate = useNavigate();

  const { data, isReportLoading, isReportError } = useSessionReportPage(
    sessionCode ?? "",
  );

  if (!sessionCode) {
    return <div className={styles.error}>Session code not found.</div>;
  }

  if (isReportLoading) {
    return <ReportLoadingPage text="Generating report…" />;
  }

  if (isReportError) {
    return <div className={styles.error}>Failed to load report.</div>;
  }

  if (!data?.report) {
    return <div className={styles.error}>No report data found.</div>;
  }

  const players = data.report.playerEvaluations;
  const tabs = ["team", ...players.map((p) => p.nickname)];

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.containerLeader}>
        <button className={styles.back} onClick={goBack}>
          ⬅
        </button>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? styles.activeTab : styles.tab}
            >
              {tab === "team" ? "Team" : tab}
            </button>
          ))}
        </div>

        {activeTab === "team" && <TeamTab team={data.report.teamEvaluation} />}
        {players.map((player) =>
          activeTab === player.nickname ? (
            <PlayerTab key={player.playerId} playerReport={player} />
          ) : null,
        )}
      </div>
    </div>
  );
}

export default ReportsForLeaderPage;
