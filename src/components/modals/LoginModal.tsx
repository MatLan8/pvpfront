import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, Lock } from "lucide-react";
import { useLoginUser } from "../../api/useLoginUser";
import styles from "./Modals.module.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  openRegister: () => void;
}

function LoginModal({ isOpen, onClose, openRegister }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();
  const loginMutation = useLoginUser();

  const handleLogin = () => {
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("All fields are required.");
      return;
    }

    setIsLoggingIn(true);

    loginMutation.mutate(
      {
        Email: trimmedEmail,
        Password: password,
      },
      {
        onError: (err: any) => {
          const data = err?.response?.data;

          if (data?.errors) {
            const allErrors = Object.values(data.errors).flat();
            setError(allErrors.join("\n"));
          } else {
            setError(data?.error || "Login failed");
          }

          setIsLoggingIn(false);
        },

        onSuccess: (data) => {
          localStorage.setItem("userId", data.id);

          setIsLoggingIn(false);

          onClose();
          navigate("/start-session");
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

        <h2 className={styles.title}>Login</h2>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} className={styles.icon} />
            <input
              className={styles.input}
              type="email"
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
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
        </div>

        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Logging in..." : "Login"}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.footer}>
          Don’t have an account?{" "}
          <span
            className={styles.link}
            onClick={() => {
              onClose();
              setTimeout(() => openRegister(), 0);
            }}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginModal;
