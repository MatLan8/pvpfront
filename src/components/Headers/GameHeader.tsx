import styles from "./Header.module.css";
import Logo from "../../assets/logo.png";
type GameHeaderProps = {
    sessionCode: string;
};

export default function GameHeader({ sessionCode }: GameHeaderProps) {
    return (
        <header>
            <img src={Logo} alt="logo" width="70" height="70" className={styles.logoGame} />
            <h5 className={styles.name}>TeamLens </h5>
            <p className={styles.code}>Session: {sessionCode}</p>
        </header>
    );
}