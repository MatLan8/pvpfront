import React, { useState, useEffect, UIEvent } from 'react';
import { 
  Gamepad2, MessageSquare, FileBarChart2, Mail, 
  Users, Brain, ShieldAlert 
} from "lucide-react";
import eulaText from './EULA_AI_RUST_VERSION.txt?raw';
import styles from './MainPage.module.css'; // Svarbiausia eilutė!

interface ConsentReplica {
  userId: string;
  agreementVersion: string;
  timestamp: string;
  aiDisclosureAccepted: boolean;
}

export default function JoinGameScreen() {
  const [showEula, setShowEula] = useState<boolean>(false);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);
  const [canAgree, setCanAgree] = useState<boolean>(false);

  useEffect(() => {
    const consent = document.cookie.split('; ').find(row => row.startsWith('_eu_ai_consent='));
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

  const handleAgree = async () => {
    const replica: ConsentReplica = {
      userId: "user_pending",
      agreementVersion: "2026.1-EU",
      timestamp: new Date().toISOString(),
      aiDisclosureAccepted: true,
    };

    try {
      console.log("Saugoma EULA Replica į DB...", replica);
      document.cookie = "_eu_ai_consent=true; max-age=15552000; path=/; SameSite=Strict";
      setShowEula(false);
      setHasAccepted(true);
    } catch (error) {
      alert("Klaida patvirtinant sutikimą.");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* 1. EULA MODALAS */}
      {showEula && (
        <div className={styles.modalOverlay}>
          <div className={styles.eulaCard}>
            <ShieldAlert size={48} color="#10b981" />
            <h2>Duomenų Naudojimo Sutikimas</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Versija: 2026.1-EU-AI-Act</p>
            
            <div className={styles.eulaScrollBox} onScroll={handleScroll}>
              <pre>{eulaText}</pre>
            </div>
            
            {!canAgree && (
              <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Nuslinkite tekstą iki apačios, kad patvirtintumėte
              </p>
            )}
            
            <button 
              className={styles.btnPrimary} 
              onClick={handleAgree}
              disabled={!canAgree}
            >
              Suprantu ir Sutinku
            </button>
          </div>
        </div>
      )}

      {/* 2. PAGRINDINIS PUSLAPIS */}
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
            <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Login</a>
            <button className={styles.btnSecondary}>Register</button>
          </div>
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Pamatykite komandos įgūdžius <span className={styles.textEmerald}>realiu laiku</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Dalyvaukite trumpuose komandiniuose žaidimuose, susirašinėkite ir akimirksniu gaukite DI analizę apie savo minkštuosius įgūdžius.
          </p>
          
          <button className={styles.btnPrimary} style={{ maxWidth: '300px' }}>
            START NOW
          </button>

          <div className={styles.heroSteps}>
            <div className={styles.stepItem}><Gamepad2 /> Join game</div>
            <div style={{width: '20px', height: '1px', background: '#34d399'}}></div>
            <div className={styles.stepItem}><MessageSquare /> Play & chat</div>
            <div style={{width: '20px', height: '1px', background: '#34d399'}}></div>
            <div className={styles.stepItem}><FileBarChart2 /> Get report</div>
          </div>
        </section>

        {/* Problem Section */}
        <section className={styles.section}>
          <div className={styles.grid2}>
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Minkštųjų įgūdžių matavimo iššūkis</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6' }}>
                Nors techninius įgūdžius išmatuoti lengva, minkštieji įgūdžiai dažnai lieka subjektyvūs. Mes tai keičiame pasitelkdami DI ir žaidimą.
              </p>
              
              <div className={styles.featureCard}>
                <Brain color="#34d399" />
                <h4>DI valdoma analizė</h4>
                <p>Analizuojame kalbinius ir elgsenos rodiklius realiu laiku.</p>
              </div>
              
              <div className={styles.featureCard}>
                <Users color="#34d399" />
                <h4>Įtraukianti patirtis</h4>
                <p>Jokių testų – tik interaktyvus komandinis bendradarbiavimas.</p>
              </div>
            </div>

            {/* Placeholder Image */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '24px', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Gamepad2 size={64} color="#34d399" opacity={0.5} />
              <p style={{ color: '#64748b', marginTop: '1rem' }}>Game Interface Preview</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={styles.section}>
          <div className={styles.contactBox}>
            <h2>Pasiruošę atskleisti komandos potencialą?</h2>
            <p style={{ color: '#94a3b8', margin: '1rem 0 2rem 0' }}>Turite klausimų? Susisiekime!</p>
            <a href="mailto:contact@teamskills.ai" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#34d399', fontSize: '1.2rem', textDecoration: 'none' }}>
              <Mail /> contact@teamskills.ai
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}