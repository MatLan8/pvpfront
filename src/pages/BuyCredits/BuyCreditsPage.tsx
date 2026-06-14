import styles from "./BuyCreditsPage.module.css";
import Header from "../../components/Headers/AppHeader";
import { useGetUser } from "../../api/useGetUser";
import { useState } from "react";
import { useCreateCheckoutSession } from "../../api/useCreateCheckoutSession";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function BuyCredits() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [credits, setCredits] = useState(1);

  const { mutate: startCheckout, isPending: isCheckoutLoading } =
    useCreateCheckoutSession();

  const { data: user, isLoading, error } = useGetUser(userId ?? "");

  const handleCreditsChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setCredits(Math.min(400, Math.max(1, Math.round(value))));
  };

  const handleBuy = () => {
    if (!userId) return;
    startCheckout(
      { userId, credits },
      {
        onSuccess: (checkoutUrl) => {
          window.location.href = checkoutUrl;
        },
        onError: () => {
          toast.error("Could not start payment. Please try again.");
        },
      },
    );
  };

  const price = Math.round(credits * 14.99 * 100) / 100;

  if (userId === null) {
    return <div className={styles.error}>No user ID found.</div>;
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.content}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className={styles.error}>{error.message}</div>;

  if (!user) {
    return <div className={styles.error}>User not found.</div>;
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.content}>
        <div className={styles.card}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/start-session")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>

          <h1 className={styles.title}>Buy more credits</h1>

          <div className={styles.balance}>
            <span className={styles.balanceLabel}>Current balance</span>
            <div className={styles.balanceRow}>
              <span className={styles.balanceValue}>{user.remainingCredits}</span>
              <span className={styles.balanceUnit}>
                {user.remainingCredits === 1 ? "session" : "sessions"} remaining
              </span>
            </div>
          </div>

          <p className={styles.description}>
            One game session allows 4 people to participate in the game.
          </p>

          <div className={styles.sliderSection}>
            <label className={styles.sliderLabel} htmlFor="credits-slider">
              Choose the amount of sessions you want to buy
            </label>

            <input
              id="credits-slider"
              type="range"
              min="1"
              max="400"
              className={styles.range}
              value={credits}
              onChange={(e) => handleCreditsChange(Number(e.target.value))}
            />

            <div className={styles.amountRow}>
              <input
                type="number"
                value={credits}
                onChange={(e) => handleCreditsChange(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === ".") e.preventDefault();
                }}
                min="1"
                max="400"
                step="1"
                className={styles.inputNumber}
                aria-label="Number of sessions"
              />
              <span className={styles.amountUnit}>sessions</span>
            </div>
          </div>

          <div className={styles.footer}>
            <p className={styles.price}>
              Total: <strong>{price} €</strong>
            </p>

            <button
              type="button"
              className={styles.buyButton}
              onClick={handleBuy}
              disabled={isCheckoutLoading}
            >
              {isCheckoutLoading ? "Redirecting…" : "Buy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuyCredits;
