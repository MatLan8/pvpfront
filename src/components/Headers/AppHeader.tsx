import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AppHeader.module.css";
import LoginModal from "../modals/LoginModal";
import RegisterModal from "../modals/RegisterModal";
import JoinSessionModal from "../modals/JoinSessionModal";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem("userId"),
  );
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUserId(localStorage.getItem("userId"));
    window.addEventListener("storage", sync);
    window.addEventListener("authchange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("authchange", sync);
    };
  }, []);

  const isLoggedIn = Boolean(userId);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    sessionStorage.removeItem("nickname");
    sessionStorage.removeItem("playerId");
    sessionStorage.removeItem("sessionCode");
    setUserId(null);
    window.dispatchEvent(new Event("authchange"));
    navigate("/");
  };

  const linkClass = (active: boolean) =>
    `${styles.navLink} ${active ? styles.navLinkActive : ""}`;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logoArea} onClick={() => navigate("/")}>
          <img
            src="/assets/brand/logo.png"
            alt="TeamLens Logo"
            className={styles.logoImg}
          />
          <span className={styles.logoText}>TeamLens</span>
        </div>

        <div className={styles.navCenter}>
          <button
            className={linkClass(false)}
            onClick={() => setIsJoinOpen(true)}
          >
            Join session
          </button>
        </div>

        <div className={styles.navRight}>
          {isLoggedIn ? (
            <>
              <button
                className={linkClass(location.pathname === "/start-session")}
                onClick={() => navigate("/start-session")}
              >
                Manage sessions
              </button>
              <button
                className={linkClass(location.pathname === "/buy")}
                onClick={() => navigate("/buy")}
              >
                Buy more credits
              </button>
              <button className={linkClass(false)} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className={linkClass(false)}
                onClick={() => setIsLoginOpen(true)}
              >
                Login
              </button>
              <button
                className={linkClass(false)}
                onClick={() => setIsRegisterOpen(true)}
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

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

      <JoinSessionModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </>
  );
}
