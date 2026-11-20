
import "./LevelRules.css";

const RULES = [
  {
    icon: "⏰",
    text: "Complete Level 1 within 60 seconds. The countdown starts when you press START GAME.",
  },
  {
    icon: "🌱",
    text: "Start with 5 free carrot seeds and 0 Coins. Click PLANT to use one seed. The farmer walks there automatically.",
  },
  {
    icon: "🪣",
    text: "5 seconds after planting, a water bucket appears. Click it within the next 5 seconds!",
  },
  {
    icon: "🌿",
    text: "After watering, wait 7 seconds for the carrot to grow, then click HARVEST.",
  },
  {
    icon: "🥀",
    text: "If a plant dies, click CLEAR to remove it for −2 Coins. The farmer says 'Oops!'",
  },
  {
    icon: "🚚",
    text: "Harvested carrots go into the delivery truck. It can hold up to 6 carrots.",
  },
  {
    icon: "🥕",
    text: "Press GO with even 1 carrot. The truck drives right to left, then you earn 30 Coins per delivered carrot.",
  },
  {
    icon: "🛒",
    text: "When your seeds reach 0, you cannot plant. Buy seeds manually at Farmer's Shop for 10 Coins each; there is no auto-buy.",
  },
  {
    icon: "🎯",
    text: "Harvest at least 5 carrots and earn at least 150 delivery Coins before time ends. You can earn more!",
  },
  {
    icon: "⏸️",
    text: "PAUSE freezes the timer, plant growth, farmer walking, and deliveries. RESTART starts a fresh round.",
  },
  {
    icon: "🔔",
    text: "During the last 10 seconds, the clock plays warning ticks.",
  },
  {
    icon: "🏆",
    text: "At 00:00, meeting both goals earns 50 bonus Coins and unlocks Level 2. Otherwise it's Game Over.",
  },
];

export default function LevelRules({
  onFinish,
  onBack,
}) {
  return (
    <main className="lr-screen">

      <div className="lr-shade" />

      <button
        type="button"
        className="lr-back"
        onClick={onBack}
      >
        ← BACK TO LEVELS
      </button>

      <section className="lr-card">

        <div className="lr-kicker">
          🌱 LEVEL 1 — BEGINNER FARMER
        </div>

        <h1>📜 How to Play</h1>

        <div className="lr-intro">
          <img
            src="/farmer-character.png"
            alt="Farmer"
          />

          <p>
            Hello, Farmer! Complete
            these missions to unlock
            the next level!
          </p>
        </div>

        <div className="lr-rules">
          {RULES.map((rule, index) => (
            <div
              className="lr-rule"
              key={index}
            >
              <span aria-hidden="true">
                {rule.icon}
              </span>

              <p>{rule.text}</p>
            </div>
          ))}
        </div>

        {/* NO RULES COUNTDOWN */}

        <button
          type="button"
          className="lr-start"
          onClick={onFinish}
        >
          ▶ START GAME
        </button>

      </section>
    </main>
  );
}
