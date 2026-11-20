import { useEffect, useState } from "react";
import "./LevelChoose.css";

const LEVELS = [
  { number: 1, icon: "🥕", title: "Beginner Farmer", description: "Carrots and first deliveries" },
  { number: 2, icon: "🍅", title: "Vegetable Garden", description: "Your next farming adventure" },
  { number: 3, icon: "🐔", title: "Animal Farm", description: "Care for farm animals" },
  { number: 4, icon: "🐄", title: "Happy Farm", description: "Grow your farm further" },
  { number: 5, icon: "🌻", title: "Master Farmer", description: "Build a thriving farm" },
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

// Props match the existing StartPage.jsx usage:
// <LevelChoose onBack={goToStart} onPlay={playLevelOne}
//   musicOn={musicOn} onToggleMusic={toggleMusic} />
export default function LevelChoose({ onBack, onPlay, musicOn, onToggleMusic }) {
  const [unlockedLevel, setUnlockedLevel] = useState(readUnlockedLevel);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // The component mounts each time the user returns from Level 1.
    setUnlockedLevel(readUnlockedLevel());
  }, []);

  function selectLevel(level) {
    if (level > unlockedLevel) return;

    if (level === 1) {
      onPlay?.();
      return;
    }

    // Level 2 is unlocked, but its game has not been created yet.
    setNotice(`🎉 Level ${level} is unlocked! Its gameplay will be added next.`);
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
                    {level.number === 1 ? "▶ PLAY" : "🔓 OPEN LEVEL"}
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
