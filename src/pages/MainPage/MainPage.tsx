import { useState, useEffect } from "react";
import type { UIEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import LoginModal from "../../components/modals/LoginModal";
import RegisterModal from "../../components/modals/RegisterModal";
import JoinSessionModal from "../../components/modals/JoinSessionModal";

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
  const [showEula, setShowEula] = useState<boolean>(false);
  const [, setHasAccepted] = useState<boolean>(false);
  const [canAgree, setCanAgree] = useState<boolean>(false);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    const shouldOpenJoin = searchParams.get("join");

    if (shouldOpenJoin === "true") {
      setIsJoinOpen(true);
    }
  }, [searchParams]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 2) {
      setCanAgree(true);
    }
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

        {/* Ambient Glows */}
        <div className={styles.ambientGlowTop} />
        <div className={styles.ambientGlowBottom} />

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logoArea}>
            <img src="/src/assets/brand/logo.png" alt="TeamLens Logo" className={styles.logoImg} />
            <span className={styles.logoText}>TeamLens</span>
          </div>
          <div className={styles.navArea}>
            <button
              onClick={() => setIsLoginOpen(true)}
              className={styles.navBtn}
            >
              Login
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => setIsRegisterOpen(true)}
            >
              Register
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              See team skills in{" "}
              <span className={styles.heroTitleGradient}>real-time</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Participate in short team games, chat, and instantly receive AI
              analysis of your soft skills.
            </p>

            <button
              onClick={() => setIsJoinOpen(true)}
              className={styles.btnPrimary}
              style={{ maxWidth: "300px" }}
            >
              START NOW
            </button>
          </div>
        </section>

        {/* Steps */}
        <section className={styles.stepsSection}>
          <div className={styles.stepCard}>
            <div className={styles.stepIcon}>
              <Gamepad2 size={22} />
            </div>
            <h3 className={styles.stepTitle}>1. Join Game</h3>
            <p className={styles.stepDesc}>Join a short, focused team activity.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepIcon}>
              <MessageSquare size={22} />
            </div>
            <h3 className={styles.stepTitle}>2. Play & Chat</h3>
            <p className={styles.stepDesc}>Interact with colleagues in real-time chat.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepIcon}>
              <FileBarChart2 size={22} />
            </div>
            <h3 className={styles.stepTitle}>3. Get Report</h3>
            <p className={styles.stepDesc}>Receive a detailed AI-driven soft skills profile.</p>
          </div>
        </section>

        {/* Problem Section */}
        <section className={styles.section}>
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

            <div className={styles.featureRowWrapper}>
              <div className={styles.featureRow}>
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
            </div>
          </div>

          <img
            src="/src/assets/brand/Connections.png"
            alt="Game Interface Preview"
            className={styles.previewImg}
            onClick={() => setLightboxImg("/src/assets/brand/Connections.png")}
            style={{ cursor: "pointer" }}
          />
        </section>

        {/* Games Section */}
        <section className={styles.section}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Mini-Games
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: "1.6" }}>
            Short, engaging team challenges that reveal how you communicate, collaborate, and solve problems together.
          </p>
          <div className={styles.gamesGrid}>
            <div className={styles.gameCard}>
              <img src="/src/assets/brand/Connections.png" alt="Connections" className={styles.gameImg} onClick={() => setLightboxImg("/src/assets/brand/Connections.png")} style={{ cursor: "pointer" }} />
              <div className={styles.gameCardBody}>
                <h4>Connections</h4>
                <p>16 words. 4 hidden categories. Group them together by finding links between words. Speed and accuracy matter.</p>
              </div>
            </div>
            <div className={styles.gameCard}>
              <img src="/src/assets/brand/GameWordGuessing.png" alt="Word Guessing" className={styles.gameImg} onClick={() => setLightboxImg("/src/assets/brand/GameWordGuessing.png")} style={{ cursor: "pointer" }} />
              <div className={styles.gameCardBody}>
                <h4>Word Guessing</h4>
                <p>One player describes, others guess. Quick thinking and clear communication unlock the word.</p>
              </div>
            </div>
            <div className={styles.gameCard}>
              <img src="/src/assets/brand/GameCodeGuessing.png" alt="Code Guessing" className={styles.gameImg} onClick={() => setLightboxImg("/src/assets/brand/GameCodeGuessing.png")} style={{ cursor: "pointer" }} />
              <div className={styles.gameCardBody}>
                <h4>Code Guessing</h4>
                <p>Patterns hide in plain sight. Crack the sequence through logical deduction and team discussion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Evaluation Section */}
        <section className={styles.section}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            AI-Powered Evaluation
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: "1.6" }}>
            Every game captures real behavioral signals — how you communicate, lead, and collaborate under pressure.
          </p>
          <div className={styles.evalRow}>
            <div className={styles.evalCard}>
              <img src="/src/assets/brand/TeamAssesment.png" alt="Team Assessment" className={styles.evalImg} onClick={() => setLightboxImg("/src/assets/brand/TeamAssesment.png")} style={{ cursor: "pointer" }} />
              <div className={styles.evalCardBody}>
                <h4>Team Report</h4>
                <p>Aggregated insights across the whole team. See how the group performed, who stepped up, and where collaboration thrived or struggled.</p>
              </div>
            </div>
            <div className={styles.evalCard}>
              <img src="/src/assets/brand/IndividualAssesment.png" alt="Individual Assessment" className={styles.evalImg} onClick={() => setLightboxImg("/src/assets/brand/IndividualAssesment.png")} style={{ cursor: "pointer" }} />
              <div className={styles.evalCardBody}>
                <h4>Individual Report</h4>
                <p>Personal breakdown of your communication, teamwork, problem-solving, and leadership. Clear scores backed by chat evidence.</p>
              </div>
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
              href="mailto:contact@teamlens.ai"
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
              <Mail /> contact@teamlens.ai
            </a>
          </div>
        </section>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        openRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        openLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* <JoinSessionModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      /> */}

      <JoinSessionModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        prefilledCode={searchParams.get("code") || ""}
      />

      {lightboxImg && (
        <div className={styles.lightbox} onClick={() => setLightboxImg(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
          <img src={lightboxImg} alt="" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}