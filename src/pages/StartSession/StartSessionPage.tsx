import styles from "./StartSessionPage.module.css";
import { useGetUser } from "../../api/useGetUser";


function StartSession() {
    const userId = localStorage.getItem("userId");
    if (userId === null) {
        return <div className={styles.error}>No user ID found.</div>
    }


    const { data: user, isLoading, error } = useGetUser(userId);

    if (isLoading) return <div>Loading...</div>;
    <p>alio</p>
    if (error) return <div>{error.message}</div>;
    if (!user) {
        return <div className={styles.error}>User not found.</div>
    }

    return (
        <div className={styles.page}>
            <div>
                <p>Name: {user.displayName}</p>
            </div>
            <hr></hr>
            <div>
                <p>Credits: {user.remainingCredits}</p>
            </div>
            
        </div>
    );

}

export default StartSession;