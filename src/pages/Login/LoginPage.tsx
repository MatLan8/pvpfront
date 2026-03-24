import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";
import { useLoginUser } from "../../api/useLoginUser";

function LoginPage() {
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

          navigate("/"); // PAKEISTI KAI BUS HOME PAGE
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login</h1>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>

        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p className={styles.error} style={{ whiteSpace: "pre-line" }}>
            {error}
          </p>
        )}

        <p className={styles.footer}>
          Don’t have an account?{" "}
          <span className={styles.link} onClick={() => navigate("/register")}>
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
