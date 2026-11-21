import { useEffect, useState } from "react";
import "./LevelChoose.css";

const LEVELS = [
  { number: 1, icon: "🥕", title: "Beginner Farmer", description: "Carrots and first deliveries" },
  { number: 2, icon: "🧅", title: "Vegetable & Chicken Farm", description: "Carrot, onion, chickens and eggs" },
  { number: 3, icon: "🐄", title: "Animal Farm", description: "Cows, milk, eggs and rabbits" },
  { number: 4, icon: "🐄", title: "Happy Farm", description: "5 minutes • 800 delivery Coins" },
  { number: 5, icon: "🌻", title: "Master Farmer", description: "5 minutes • 1000 delivery Coins" },
  { number: 6, icon: "🏆", title: "Farm Legend", description: "The final adventure" },
];

function readUnlockedLevel() {
  try {
    const n = Number(localStorage.getItem("littleFarmUnlockedLevel") || "1");
    return Math.min(6, Math.max(1, Number.isFinite(n) ? n : 1));
  } catch {
    return 1;
  }
}

export default function LevelChoose({ onBack, onPlay, onPlayLevel, musicOn, onToggleMusic }) {
  const [unlockedLevel, setUnlockedLevel] = useState(readUnlockedLevel);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setUnlockedLevel(readUnlockedLevel());
  }, []);

  function selectLevel(level) {
    if (level > unlockedLevel) return;
    if (level === 1) { onPlay?.(); return; }
    if (level >= 2 && level <= 5) {
      if (onPlayLevel) onPlayLevel(level);
      else setNotice(`Level ${level} is unlocked, but navigation is not connected.`);
      return;
    }
    setNotice("🏆 Level 6 gameplay is coming soon!");
  }

  return (
    <main className="lc-screen">
      <div className="lc-shade" />
      <header className="lc-toolbar">
        <button type="button" className="lc-back" onClick={onBack}>← BACK TO START</button>
        <button type="button" className="lc-music" onClick={onToggleMusic} aria-label="Toggle music">
          {musicOn ? "🔊 MUSIC ON" : "🔇 MUSIC OFF"}
        </button>
      </header>
      <section className="lc-content">
        <div className="lc-kicker">🌟 Your adventure begins</div>
        <h1>Choose a Level</h1>
        <p className="lc-subtitle">Complete a level to unlock the next one!</p>
        <div className="lc-level-grid">
          {LEVELS.map((level) => {
            const locked = level.number > unlockedLevel;
            const done = level.number < unlockedLevel;
            return (
              <article className={`lc-level-card ${locked ? "lc-locked" : "lc-unlocked"}`} key={level.number}>
                <span className="lc-level-icon" aria-hidden="true">{locked ? "🔒" : level.icon}</span>
                <small>LEVEL {level.number}</small>
                <h2>{level.title}</h2>
                <p>{level.description}</p>
                {locked ? (
                  <div className="lc-level-button lc-disabled">🔒 LOCKED</div>
                ) : (
                  <button type="button" className="lc-level-button" onClick={() => selectLevel(level.number)}>
                    {level.number <= 5 ? "▶ PLAY" : "🔓 OPEN LEVEL"}
                  </button>
                )}
                {done && <span className="lc-cleared">✅ CLEARED</span>}
              </article>
            );
          })}
        </div>
        {notice && <div className="lc-notice" role="status">{notice}</div>}
      </section>
    </main>
  );
}
