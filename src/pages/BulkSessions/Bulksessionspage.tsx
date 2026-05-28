import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Headers/LoggedInHeader";
import styles from "./Bulksessionspage.module.css";
import { useStartSession } from "../../api/useStartSession";
import { useSendInvites } from "../../api/useSendInvites";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionSlot {
  id: string;
  emails: string[]; // up to 4
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunkIntoFours(emails: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += 4) {
    chunks.push(emails.slice(i, i + 4));
  }
  return chunks;
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EmailInput({
  index,
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  placeholder?: string;
}) {
  const invalid = value.trim() !== "" && !isValidEmail(value);
  return (
    <div
      className={`${styles.emailRow} ${invalid ? styles.emailRowInvalid : ""}`}
    >
      <span className={styles.emailIndex}>{index + 1}</span>
      <input
        type="email"
        className={styles.emailInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `player${index + 1}@example.com`}
      />
      {onRemove && (
        <button
          className={styles.removeBtn}
          onClick={onRemove}
          aria-label="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function SessionCard({
  slot,
  index,
  onChange,
  onRemove,
}: {
  slot: SessionSlot;
  index: number;
  onChange: (updated: SessionSlot) => void;
  onRemove: () => void;
}) {
  const updateEmail = (i: number, val: string) => {
    const emails = [...slot.emails];
    emails[i] = val;
    onChange({ ...slot, emails });
  };

  const addEmail = () => {
    if (slot.emails.length < 4) {
      onChange({ ...slot, emails: [...slot.emails, ""] });
    }
  };

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionCardHeader}>
        <span className={styles.sessionCardTitle}>
          <span className={styles.sessionCardNum}>{index + 1}</span>
          Session
        </span>
        <button
          className={styles.removeCardBtn}
          onClick={onRemove}
          aria-label="Remove session"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.emailList}>
        {slot.emails.map((email, i) => (
          <EmailInput
            key={i}
            index={i}
            value={email}
            onChange={(v) => updateEmail(i, v)}
            onRemove={
              slot.emails.length > 1
                ? () => {
                    const emails = slot.emails.filter((_, idx) => idx !== i);
                    onChange({ ...slot, emails });
                  }
                : undefined
            }
          />
        ))}
      </div>

      {slot.emails.length < 4 && (
        <button className={styles.addEmailBtn} onClick={addEmail}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M6.5 1v11M1 6.5h11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add player
        </button>
      )}
    </div>
  );
}

// ── Randomizer panel ───────────────────────────────────────────────────────

function RandomizerPanel({
  onApply,
}: {
  onApply: (slots: SessionSlot[]) => void;
}) {
  const [bulk, setBulk] = useState("");
  const [preview, setPreview] = useState<string[][] | null>(null);

  const emails = bulk
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  const validEmails = emails.filter(isValidEmail);
  const invalidCount = emails.length - validEmails.length;

  const handleRandomize = () => {
    const shuffled = shuffleArray(validEmails);
    setPreview(chunkIntoFours(shuffled));
  };

  const handleApply = () => {
    if (!preview) return;
    const slots: SessionSlot[] = preview.map((group) => ({
      id: generateId(),
      emails: group,
    }));
    onApply(slots);
    setPreview(null);
    setBulk("");
  };

  return (
    <div className={styles.randomizerPanel}>
      <div className={styles.randomizerHeader}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M2 5h14M2 9h10M2 13h6"
            stroke="#34d399"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M14 11l2 2-2 2"
            stroke="#34d399"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 13h-4"
            stroke="#34d399"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <h3 className={styles.randomizerTitle}>Auto-assign teams</h3>
      </div>
      <p className={styles.randomizerDesc}>
        Paste all player emails and we'll randomly split them into groups of 4.
      </p>

      <textarea
        className={styles.bulkTextarea}
        value={bulk}
        onChange={(e) => {
          setBulk(e.target.value);
          setPreview(null);
        }}
        placeholder={"alice@co.com\nbob@co.com\ncarol@co.com\n..."}
        rows={5}
      />

      <div className={styles.randomizerMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaDot} style={{ background: "#34d399" }} />
          {validEmails.length} valid
        </span>
        {invalidCount > 0 && (
          <span className={styles.metaItem}>
            <span
              className={styles.metaDot}
              style={{ background: "#f87171" }}
            />
            {invalidCount} invalid (will be skipped)
          </span>
        )}
        {validEmails.length > 0 && (
          <span className={styles.metaItem}>
            <span
              className={styles.metaDot}
              style={{ background: "#fbbf24" }}
            />
            → {Math.ceil(validEmails.length / 4)} session
            {Math.ceil(validEmails.length / 4) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className={styles.randomizerActions}>
        <button
          className={styles.randomizeBtn}
          onClick={handleRandomize}
          disabled={validEmails.length < 2}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M1 4h10M1 8h7M1 12h4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M11 6l2 2-2 2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 8H9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          Randomize
        </button>
      </div>

      {preview && (
        <div className={styles.previewSection}>
          <p className={styles.previewLabel}>
            Preview — {preview.length} session{preview.length !== 1 ? "s" : ""}
          </p>
          <div className={styles.previewGrid}>
            {preview.map((group, i) => (
              <div key={i} className={styles.previewCard}>
                <span className={styles.previewCardNum}>Session {i + 1}</span>
                {group.map((email, j) => (
                  <span key={j} className={styles.previewEmail}>
                    <span className={styles.previewAvatar}>
                      {email[0].toUpperCase()}
                    </span>
                    {email}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <button className={styles.applyBtn} onClick={handleApply}>
            Apply to sessions
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function BulkSessionsPage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SessionSlot[]>([
    { id: generateId(), emails: [""] },
    { id: generateId(), emails: [""] },
  ]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchProgress, setLaunchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const { mutateAsync: startSession } = useStartSession();
  const { mutateAsync: sendInvites } = useSendInvites();

  const userId = localStorage.getItem("userId");

  const addSession = () => {
    if (slots.length < 20) {
      setSlots((prev) => [...prev, { id: generateId(), emails: [""] }]);
    }
  };

  const removeSession = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSlot = useCallback((id: string, updated: SessionSlot) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const applyRandomized = (newSlots: SessionSlot[]) => {
    setSlots(newSlots);
    // scroll to sessions
    document
      .getElementById("sessions-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const allEmails = slots.flatMap((s) =>
    s.emails.filter((e) => e.trim() !== ""),
  );
  const validCount = allEmails.filter(isValidEmail).length;
  const canLaunch = slots.length > 0 && validCount > 0;

  // const handleLaunch = async () => {
  //   if (!userId) {
  //     setLaunchError("No user ID found. Please log in again.");
  //     return;
  //   }

  //   setIsLaunching(true);
  //   setLaunchError(null);
  //   setLaunchProgress({ done: 0, total: slots.length });

  //   try {
  //     for (let i = 0; i < slots.length; i++) {
  //       const slot = slots[i];

  //       // Start the session
  //       const { sessionCode } = await startSession({ LeaderId: userId });

  //       // Send invites only for valid emails in this slot
  //       const validEmails = slot.emails
  //         .map((e) => e.trim())
  //         .filter(isValidEmail);

  //       if (validEmails.length > 0) {
  //         await sendInvites({ sessionCode, emails: validEmails });
  //       }

  //       setLaunchProgress({ done: i + 1, total: slots.length });
  //     }

  //     setLaunched(true);
  //   } catch (err: any) {
  //     setLaunchError(
  //       err?.response?.data?.Error ?? err?.message ?? "Something went wrong. Please try again."
  //     );
  //   } finally {
  //     setIsLaunching(false);
  //   }
  // };

  const handleLaunch = async () => {
    if (!userId) {
      setLaunchError("No user ID found. Please log in again.");
      return;
    }

    console.log("Starting bulk launch...");
    console.log("User ID:", userId);

    setIsLaunching(true);
    setLaunchError(null);
    setLaunchProgress({ done: 0, total: slots.length });

    try {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];

        console.log("Launching slot:", slot);

        // START SESSION
        const response = await startSession({
          LeaderId: userId,
        });

        console.log("startSession response:", response);

        const sessionCode = response?.sessionCode;

        if (!sessionCode) {
          throw new Error("No sessionCode returned from API");
        }

        // VALID EMAILS
        const validEmails = slot.emails
          .map((e) => e.trim())
          .filter(isValidEmail);

        console.log("Valid emails:", validEmails);

        // SEND INVITES
        if (validEmails.length > 0) {
          const inviteResponse = await sendInvites({
            sessionCode,
            emails: validEmails,
          });

          console.log("Invite response:", inviteResponse);
        }

        setLaunchProgress({
          done: i + 1,
          total: slots.length,
        });
      }

      console.log("ALL SESSIONS CREATED");

      setLaunched(true);
    } catch (err: any) {
      console.error("Launch error:", err);

      setLaunchError(
        err?.response?.data?.Error ??
          err?.response?.data?.message ??
          err?.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.successState}>
          <div className={styles.successIcon}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <path
                d="M12 20l6 6 10-12"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className={styles.successTitle}>
            {slots.length} sessions launched
          </h2>
          <p className={styles.successDesc}>
            Invitations have been sent to {validCount} player
            {validCount !== 1 ? "s" : ""}. They'll receive an email with their
            session link.
          </p>
          <button
            className={styles.primaryAction}
            onClick={() => navigate("/start-session")}
          >
            Back to main page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <div className={styles.pageTitleBlock}>
          <h1 className={styles.pageTitle}>Bulk Sessions</h1>
          <p className={styles.pageSubtitle}>
            Create multiple game sessions and invite players all at once.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Left: randomizer ── */}
        <aside className={styles.sidebar}>
          <RandomizerPanel onApply={applyRandomized} />
        </aside>

        {/* ── Right: manual sessions ── */}
        <main className={styles.main} id="sessions-section">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Sessions
              <span className={styles.sessionCount}>{slots.length}</span>
            </h2>
            <button
              className={styles.addSessionBtn}
              onClick={addSession}
              disabled={slots.length >= 20}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M6.5 1v11M1 6.5h11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Add session
            </button>
          </div>

          <div className={styles.sessionsGrid}>
            {slots.map((slot, i) => (
              <SessionCard
                key={slot.id}
                slot={slot}
                index={i}
                onChange={(updated) => updateSlot(slot.id, updated)}
                onRemove={() => removeSession(slot.id)}
              />
            ))}
          </div>

          {/* ── Launch bar ── */}
          <div className={styles.launchBar}>
            <div className={styles.launchBarLeft}>
              <div className={styles.launchMeta}>
                <span className={styles.launchStat}>
                  <strong>{slots.length}</strong> session
                  {slots.length !== 1 ? "s" : ""}
                </span>
                <span className={styles.launchDivider}>·</span>
                <span className={styles.launchStat}>
                  <strong>{validCount}</strong> invite
                  {validCount !== 1 ? "s" : ""} will be sent
                </span>
              </div>

              {/* Progress bar while launching */}
              {isLaunching && launchProgress && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${(launchProgress.done / launchProgress.total) * 100}%`,
                    }}
                  />
                  <span className={styles.progressLabel}>
                    {launchProgress.done} / {launchProgress.total} sessions
                    started
                  </span>
                </div>
              )}

              {/* Error message */}
              {launchError && (
                <p className={styles.launchError}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="6"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M7 4v3.5M7 9.5v.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  {launchError}
                </p>
              )}
            </div>

            <button
              className={styles.primaryAction}
              onClick={handleLaunch}
              disabled={!canLaunch || isLaunching}
            >
              {isLaunching ? (
                <>
                  <span className={styles.spinner} />
                  Launching…
                </>
              ) : (
                <>Launch all sessions</>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
