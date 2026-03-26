import styles from "./TeamReportPage.module.css";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useGetSessionReport } from "../../api/useGetSessionReport";
import ReportLoadingPage from "../../components/ReportLoadingPage/ReportLoadingPage";
import { useNavigate } from "react-router-dom";

function TeamReportPage() {
  const sessionCode = sessionStorage.getItem("sessionCode");
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetSessionReport(sessionCode ?? "");

  if (!sessionCode) {
    return <div className={styles.error}>Session code not found.</div>;
  }

  if (isLoading) {
    return <ReportLoadingPage text="Analyzing team performance" />;
  }

  if (error) {
    return <div className={styles.error}>Failed to load report.</div>;
  }

  if (!data || !data.report) {
    return <div className={styles.error}>No report data found.</div>;
  }

  const team = data.report.teamEvaluation;

  const radarData = team.radarChart.labels.map((label, index) => ({
    skill: label,
    score: team.radarChart.values[index] ?? 0,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Team Evaluation</p>
            <h1 className={styles.pageTitle}>Team Performance Report</h1>
            <p className={styles.pageSubtitle}>{team.summary}</p>
          </div>

          <div className={styles.scoreBadge}>
            <span className={styles.scoreLabel}>Team Score</span>
            <span className={styles.scoreValue}>{team.overallScore}</span>
          </div>

          <div className={styles.navButtonContainer}>
            <button
              className={styles.navButton}
              onClick={() => navigate("/report")}
            >
              ← Back to My Report
            </button>
          </div>
        </header>

        <section className={styles.topSection}>
          <div className={styles.chartCard}>
            <h2 className={styles.cardTitle}>Team Skill Radar</h2>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "#ffffff", fontSize: 14 }}
                  />
                  <PolarRadiusAxis
                    angle={18}
                    domain={[0, 100]}
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <Radar
                    name="Team"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.summaryColumn}>
            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Team Strengths</h2>
              {team.strengths.length > 0 ? (
                <ul className={styles.list}>
                  {team.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>No strengths identified.</p>
              )}
            </div>

            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Team Issues</h2>
              {team.improvements.length > 0 ? (
                <ul className={styles.list}>
                  {team.improvements.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>No major issues detected.</p>
              )}
            </div>

            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Recommendations</h2>
              {team.recommendations.length > 0 ? (
                <ul className={styles.list}>
                  {team.recommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>No recommendations provided.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TeamReportPage;
