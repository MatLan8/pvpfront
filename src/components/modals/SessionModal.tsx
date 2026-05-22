import { useState } from "react";
import { X, Mail, Copy, Link2 } from "lucide-react";
import styles from "./Modals.module.css";
import { useSendInvites } from "../../api/useSendInvites";
import QRCode from "react-qr-code";

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string | null;
  onJoin: () => void;
  // isExistingSession?: boolean;
}

function SessionModal({
  isOpen,
  onClose,
  sessionCode,
  onJoin,
  // isExistingSession = false,
}: SessionModalProps) {
  const [emails, setEmails] = useState("");
  const [copied, setCopied] = useState(false);

  const [showQr, setShowQr] = useState(false);

  const inviteLink = `${window.location.origin}/?join=true&code=${sessionCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendInvitesMutation = useSendInvites();

  if (!isOpen || !sessionCode) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendEmails = () => {
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const emailList = emails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => isValidEmail(e));

    if (emailList.length === 0) {
      alert("Please enter valid email(s)");
      return;
    }

    sendInvitesMutation.mutate(
      {
        sessionCode,
        emails: emailList,
      },
      {
        onSuccess: () => {
          setEmails("");
          alert("Invites sent!");
        },
        onError: () => {
          alert("Failed to send invites");
        },
      },
    );
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

        <h2 className={styles.title}>Game Session</h2>

        {/* <div className={styles.codeBox}>
          <span className={styles.codeText}>{sessionCode}</span>

          <button className={styles.copyIcon} onClick={handleCopy}>
            <Copy size={16} />
          </button>
        </div> */}
        <div className={styles.codeBox}>
          <span className={styles.codeText}>{sessionCode}</span>

          {/* <div className={styles.codeActions}>
            <button className={styles.copyIcon} onClick={handleCopy}>
              <Copy size={16} />
            </button>

            <button className={styles.copyIcon} onClick={handleCopyLink}>
              <Link2 size={16} />
            </button>
          </div> */}
          <div className={styles.codeActions}>
            <button
              className={styles.copyIcon}
              onClick={handleCopy}
              title="Copy session code"
            >
              <Copy size={16} />
            </button>

            <button
              className={styles.copyIcon}
              onClick={handleCopyLink}
              title="Copy join link"
            >
              <Link2 size={16} />
            </button>
          </div>
        </div>

        {copied && <p className={styles.success}>Copied!</p>}

        <div className={styles.qrSection}>
          <button
            className={styles.qrPreviewButton}
            onClick={() => setShowQr(true)}
          >
            <QRCode
              value={inviteLink}
              size={72}
              bgColor="transparent"
              fgColor="#34d399"
            />
          </button>

          <p className={styles.qrHint}>Click to enlarge</p>
        </div>

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

        {/* <button className={styles.button} onClick={handleSendEmails}>
          Send Invites
        </button> */}
        <button
          className={styles.button}
          onClick={handleSendEmails}
          disabled={sendInvitesMutation.isPending}
        >
          {sendInvitesMutation.isPending ? "Sending..." : "Send Invites"}
        </button>

        <button className={styles.button} onClick={onJoin}>
          Join Game
        </button>
      </div>

      {showQr && (
        <div className={styles.qrOverlay} onClick={() => setShowQr(false)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <QRCode
              value={inviteLink}
              size={260}
              bgColor="transparent"
              fgColor="#34d399"
            />

            <p className={styles.qrText}>Scan to join session</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionModal;
