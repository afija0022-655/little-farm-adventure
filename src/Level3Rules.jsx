import "./Level3Rules.css";

const RULES = [
  { icon: "⏰", title: "2 minutes 30 seconds", text: "Press START LEVEL 3 whenever you are ready. There is no countdown on this rules page." },
  { icon: "🎯", title: "Four product goals — NO coin requirement", text: "Harvest 10 carrots, harvest 10 onions, collect 4 eggs and collect 3 milk packets within 02:30." },
  { icon: "🌱", title: "Choose carrot or onion seed", text: "You begin with 10 carrot and 10 onion seeds. Select the seed first, then click a PLANT plot. More seeds must be bought manually." },
  { icon: "🪣", title: "Water the crops", text: "5 seconds after planting, a bucket appears. Click within 5 seconds or the plant dies. Clear dead plants for −2 Coins." },
  { icon: "🥕", title: "Grow and harvest", text: "After watering, carrots need 6 seconds to grow and onions need 8 seconds. Click HARVEST when ready." },
  { icon: "🐔", title: "Two chickens and their eggs", text: "Chickens wander in the bottom-left pen. Click the bucket within 10 seconds when they need water. After drinking they lay an egg on the grass in 10 seconds. Click it to collect." },
  { icon: "🐄", title: "Two cows in the barn's old location", text: "Cows wander only inside the upper-right fence. They request water after about 15 seconds. Click the bucket within 10 seconds." },
  { icon: "🥛", title: "Collect milk", text: "A cow drops a MILK PACKET on the grass exactly 20 seconds after receiving water. Click the packet to collect. Each delivered packet earns 80 Coins." },
  { icon: "🐇", title: "Shoo away rabbits", text: "A rabbit appears ONLY when at least one carrot is HARVEST READY (subject to a gap between visits). It peeks from the RIGHT for 5 seconds, then runs right to left toward a READY carrot. At the carrot, a RED flashing warning and alarm sound play for 5 seconds (no text label). Click it to save the carrot. After you scare it away, it cannot return for 15 seconds, and even then only if a carrot is ready. Otherwise the plot becomes DEAD and must be CLEARED." },
  { icon: "🚚", title: "Delivery truck", text: "Truck holds 10 mixed products. Hover your mouse over the truck to see the number of each product currently loaded. Press GO to deliver if you need Coins for seeds. Prices: carrot 30, onion 35, egg 40, milk 80 Coins." },
  { icon: "🏆", title: "Complete Level 3", text: "Finish all four product goals by 00:00 to win 50 bonus Coins and unlock Level 4. You do NOT need to meet a money target." },
];

export default function Level3Rules({ onFinish, onBack }) {
  return (
    <main className="l3r-screen">
      <div className="l3r-shade" aria-hidden="true" />
      <section className="l3r-card">
        <div className="l3r-eyebrow">🌻 LEVEL 3 — ANIMAL FARM</div>
        <h1>📜 How to Play</h1>
        <p className="l3r-intro">Grow vegetables, collect eggs and milk, care for cows and chickens, and chase away rabbits!</p>
        <div className="l3r-rules">
          {RULES.map((rule) => (
            <div className="l3r-rule" key={rule.title}>
              <span className="l3r-emoji" aria-hidden="true">{rule.icon}</span>
              <div><strong>{rule.title}</strong><p>{rule.text}</p></div>
            </div>
          ))}
        </div>
        <div className="l3r-actions">
          <button type="button" className="l3r-back" onClick={onBack}>← LEVEL SELECTION</button>
          <button type="button" className="l3r-start" onClick={onFinish}>▶ START LEVEL 3</button>
        </div>
      </section>
    </main>
  );
}
