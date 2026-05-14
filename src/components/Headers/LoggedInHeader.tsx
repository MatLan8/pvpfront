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
            <img src={Logo} alt="logo" width="70" height="70" className={styles.logo} />
            <h5 className={styles.nameNoLine}>TeamLens </h5>
            <button className={styles.logoutBtn} onClick={handleLogout}>
                Logout
            </button>
        </header>
    );
}