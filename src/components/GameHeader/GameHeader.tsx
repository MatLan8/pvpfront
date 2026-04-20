import styles from "./GameHeader.module.css";
type GameHeaderProps = {
    sessionCode: string;
};

export default function GameHeader({ sessionCode }: GameHeaderProps) {
    return (
        <header>
            <h5 className={styles.name}>TeamLens </h5>
            <p className={styles.code}>Session: {sessionCode}</p>
        </header>
    );
}