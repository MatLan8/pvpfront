import { useState } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { useRegisterUser } from "../../api/useRegisterUser";
import styles from "./Modals.module.css";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  openLogin: () => void;
}

function RegisterModal({ isOpen, onClose, openLogin }: RegisterModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const userMutation = useRegisterUser();

  const handleRegister = () => {
    setError("");
    setSuccess("");

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !repeatPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsRegistering(true);

    userMutation.mutate(
      {
        Email: trimmedEmail,
        DisplayName: trimmedName,
        Password: password,
      },
      {
        onError: (err: any) => {
          const data = err?.response?.data;

          if (data?.errors) {
            const allErrors = Object.values(data.errors).flat();
            setError(allErrors.join("\n"));
          } else {
            setError(data?.error || "Registration failed");
          }

          setIsRegistering(false);
        },
        onSuccess: () => {
          setSuccess("Registration successful!");

          setDisplayName("");
          setEmail("");
          setPassword("");
          setRepeatPassword("");

          setIsRegistering(false);

          setTimeout(() => {
            // onClose();
            // navigate("/login");
            onClose();
            setTimeout(() => openLogin(), 0);
          }, 1200);
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={18} />
        </button>

        <h2 className={styles.title}>Register</h2>

        <div className={styles.field}>
          <label className={styles.label}>Display Name</label>
          <div className={styles.inputWrapper}>
            <User size={16} className={styles.icon} />
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} className={styles.icon} />
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} className={styles.icon} />
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Repeat Password</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} className={styles.icon} />
            <input
              type="password"
              className={styles.input}
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={isRegistering}
          className={styles.button}
        >
          {isRegistering ? "Registering..." : "Register"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <p className={styles.footer}>
          Already have an account?{" "}
          <span
            className={styles.link}
            onClick={() => {
              onClose();
              setTimeout(() => openLogin(), 0);
            }}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default RegisterModal;
