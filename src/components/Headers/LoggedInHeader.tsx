import styles from "./Header.module.css";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/logo.png";

export default function GameHeader() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("userId");
    sessionStorage.removeItem("nickname");
    sessionStorage.removeItem("playerId");
    sessionStorage.removeItem("sessionCode");
    navigate("/");
  };

  return (
    <header>
      <div className={styles.logoContainer} onClick={() => navigate("/")}>
        <img
          src={Logo}
          alt="logo"
          width="70"
          height="70"
          className={styles.logo}
        />
        <h5 className={styles.nameNoLine}>TeamLens</h5>
      </div>

      <div className={styles.headerActions}>
        <button className={styles.creditsBtn} onClick={() => navigate("/buy")}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="7.5"
              cy="7.5"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M7.5 4v7M5 6.5c0-1.38 1.12-2.5 2.5-2.5S10 5.12 10 6.5 8.88 9 7.5 9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          Buy more credits
        </button>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-2.5L10 5M13 7.5H6"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
