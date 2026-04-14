import { useState, useEffect } from "react";
import type { UIEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gamepad2,
  MessageSquare,
  FileBarChart2,
  Mail,
  Users,
  Brain,
  ShieldAlert,
} from "lucide-react";
import eulaText from "./EULA_AI_RUST_VERSION.txt?raw";
import styles from "./MainPage.module.css";

export function TryButton() {
  const navigate = useNavigate();
  const handleStart = () => {
    navigate(`/game`);
  };

  return (
    <button onClick={handleStart} className={styles.btnPrimary}>
      Try Now
    </button>
  );
}

interface ConsentReplica {
  userId: string;
  agreementVersion: string;
  timestamp: string;
  aiDisclosureAccepted: boolean;
}

export default function JoinGameScreen() {
  const navigate = useNavigate();
  const [showEula, setShowEula] = useState<boolean>(false);
  const [, setHasAccepted] = useState<boolean>(false);
  const [canAgree, setCanAgree] = useState<boolean>(false);

  useEffect(() => {
    const consent = document.cookie
      .split("; ")
      .find((row) => row.startsWith("_eu_ai_consent="));
    if (!consent) {
      setShowEula(true);
    } else {
      setHasAccepted(true);
    }
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 2) {
      setCanAgree(true);
    }
  };

  const handleStart = () => {
    navigate(`/game`);
  };

  const handleAgree = async () => {
    const replica: ConsentReplica = {
      userId: "user_pending",
      agreementVersion: "2026.1-EU",
      timestamp: new Date().toISOString(),
      aiDisclosureAccepted: true,
    };

    try {
      console.log("Saving EULA Replica to DB...", replica);
      document.cookie =
        "_eu_ai_consent=true; max-age=15552000; path=/; SameSite=Strict";
      setShowEula(false);
      setHasAccepted(true);
    } catch (error) {
      alert("Error confirming consent.");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* 1. EULA MODAL */}
      {showEula && (
        <div className={styles.modalOverlay}>
          <div className={styles.eulaCard}>
            <ShieldAlert size={48} color="#10b981" />
            <h2>Data Usage Consent</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              Version: 2026.1-EU-AI-Act
            </p>

            <div className={styles.eulaScrollBox} onScroll={handleScroll}>
              <pre>{eulaText}</pre>
            </div>

            {!canAgree && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                Please scroll to the bottom to confirm
              </p>
            )}

            <button
              className={styles.btnPrimary}
              onClick={handleAgree}
              disabled={!canAgree}
            >
              I Understand and Agree
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN PAGE */}
      <div className={showEula ? styles.contentBlurred : styles.contentClear}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logoArea}>
            <div className={styles.iconBox}>
              <Brain size={24} />
            </div>
            TeamSkills AI
          </div>
          <div className={styles.navArea}>
            <a href="#" style={{ color: "#cbd5e1", textDecoration: "none" }}>
              Login
            </a>
            <button className={styles.btnSecondary}>Register</button>
          </div>
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            See team skills in{" "}
            <span className={styles.textEmerald}>real-time</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Participate in short team games, chat, and instantly receive AI
            analysis of your soft skills.
          </p>

          <button
            onClick={handleStart}
            className={styles.btnPrimary}
            style={{ maxWidth: "300px" }}
          >
            START NOW
          </button>

          <div className={styles.heroSteps}>
            <div className={styles.stepItem}>
              <Gamepad2 /> Join game
            </div>
            <div
              style={{ width: "20px", height: "1px", background: "#34d399" }}
            ></div>
            <div className={styles.stepItem}>
              <MessageSquare /> Play & chat
            </div>
            <div
              style={{ width: "20px", height: "1px", background: "#34d399" }}
            ></div>
            <div className={styles.stepItem}>
              <FileBarChart2 /> Get report
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className={styles.section}>
          <div className={styles.grid2}>
            <div>
              <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                The Challenge of Measuring Soft Skills
              </h2>
              <p
                style={{
                  color: "#94a3b8",
                  marginBottom: "2rem",
                  lineHeight: "1.6",
                }}
              >
                While technical skills are easy to measure, soft skills often
                remain subjective. We are changing that using AI and gaming.
              </p>

              <div className={styles.featureCard}>
                <Brain color="#34d399" />
                <h4>AI-driven Analysis</h4>
                <p>
                  We analyze linguistic and behavioral indicators in real-time.
                </p>
              </div>

              <div className={styles.featureCard}>
                <Users color="#34d399" />
                <h4>Immersive Experience</h4>
                <p>No tests – just interactive team collaboration.</p>
              </div>
            </div>

            <div
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "24px",
                height: "400px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gamepad2 size={64} color="#34d399" opacity={0.5} />
              <p style={{ color: "#64748b", marginTop: "1rem" }}>
                Game Interface Preview
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={styles.section}>
          <div className={styles.contactBox}>
            <h2>Ready to unlock your team's potential?</h2>
            <p style={{ color: "#94a3b8", margin: "1rem 0 2rem 0" }}>
              Have questions? Let's get in touch!
            </p>
            <a
              href="mailto:contact@teamskills.ai"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                color: "#34d399",
                fontSize: "1.2rem",
                textDecoration: "none",
              }}
            >
              <Mail /> contact@teamskills.ai
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
