import { useState } from "react";
import { X, Mail, Copy } from "lucide-react";
import styles from "./Modals.module.css";

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string | null;
  onJoin: () => void;
}

function SessionModal({
  isOpen,
  onClose,
  sessionCode,
  onJoin,
}: SessionModalProps) {
  const [emails, setEmails] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sessionCode) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendEmails = () => {
    const emailList = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    console.log("Send invites to:", emailList, "with code:", sessionCode);
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={18} />
        </button>

        <h2 className={styles.title}>Session Created</h2>

        {/* 🔥 CODE DISPLAY (not input anymore) */}
        <div className={styles.codeBox}>
          <span className={styles.codeText}>{sessionCode}</span>

          <button className={styles.copyIcon} onClick={handleCopy}>
            <Copy size={16} />
          </button>
        </div>

        {copied && <p className={styles.success}>Copied!</p>}

        {/* EMAIL INPUT */}
        <div className={styles.field}>
          <label className={styles.label}>Invite by Email</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} className={styles.icon} />
            <input
              className={styles.input}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter emails separated by commas"
            />
          </div>
        </div>

        <button className={styles.button} onClick={handleSendEmails}>
          Send Invites
        </button>

        {/* CLEAN JOIN BUTTON */}
        <button className={styles.button} onClick={onJoin}>
          Join Game
        </button>
      </div>
    </div>
  );
}

export default SessionModal;
