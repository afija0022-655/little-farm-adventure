import "./Level2Rules.css";

const RULES = [
  { icon: "⏰", title: "2 minutes 30 seconds", text: "Press START GAME to begin the 02:30 round. The rules screen has no countdown." },
  { icon: "🌱", title: "8 planting plots", text: "Choose CARROT or ONION first, then click an empty plot. The farmer goes to the crop area, not into the chicken fence." },
  { icon: "🥕", title: "Carrot seeds", text: "You start with 5 carrot seeds. Carrots sell for 30 Coins each after delivery." },
  { icon: "🧅", title: "Onion seeds", text: "You start with 3 onion seeds. Onions sell for 35 Coins each after delivery." },
  { icon: "🛒", title: "Buy more seeds manually", text: "Carrot seed: 10 Coins. Onion seed: 20 Coins. When you have 0 seeds, buy from the shop before planting." },
  { icon: "🪣", title: "Water your crops", text: "A bucket appears 5 seconds after planting. Water within the next 5 seconds, or the plant dies. Click CLEAR for −2 Coins." },
  { icon: "🌿", title: "Wait for harvest", text: "After watering: carrots grow in 6 seconds, onions in 8 seconds. Click HARVEST when ready." },
  { icon: "🐔", title: "Two moving chickens", text: "Chickens wander inside the wooden fence and ask for water at different times. They stop moving while thirsty." },
  { icon: "💧", title: "Chicken water deadline", text: "Click a chicken's bucket within 10 seconds. Only then does the farmer enter the pen to give water. A chicken dies if you miss the deadline." },
  { icon: "🥚", title: "Collect eggs from the grass", text: "10 seconds after a chicken drinks water, an egg appears on the grass. Click COLLECT EGG to send the farmer into the pen and load it into the truck." },
  { icon: "🚚", title: "Delivery truck", text: "Carry up to 10 mixed products. Press GO to deliver and earn Coins. Eggs sell for 40 Coins each." },
  { icon: "🎯", title: "Your mission", text: "Harvest at least 5 carrots and 3 onions, and earn at least 200 Delivery Coins before 00:00. You can earn more!" },
  { icon: "🏆", title: "Win and unlock", text: "Meet all three targets to earn the 50-Coin completion bonus and unlock Level 3." },
];

export default function Level2Rules({ onFinish, onBack }) {
  return (
    <main className="l2r-screen">
      <div className="l2r-shade" aria-hidden="true" />
      <section className="l2r-card">
        <div className="l2r-eyebrow">🌻 LEVEL 2 — VEGETABLE & CHICKEN FARM</div>
        <h1>📜 How to Play</h1>
        <p className="l2r-intro">Grow carrots and onions, care for your chickens, collect eggs, and make your deliveries!</p>
        <div className="l2r-rules">
          {RULES.map((rule) => (
            <div className="l2r-rule" key={rule.title}>
              <span className="l2r-emoji" aria-hidden="true">{rule.icon}</span>
              <div><strong>{rule.title}</strong><p>{rule.text}</p></div>
            </div>
          ))}
        </div>
        <div className="l2r-actions">
          <button type="button" className="l2r-back" onClick={onBack}>← LEVEL SELECTION</button>
          <button type="button" className="l2r-start" onClick={onFinish}>▶ START LEVEL 2</button>
        </div>
      </section>
    </main>
  );
}
