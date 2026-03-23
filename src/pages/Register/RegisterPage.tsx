import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RegisterPage.module.css";
import { useRegisterUser } from "../../api/useRegisterUser.ts";

function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const navigate = useNavigate();

  const userMutation = useRegisterUser();

  // const handleRegister = async () => {
  //   setError("");
  //   setSuccess("");

  //   const trimmedName = displayName.trim();
  //   const trimmedEmail = email.trim();

  //   if (!trimmedName || !trimmedEmail || !password || !repeatPassword) {
  //     setError("All fields are required.");
  //     return;
  //   }

  //   if (password !== repeatPassword) {
  //     setError("Passwords do not match.");
  //     return;
  //   }

  //   try {
  //     setIsRegistering(true);

  //     userMutation.mutate(
  //       {
  //         Email: trimmedEmail,
  //         DisplayName: trimmedName,
  //         Password: password,
  //       },
  //       {
  //   onError: (err: any) => {
  //     setError(err?.response?.data?.error || "Registration failed");
  //   },
  //       {
  //         onSuccess: async () => {
  //           setSuccess("Registration successful! You can now log in.");

  //           // clear form
  //           setDisplayName("");
  //           setEmail("");
  //           setPassword("");
  //           setRepeatPassword("");

  //           // optional redirect after delay
  //           setTimeout(() => navigate("/login"), 1500);
  //         },
  //       },
  //     );
  //   } catch (err: any) {
  //     setError(
  //       err?.response?.data?.error ||
  //         err?.response?.data?.title ||
  //         err?.message ||
  //         "Registration failed.",
  //     );
  //   } finally {
  //     setIsRegistering(false);
  //   }
  // };

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
            setError(allErrors.join("\n")); // multiple lines
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

          setTimeout(() => navigate("/login"), 1500);
        },
      },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Register</h1>

        <div className={styles.field}>
          <label className={styles.label}>Display Name</label>
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

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

        <div className={styles.field}>
          <label className={styles.label}>Repeat Password</label>
          <input
            className={styles.input}
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="Repeat password"
          />
        </div>

        <button
          className={styles.button}
          onClick={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? "Registering..." : "Register"}
        </button>

        {/* {error && <p className={styles.error}>{error}</p>} */}
        {error && (
          <p className={styles.error} style={{ whiteSpace: "pre-line" }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ color: "green", marginTop: "16px" }}>{success}</p>
        )}

        <p className={styles.footer}>
          Already have an account?{" "}
          <span className={styles.link} onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
