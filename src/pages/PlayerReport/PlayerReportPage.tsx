import styles from "./PlayerReportPage.module.css";
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

function PlayerReportPage() {
  const sessionCode = sessionStorage.getItem("sessionCode");
  const playerId = sessionStorage.getItem("playerId");
  const nickname = sessionStorage.getItem("nickname");
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetSessionReport(sessionCode ?? "");

  if (!sessionCode) {
    return <div className={styles.error}>Session code not found.</div>;
  }

  if (!playerId) {
    return (
      <div className={styles.error}>No player found in session storage.</div>
    );
  }

  if (isLoading) {
    return <ReportLoadingPage text="Evaluating your soft skills" />;
  }

  if (error) {
    return <div className={styles.error}>Failed to load report.</div>;
  }

  if (!data) {
    return <div className={styles.error}>No report data found.</div>;
  }

  const playerReport = data.report.playerEvaluations.find(
    (player) => player.playerId === playerId,
  );

  if (!playerReport) {
    return (
      <div className={styles.error}>
        No individual report found for this player.
      </div>
    );
  }

  const radarData = playerReport.radarChart.labels.map((label, index) => ({
    skill: label,
    score: playerReport.radarChart.values[index] ?? 0,
  }));

  const skillCards = [
    {
      title: "Communication",
      data: playerReport.skills.communication,
    },
    {
      title: "Teamwork",
      data: playerReport.skills.teamwork,
    },
    {
      title: "Problem Solving",
      data: playerReport.skills.problemSolving,
    },
    {
      title: "Leadership",
      data: playerReport.skills.leadership,
    },
    {
      title: "Time Management",
      data: playerReport.skills.timeManagement,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Individual Evaluation</p>
            <h1 className={styles.pageTitle}>
              {playerReport.nickname || nickname || "Player"}'s Report
            </h1>
            <p className={styles.pageSubtitle}>{playerReport.summary}</p>
          </div>

          <div className={styles.scoreBadge}>
            <span className={styles.scoreLabel}>Overall Score</span>
            <span className={styles.scoreValue}>
              {playerReport.overallScore}
            </span>
          </div>
          <div className={styles.navButtonContainer}>
            <button
              className={styles.navButton}
              onClick={() => navigate("/team-report")}
            >
              View Team Report →
            </button>
          </div>
        </header>

        <section className={styles.topSection}>
          <div className={styles.chartCard}>
            <h2 className={styles.cardTitle}>Skill Radar</h2>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={420}>
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
                    name={playerReport.nickname}
                    dataKey="score"
                    stroke="#60a5fa"
                    fill="#60a5fa"
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
              <h2 className={styles.cardTitle}>Top Behavioral Patterns</h2>
              {playerReport.topBehavioralPatterns.length > 0 ? (
                <ul className={styles.list}>
                  {playerReport.topBehavioralPatterns.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>
                  No notable patterns identified.
                </p>
              )}
            </div>

            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Actionable Next Steps</h2>
              {playerReport.actionableNextSteps.length > 0 ? (
                <ul className={styles.list}>
                  {playerReport.actionableNextSteps.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>No next steps provided.</p>
              )}
            </div>

            <div className={styles.infoCard}>
              <h2 className={styles.cardTitle}>Red Flags</h2>
              {playerReport.redFlags.length > 0 ? (
                <ul className={styles.list}>
                  {playerReport.redFlags.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyText}>No major red flags detected.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.skillsSection}>
          <h2 className={styles.sectionHeading}>Skill Breakdown</h2>

          <div className={styles.skillsGrid}>
            {skillCards.map((skill) => (
              <article key={skill.title} className={styles.skillCard}>
                <div className={styles.skillHeader}>
                  <h3 className={styles.skillTitle}>{skill.title}</h3>
                  <div className={styles.skillScore}>{skill.data.score}</div>
                </div>

                {skill.data.insufficientEvidence && (
                  <p className={styles.warningBadge}>Insufficient evidence</p>
                )}

                <div className={styles.skillBlock}>
                  <h4 className={styles.subheading}>Strengths</h4>
                  {skill.data.strengths.length > 0 ? (
                    <ul className={styles.list}>
                      {skill.data.strengths.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyText}>No strengths provided.</p>
                  )}
                </div>

                <div className={styles.skillBlock}>
                  <h4 className={styles.subheading}>Improvements</h4>
                  {skill.data.improvements.length > 0 ? (
                    <ul className={styles.list}>
                      {skill.data.improvements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.emptyText}>
                      No improvements provided.
                    </p>
                  )}
                </div>

                <div className={styles.skillBlock}>
                  <h4 className={styles.subheading}>Evidence</h4>
                  {skill.data.keyEvidence.length > 0 ? (
                    <div className={styles.evidenceList}>
                      {skill.data.keyEvidence.map((evidence, index) => (
                        <div key={index} className={styles.evidenceItem}>
                          <div className={styles.evidenceRef}>
                            {evidence.ref}
                          </div>
                          <div className={styles.evidenceQuote}>
                            "{evidence.quote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>No evidence provided.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PlayerReportPage;
