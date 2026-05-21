import styles from "./Header.module.css";
import Logo from "../../assets/logo.png";
import { useNavigate } from "react-router-dom";
type GameHeaderProps = {
  sessionCode: string;
};

export default function GameHeader({ sessionCode }: GameHeaderProps) {
  const navigate = useNavigate();
  return (
    <header>
      <div className={styles.logoContainer} onClick={() => navigate("/")}>
        <img
          src={Logo}
          alt="logo"
          width="70"
          height="70"
          className={styles.logoGame}
        />
        <h5 className={styles.name}>TeamLens </h5>
      </div>

      <p className={styles.code}>Session: {sessionCode}</p>
    </header>
  );
}
