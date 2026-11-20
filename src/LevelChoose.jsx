
import "./LevelChoose.css";

const levels = [
  { id: 1, name: "Beginner Farmer", icon: "🥕" },
  { id: 2, name: "Vegetable Garden", icon: "🍅" },
  { id: 3, name: "Animal Farm", icon: "🐔" },
  { id: 4, name: "Happy Farm", icon: "🐄" },
  { id: 5, name: "Master Farmer", icon: "🌾" },
  { id: 6, name: "Golden Harvest", icon: "🏆" },
];

export default function LevelChoose({
  onBack,
  onPlay,
  musicOn,
  onToggleMusic,
}) {
  return (
    <main className="level-page">
      <div className="level-background-overlay" />

      {/* TOP BUTTONS */}
      <header className="level-topbar">
        <button
          className="level-back-btn"
          onClick={onBack}
          type="button"
        >
          ← BACK
        </button>

        <button
          className="level-music-btn"
          onClick={onToggleMusic}
          aria-pressed={musicOn}
          type="button"
        >
          {musicOn ? "🔊 Music ON" : "🔇 Music OFF"}
        </button>
      </header>

      {/* HEADING */}
      <section className="level-container">
        <div className="level-heading">
          <span>🌻 LITTLE FARM ADVENTURE 🌻</span>

          <h1>Choose Your Level</h1>

          <p>
            Complete each level to unlock
            your next farming adventure!
          </p>
        </div>

        {/* SIX LEVEL CARDS */}
        <div className="level-card-grid">
          {levels.map((level) => {
            const unlocked = level.id === 1;

            return (
              <div
                key={level.id}
                className={`level-card ${
                  unlocked ? "level-open" : "level-locked"
                }`}
              >
                <div className="level-card-icon">
                  {unlocked ? level.icon : "🔒"}
                </div>

                <span className="level-card-number">
                  LEVEL {level.id}
                </span>

                <h2>{level.name}</h2>

                {unlocked ? (
                  <button
                    type="button"
                    className="level-play-btn"
                    onClick={onPlay}
                  >
                    ▶ PLAY
                  </button>
                ) : (
                  <button
                    type="button"
                    className="level-lock-btn"
                    disabled
                  >
                    🔒 LOCKED
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
