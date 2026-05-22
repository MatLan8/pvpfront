import styles from "./GameHeader.module.css";
type GameHeaderProps = {
    sessionCode: string;
};

export default function GameHeader({ sessionCode }: GameHeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.brand}>
                <img src="/assets/brand/logo.png" alt="TeamLens Logo" className={styles.logo} />
                <span className={styles.name}>TeamLens</span>
            </div>
            <p className={styles.code}>Session: {sessionCode}</p>
        </header>
    );
}