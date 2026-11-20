
import { useEffect, useRef, useState } from "react";
import "./LevelRules.css";

export default function LevelRules({ onFinish, onBack }) {
  const [countdown, setCountdown] = useState(10);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timeout = setTimeout(() => {
      finishRef.current();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="rules-page">
      <div className="rules-overlay" />

      <button
        className="rules-back"
        type="button"
        onClick={onBack}
      >
        ← BACK
      </button>

      <section className="rules-card">
        <div className="rules-badge">
          🌱 LEVEL 1 — BEGINNER FARMER
        </div>

        <h1>📜 How to Play</h1>

        <div className="rules-farmer">👩‍🌾</div>

        <div className="rules-dialogue">
          Hello, Farmer! Welcome to your first farming
          adventure. Complete these missions to unlock
          the next level!
        </div>

        <div className="rules-list">
          <div>🌱 Plant 5 carrots in your farm.</div>
          <div>💧 Water the seeds and wait for them to grow.</div>
          <div>🥕 Harvest at least 5 carrots.</div>
          <div>🪙 Earn 150 coins by harvesting crops.</div>
          <div>🛒 Buy more seeds from the shop if needed.</div>
        </div>

        <div className="rules-countdown">
          <p>🌻 Your adventure starts in</p>
          <span>{countdown}</span>
          <p>seconds</p>
        </div>

        <div className="rules-progress">
          <div
            className="rules-progress-fill"
            style={{
              width: `${(10 - countdown) * 10}%`,
            }}
          />
        </div>

        <p className="rules-wait">
          Get ready, little farmer! 🌾
        </p>
      </section>
    </main>
  );
}
