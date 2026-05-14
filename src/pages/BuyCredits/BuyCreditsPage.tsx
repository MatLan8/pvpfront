import styles from "./BuyCreditsPage.module.css";
import Header from "../../components/Headers/LoggedInHeader";
import { useGetUser } from "../../api/useGetUser";
import { useState } from "react";
import { useAddCredits } from "../../api/useAddCredits";
import { useQueryClient } from "@tanstack/react-query";


function BuyCredits() {
    const userId = localStorage.getItem("userId");
    if (userId === null) {
        return <div className={styles.error}>No user ID found.</div>;
    }

    const { data: user, isLoading, error } = useGetUser(userId);


    const [credits, setCredits] = useState(1);

    const [success, setSuccess] = useState(false);
    const queryClient = useQueryClient();
    const { mutate: addCredits } = useAddCredits(userId, {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", userId] });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        }
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>{error.message}</div>;
    if (!user) {
        return <div className={styles.error}>User not found.</div>;
    }

    return (
        <div className={styles.page}>
            <Header />
            <a href="/start-session" className={styles.arrow}>⬅</a>
            <h2>Buy more credits!</h2>
            <p>Now You have <strong>{user.remainingCredits} remaining</strong>  game sessions.  </p>
            <p>One game session allows 4 people to participate in the game.</p>
            <p>Choose the amount of sessions you want to buy:</p>


            <div>
                <input id="slider"
                    type="range" min="1" max="400"
                    className={styles.range}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                />
            </div>
            <p>
                <input type="number"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    onKeyDown={(e) => {
                        if (e.key === ".")
                            e.preventDefault();
                    }}
                    min="1"
                    step="1"
                    className={styles.inputNumber} />
                sessions</p>

            <p className={styles.price}>Price: {Math.round(credits * 14.99 * 100) / 100} €</p>
            <button className={styles.buyButton}
                onClick={() => addCredits({ Credits: credits })}>
                Buy
            </button>
            {success && <p className={styles.success}>Credits added!</p>}

        </div>
    );
}

export default BuyCredits;