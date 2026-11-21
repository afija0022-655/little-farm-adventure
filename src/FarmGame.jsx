import { useEffect, useRef, useState } from "react";
import "./FarmGame.css";

// LEVEL 1 RULES
const LEVEL_SECONDS = 60;
const REQUIRED_CARROTS = 5;
const REQUIRED_INCOME = 150;
const COINS_PER_CARROT = 30;
const SEED_PRICE = 10;
const TRUCK_CAPACITY = 6;
const COMPLETION_BONUS = 50;

const WATER_REQUEST_AFTER = 5000;
const WATER_CHANCE = 5000;
const GROW_TIME = 7000;
const WALK_STEP = 230;
const DELIVERY_TIME = 2800;
const COLS = 7;
const ROWS = 5;

const SOIL = [
  { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
  { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
];

const INITIAL_STATS = {
  coins: 0,
  seeds: 5,
  planted: 0,
  harvested: 0,
  earned: 0,
};
const INITIAL_FARMER = { x: 4, y: 3, direction: "left" };
const newPlots = () => SOIL.map(() => ({ stage: "empty", deadline: 0 }));

function isSoil(x, y) {
  return SOIL.some((plot) => plot.x === x && plot.y === y);
}

// The farmer walks around the plots instead of walking over crops.
function findPath(start, target) {
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const visited = new Set([`${start.x},${start.y}`]);
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (Math.abs(current.x - target.x) + Math.abs(current.y - target.y) === 1) {
      return current.path;
    }

    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS || isSoil(x, y) || visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({ x, y, path: [...current.path, { x, y }] });
    }
  }
  return null;
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function FarmGame({ onNextLevel, onExit }) {
  const [plots, setPlots] = useState(newPlots);
  const plotsRef = useRef(plots);
  const [stats, setStats] = useState({ ...INITIAL_STATS });
  const statsRef = useRef({ ...INITIAL_STATS });
  const [farmer, setFarmer] = useState({ ...INITIAL_FARMER });
  const farmerRef = useRef({ ...INITIAL_FARMER });
  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);
  const [cargo, setCargo] = useState(0);
  const cargoRef = useRef(0);
  const [driving, setDriving] = useState(false);
  const drivingRef = useRef(false);
  const [speech, setSpeech] = useState("");
  const [splash, setSplash] = useState(-1);
  const [message, setMessage] = useState("🌱 Plant, water, harvest and deliver before the 1-minute timer ends!");

  // Game-time clock: does not advance while paused.
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const pausedAtRef = useRef(null);
  const totalPausedRef = useRef(0);
  const getGameTime = () =>
    (pausedRef.current ? pausedAtRef.current : Date.now()) - totalPausedRef.current;
  const deadlineRef = useRef(Date.now() + LEVEL_SECONDS * 1000);
  const [secondsLeft, setSecondsLeft] = useState(LEVEL_SECONDS);
  const [now, setNow] = useState(Date.now());
  const [outcome, setOutcome] = useState(null); // "won" | "lost" | null
  const finishedRef = useRef(false);

  const walkTimer = useRef(null);
  const deliveryTimer = useRef(null);
  const speechTimer = useRef(null);
  const splashTimer = useRef(null);
  const speechUntilRef = useRef(null);
  const splashUntilRef = useRef(null);
  const walkDueRef = useRef(null);
  const driveDueRef = useRef(null);
  const audioRef = useRef(null);
  const lastBeepRef = useRef(null);

  function replacePlots(next) {
    plotsRef.current = next;
    setPlots(next);
  }

  function updatePlot(index, value) {
    replacePlots(plotsRef.current.map((plot, i) => i === index ? value : plot));
  }

  function updateStats(next) {
    statsRef.current = next;
    setStats(next);
  }

  function farmerSays(text) {
    // Speech timeout follows game time, so Pause freezes it too.
    setSpeech(text);
    speechUntilRef.current = getGameTime() + 1800;
  }

  function togglePause() {
    enableTickSound();
    if (finishedRef.current) return;
    if (!pausedRef.current) {
      pausedRef.current = true;
      pausedAtRef.current = Date.now();
      setPaused(true);
    } else {
      totalPausedRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
      pausedRef.current = false;
      setPaused(false);
    }
  }

  // Browser audio needs a user gesture. Any game click enables the last-10-seconds tick.
  function enableTickSound() {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      if (!audioRef.current) audioRef.current = new AudioEngine();
      if (audioRef.current.state === "suspended") {
        audioRef.current.resume().catch(() => {});
      }
    } catch (error) {
      console.warn("Countdown audio unavailable:", error);
    }
  }

  function beep(frequency = 780, duration = 0.09) {
    const context = audioRef.current;
    if (!context || context.state !== "running") return;
    try {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const t = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, t);
      volume.gain.setValueAtTime(0.0001, t);
      volume.gain.exponentialRampToValueAtTime(0.085, t + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.start(t);
      oscillator.stop(t + duration + 0.015);
    } catch (error) {
      console.warn("Could not play tick:", error);
    }
  }

  function endGame() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimeout(walkTimer.current);
    clearTimeout(deliveryTimer.current);
    walkingRef.current = false;
    drivingRef.current = false;
    setWalking(false);
    setDriving(false);

    const final = statsRef.current;
    const won = final.harvested >= REQUIRED_CARROTS && final.earned >= REQUIRED_INCOME;

    if (won) {
      updateStats({ ...final, coins: final.coins + COMPLETION_BONUS });
      try {
        const previous = Number(localStorage.getItem("littleFarmUnlockedLevel") || "1");
        localStorage.setItem("littleFarmUnlockedLevel", String(Math.max(previous || 1, 2)));
      } catch (error) {
        console.warn("Could not save unlocked level:", error);
      }
      setMessage("🏆 Time's up! Goals achieved — Level 2 unlocked!");
      farmerSays("Amazing! 🏆");
    } else {
      setMessage("⏰ Time's up! Game Over. Try again!");
      farmerSays("Oops! 😟");
    }
    setOutcome(won ? "won" : "lost");
    beep(won ? 1100 : 350, 0.4);
  }

  // One clock updates BOTH the level timer and every plant's growth.
  useEffect(() => {
    const ticker = setInterval(() => {
      if (finishedRef.current || pausedRef.current) return;
      const time = getGameTime();
      setNow(time);
      if (speechUntilRef.current !== null && time >= speechUntilRef.current) {
        speechUntilRef.current = null;
        setSpeech("");
      }
      if (splashUntilRef.current !== null && time >= splashUntilRef.current) {
        splashUntilRef.current = null;
        setSplash(-1);
      }
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - time) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 10 && remaining > 0 && lastBeepRef.current !== remaining) {
        lastBeepRef.current = remaining;
        beep(remaining <= 3 ? 1100 : 800, remaining <= 3 ? 0.16 : 0.09);
      }

      if (time >= deadlineRef.current) {
        endGame();
        return;
      }

      let requests = 0;
      let deaths = 0;
      let changed = false;
      const next = plotsRef.current.map((plot) => {
        if (plot.stage === "waiting" && time >= plot.deadline) {
          changed = true;
          // If browser was asleep for >10s, it dies immediately rather than gaining time.
          if (time >= plot.deadline + WATER_CHANCE) {
            deaths++;
            return { stage: "dead", deadline: 0 };
          }
          requests++;
          return { stage: "thirsty", deadline: plot.deadline + WATER_CHANCE };
        }
        if (plot.stage === "thirsty" && time >= plot.deadline) {
          changed = true;
          deaths++;
          return { stage: "dead", deadline: 0 };
        }
        if (plot.stage === "growing" && time >= plot.deadline) {
          changed = true;
          return { stage: "ready", deadline: 0 };
        }
        return plot;
      });
      if (changed) replacePlots(next);
      if (deaths) setMessage("🥀 A plant died. CLEAR it to remove it (−2 Coins).");
      else if (requests) setMessage("🪣 Water needed! Click the bucket within 5 seconds.");
    }, 100);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(walkTimer.current);
      clearTimeout(deliveryTimer.current);
      clearTimeout(speechTimer.current);
      clearTimeout(splashTimer.current);
      if (audioRef.current) audioRef.current.close().catch(() => {});
    };
  }, []);

  function performAction(index, action) {
    if (finishedRef.current || pausedRef.current || getGameTime() >= deadlineRef.current) return;
    const plot = plotsRef.current[index];

    if (action === "water") {
      if (plot.stage !== "watering") return;
      updatePlot(index, { stage: "growing", deadline: getGameTime() + GROW_TIME });
      setSplash(index);
      splashUntilRef.current = getGameTime() + 850;
      farmerSays("Very good! 💦");
      setMessage("💦 Watered! Wait 7 seconds for the carrot.");
      return;
    }

    // MANUAL SEED PURCHASE ONLY: 5 free seeds at the start.
    // When seeds reach 0, clicking PLANT never purchases a seed.
    if (plot.stage === "empty") {
      if (statsRef.current.seeds <= 0) {
        setMessage("🌱 No seeds left! Click BUY SEED in Farmer's Shop.");
        farmerSays("Need seeds! 🌱");
        return;
      }

      updatePlot(index, {
        stage: "waiting",
        deadline: getGameTime() + WATER_REQUEST_AFTER,
      });
      updateStats({
        ...statsRef.current,
        seeds: statsRef.current.seeds - 1,
        planted: statsRef.current.planted + 1,
      });
      setMessage("🌱 Seed planted! Water will be needed in 5 seconds.");
      return;
    }

    if (plot.stage === "dead") {
      updatePlot(index, { stage: "empty", deadline: 0 });
      updateStats({ ...statsRef.current, coins: statsRef.current.coins - 2 });
      farmerSays("Oops! 😟");
      setMessage("🥀 −2 Coins! Try again!");
      return;
    }

    if (plot.stage === "ready") {
      if (drivingRef.current || cargoRef.current >= TRUCK_CAPACITY) {
        setMessage("🚚 Truck full or delivering. Press GO before harvesting more.");
        return;
      }
      updatePlot(index, { stage: "empty", deadline: 0 });
      const nextCargo = cargoRef.current + 1;
      cargoRef.current = nextCargo;
      setCargo(nextCargo);
      updateStats({ ...statsRef.current, harvested: statsRef.current.harvested + 1 });
      farmerSays(Math.random() > 0.5 ? "Good job! 🥕" : "Very good! 🌟");
      setMessage(`🥕 Carrot loaded (${nextCargo}/6). Press GO to earn Coins.`);
    }
  }

  function walkToPlot(index, action = "plot") {
    enableTickSound();
    if (walkingRef.current || finishedRef.current || pausedRef.current || getGameTime() >= deadlineRef.current) return;
    const plot = plotsRef.current[index];
    const time = getGameTime();

    if (action === "water") {
      if (plot.stage !== "thirsty" || time >= plot.deadline) {
        setMessage("🥀 Too late to water this plant!");
        return;
      }
    } else {
      // Even with enough Coins, only BUY SEED in the shop adds Seeds.
      if (plot.stage === "empty" && statsRef.current.seeds <= 0) {
        setMessage("🌱 Seeds finished! Click BUY SEED in Farmer's Shop (10 Coins).");
        farmerSays("Oops! No seeds!");
        return;
      }
      if (plot.stage === "ready" && (drivingRef.current || cargoRef.current >= TRUCK_CAPACITY)) {
        setMessage("🚚 Deliver your current cargo first!");
        return;
      }
      if (!["empty", "dead", "ready"].includes(plot.stage)) {
        setMessage(plot.stage === "thirsty" ? "🪣 Click the little bucket to water." : "⏳ Wait for the carrot to grow.");
        return;
      }
    }

    const path = findPath(farmerRef.current, SOIL[index]);
    if (path === null) {
      setMessage("The farmer cannot reach this plot.");
      return;
    }

    // Reserve watering at click time, so walking does not cause an unfair death.
    if (action === "water") updatePlot(index, { stage: "watering", deadline: 0 });

    if (path.length === 0) {
      performAction(index, action);
      return;
    }
    walkingRef.current = true;
    setWalking(true);
    setMessage(action === "water" ? "👨‍🌾 Farmer is bringing water..." : "👨‍🌾 Farmer is walking to the plot...");

    let step = 0;
    walkDueRef.current = getGameTime();
    function move() {
      if (finishedRef.current) return;
      // Keep the walking step on hold during pause.
      if (pausedRef.current || getGameTime() < walkDueRef.current) {
        walkTimer.current = setTimeout(move, 40);
        return;
      }
      if (step >= path.length) {
        walkingRef.current = false;
        setWalking(false);
        performAction(index, action);
        return;
      }
      const next = path[step++];
      const previous = farmerRef.current;
      const position = {
        ...next,
        direction: next.x < previous.x ? "left" : next.x > previous.x ? "right" : previous.direction,
      };
      farmerRef.current = position;
      setFarmer(position);
      walkDueRef.current = getGameTime() + WALK_STEP;
      walkTimer.current = setTimeout(move, 40);
    }
    move();
  }

  function deliver() {
    enableTickSound();
    if (drivingRef.current || finishedRef.current || pausedRef.current || cargoRef.current <= 0 || getGameTime() >= deadlineRef.current) return;
    const amount = cargoRef.current;
    drivingRef.current = true;
    setDriving(true);
    farmerSays("Let's go! 🚚");
    setMessage(`🚚 Delivering ${amount} carrot(s)...`);

    driveDueRef.current = getGameTime() + DELIVERY_TIME;
    function finishDelivery() {
      if (finishedRef.current) return;
      // Game-time does not advance during Pause, so delivery stays frozen.
      if (pausedRef.current || getGameTime() < driveDueRef.current) {
        deliveryTimer.current = setTimeout(finishDelivery, 40);
        return;
      }
      if (getGameTime() >= deadlineRef.current) return;
      const reward = amount * COINS_PER_CARROT;
      cargoRef.current = 0;
      setCargo(0);
      drivingRef.current = false;
      setDriving(false);
      updateStats({
        ...statsRef.current,
        coins: statsRef.current.coins + reward,
        earned: statsRef.current.earned + reward,
      });
      farmerSays("Very good! 🪙");
      setMessage(`✅ Delivered ${amount} carrot(s)! +${reward} Coins.`);
    }
    deliveryTimer.current = setTimeout(finishDelivery, 40);
  }

  function buySeed() {
    enableTickSound();
    if (finishedRef.current || pausedRef.current || getGameTime() >= deadlineRef.current || statsRef.current.coins < SEED_PRICE) return;
    updateStats({
      ...statsRef.current,
      coins: statsRef.current.coins - SEED_PRICE,
      seeds: statsRef.current.seeds + 1,
    });
    setMessage("🛒 Purchased 1 carrot seed for 10 Coins.");
  }

  function restart() {
    enableTickSound();
    clearTimeout(walkTimer.current);
    clearTimeout(deliveryTimer.current);
    clearTimeout(speechTimer.current);
    clearTimeout(splashTimer.current);
    replacePlots(newPlots());
    updateStats({ ...INITIAL_STATS });
    farmerRef.current = { ...INITIAL_FARMER };
    setFarmer({ ...INITIAL_FARMER });
    walkingRef.current = false;
    setWalking(false);
    cargoRef.current = 0;
    setCargo(0);
    drivingRef.current = false;
    setDriving(false);
    finishedRef.current = false;
    setOutcome(null);
    pausedRef.current = false;
    pausedAtRef.current = null;
    totalPausedRef.current = 0;
    setPaused(false);
    speechUntilRef.current = null;
    splashUntilRef.current = null;
    walkDueRef.current = null;
    driveDueRef.current = null;
    setSpeech("");
    setSplash(-1);
    lastBeepRef.current = null;
    deadlineRef.current = Date.now() + LEVEL_SECONDS * 1000;
    setSecondsLeft(LEVEL_SECONDS);
    setNow(Date.now());
    setMessage("🌱 New 1-minute round! Plant, harvest and deliver at least 5 carrots.");
  }

  const goalsMet = stats.harvested >= REQUIRED_CARROTS && stats.earned >= REQUIRED_INCOME;
  const missions = [
    { name: "Harvest 5 carrots", icon: "🥕", current: stats.harvested, target: REQUIRED_CARROTS },
    { name: "Earn 150 delivery coins", icon: "🪙", current: stats.earned, target: REQUIRED_INCOME },
  ];

  return (
    <main className={`fg-game ${paused ? "fg-paused" : ""}`}>
      <header className="fg-header">
        <div className="fg-header-actions">
          <button type="button" className="fg-top-restart" onClick={restart} title="Restart Level 1" aria-label="Restart Level 1">
            ↻
          </button>
          <button
            type="button"
            className="fg-top-pause"
            onClick={togglePause}
            title={paused ? "Resume Level 1" : "Pause Level 1"}
            aria-label={paused ? "Resume Level 1" : "Pause Level 1"}
            aria-pressed={paused}
          >
            {paused ? "▶" : "⏸"}
          </button>
          <button type="button" className="fg-top-exit" onClick={onExit} title="Exit to Start Page" aria-label="Exit Level 1 to Start Page">
            EXIT
          </button>
        </div>

        {/* ONE-MINUTE LEVEL TIMER */}
        <div className={`fg-clock ${secondsLeft <= 10 ? "fg-clock-urgent" : ""}`}>
          <div className="fg-clock-main">
            <span className="fg-clock-label">⏰ LEVEL 1</span>
            <strong className="fg-clock-time">{formatTime(secondsLeft)}</strong>
          </div>
          <div className="fg-clock-track">
            <div style={{ width: `${secondsLeft / LEVEL_SECONDS * 100}%` }} />
          </div>
          <span className="fg-clock-hint">
            {goalsMet ? `✅ Goal reached! Earned: ${stats.earned} Coins — keep farming!` : secondsLeft <= 10 ? "⚠️ Hurry! Last 10 seconds!" : "Minimum: 5 carrots + 150 Coins"}
          </span>
        </div>

        <div className="fg-inventory">
          <div className="fg-inventory-item"><span>🪙</span><strong>{stats.coins}</strong><small>Coins</small></div>
          <div className="fg-inventory-item"><span>🌱</span><strong>{stats.seeds}</strong><small>Seeds</small></div>
        </div>
      </header>

      <div className="fg-layout">
        <section className="fg-world">
          <div className="fg-world-header"><span>🌿 My Little Garden</span><span>☀️ Sunny Day</span></div>

          <div className="fg-board">
            <img src="/barn.png" alt="Farm barn" className="fg-barn" draggable="false" />

            {SOIL.map((position, index) => {
              const plot = plots[index];
              const stage = plot.stage;
              const remaining = Math.max(0, plot.deadline - now);
              const seconds = Math.ceil(remaining / 1000);
              const icons = { empty: "🟫", waiting: "🌱", thirsty: "🌱", watering: "💧", growing: "🌿", ready: "🥕" };
              const labels = { empty: "PLANT", waiting: "WAIT", thirsty: "WATER", watering: "WATERING", growing: "GROW", ready: "HARVEST", dead: "CLEAR" };
              const progress = stage === "waiting" ? (1 - remaining / WATER_REQUEST_AFTER) * 100 : stage === "growing" ? (1 - remaining / GROW_TIME) * 100 : 0;

              return (
                <div key={index} className="fg-soil-cell" style={{ left: `${(position.x + 0.5) / COLS * 100}%`, top: `${(position.y + 0.5) / ROWS * 100}%` }}>
                  <button type="button" className={`fg-plot fg-${stage}`} onClick={() => walkToPlot(index)} disabled={walking || paused || !!outcome} aria-label={`Plot ${index + 1}: ${labels[stage]}`}>
                    {stage === "dead" ? <img src="/dead-plant.png" className="fg-dead-image" alt="Dead plant" /> : <span className="fg-crop">{icons[stage]}</span>}
                    <span className="fg-plot-label">{labels[stage]}</span>
                    {(stage === "waiting" || stage === "growing") && (
                      <>
                        <div className="fg-loading"><div style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
                        <small className="fg-remaining">{seconds}s</small>
                      </>
                    )}
                    {stage === "watering" && <span className="fg-spinner" />}
                  </button>

                  {stage === "thirsty" && (
                    <button type="button" className="fg-mini-bucket" onClick={() => walkToPlot(index, "water")} disabled={walking || paused || !!outcome} aria-label={`Water plot ${index + 1}`}>
                      <img src="/water-bucket.png" alt="" />
                      <span>{seconds}s</span>
                    </button>
                  )}
                  {splash === index && <span className="fg-splash">💦</span>}
                </div>
              );
            })}

            {/* Carrots sit inside the rear truck bed. */}
            <div className={`fg-truck ${driving ? "fg-truck-driving" : ""}`}>
              <div className="fg-truck-visual" tabIndex={0} role="button" onClick={(event) => event.currentTarget.focus()} aria-label={`Delivery truck. ${cargo} carrots loaded out of ${TRUCK_CAPACITY}. Tap to see cargo.`}>
                <img src="/delivery-car.png" className="fg-truck-image" alt="Blue delivery truck" draggable="false" />
                <div className="fg-truck-cargo" aria-label={`${cargo} carrots loaded`}>
                  {Array.from({ length: cargo }, (_, i) => <span key={i} aria-hidden="true">🥕</span>)}
                </div>
                <div className="fg-truck-tooltip" aria-hidden="true">
                  <strong>🚚 Truck Load</strong>
                  <span>🥕 Carrot <b>{cargo}</b></span>
                  <span>Total <b>{cargo}/{TRUCK_CAPACITY}</b></span>
                </div>
              </div>
              <div className="fg-truck-count">🥕 {cargo}/{TRUCK_CAPACITY}</div>
              {!driving && <button className="fg-go" type="button" disabled={!cargo || paused || !!outcome} onClick={deliver}>GO 🚚</button>}
            </div>

            <div className={`fg-farmer ${walking ? "fg-walking" : ""}`} style={{ left: `${(farmer.x + 0.5) / COLS * 100}%`, top: `clamp(54px, ${(farmer.y + 0.5) / ROWS * 100}%, calc(100% - 54px))` }}>
              {speech && <div className="fg-speech">{speech}</div>}
              <img src="/farmer-character.png" className="fg-farmer-image" alt="Farmer" draggable="false" />
            </div>
          </div>

          <div className="fg-message" role="status">{message}</div>
        </section>

        <aside className="fg-sidebar">
          <section className="fg-panel">
            <h2>🎯 Today's Missions</h2>
            {missions.map((mission) => {
              const progress = Math.min(mission.current, mission.target);
              return (
                <div className="fg-mission" key={mission.name}>
                  <div className="fg-mission-row"><span>{mission.icon} {mission.name}</span><strong>{mission.current}/{mission.target}</strong></div>
                  <div className="fg-progress"><div style={{ width: `${progress / mission.target * 100}%` }} /></div>
                </div>
              );
            })}
            <div className="fg-reward">🏆 Bonus on success: 50 Coins</div>
            <p className="fg-goal-help">You may earn more than 150 Coins. Only delivered carrots count as income.</p>
          </section>

          <section className="fg-panel fg-shop">
            <h2>🛒 Farmer's Shop</h2>
            <div className="fg-shop-item"><span>🌱</span><div><strong>Carrot Seed × 1</strong><small>Price: 10 Coins</small></div></div>
            <button type="button" className="fg-buy" onClick={buySeed} disabled={stats.coins < SEED_PRICE || paused || !!outcome}>🪙 BUY SEED</button>
          </section>
        </aside>
      </div>

      {paused && !outcome && (
        <div className="fg-pause-overlay" role="dialog" aria-modal="true" aria-labelledby="fg-pause-title">
          <div className="fg-pause-card">
            <div className="fg-pause-icon">⏸</div>
            <h2 id="fg-pause-title">Game Paused</h2>
            <p>Timer, crops, farmer and delivery truck are paused.</p>
            <button type="button" onClick={togglePause}>▶ RESUME GAME</button>
            <button type="button" className="farm-exit-modal-button" onClick={onExit}>EXIT → START</button>
          </div>
        </div>
      )}

      {outcome && (
        <div className="fg-win-overlay">
          <section className="fg-win-card" role="dialog" aria-modal="true" aria-labelledby="fg-outcome-title">
            <div className="fg-trophy">{outcome === "won" ? "🏆" : "⏰"}</div>
            <h2 id="fg-outcome-title">{outcome === "won" ? "Level 1 Complete!" : "Game Over!"}</h2>
            <p>Time's up! Your 1-minute farming round has ended.</p>
            <div className="fg-result-list">
              <p>🥕 Carrots harvested: <strong>{stats.harvested}</strong></p>
              <p>🪙 Delivery income: <strong>{stats.earned} Coins</strong></p>
            </div>
            {outcome === "won" ? (
              <>
                <div className="fg-win-reward">🎉 +{COMPLETION_BONUS} Bonus Coins!</div>
                <div className="fg-total-coins">
                  <span>🪙 Total Earned Coins</span>
                  <strong>{stats.earned + COMPLETION_BONUS} Coins</strong>
                </div>
                <p className="fg-wallet-balance">Wallet after seed / clearing costs: <strong>{stats.coins} Coins</strong></p>
                <p>🔓 Level 2 Unlocked!</p>
              </>
            ) : (
              <>
                <div className="fg-total-coins">
                  <span>🪙 Total Earned Coins</span>
                  <strong>{stats.earned} Coins</strong>
                </div>
                <p className="fg-wallet-balance">Wallet after costs: <strong>{stats.coins} Coins</strong></p>
                <p className="fg-lose-note">Need at least 5 harvested carrots and 150 delivery Coins before the timer ends.</p>
              </>
            )}
            <div className="fg-result-actions">
              {outcome === "won" && (
                <button
                  type="button"
                  className="fg-win-button fg-next-level-button"
                  onClick={() => {
                    // endGame() already saved Level 2 as unlocked.
                    // Return to StartPage's existing "levels" screen.
                    onNextLevel?.();
                  }}
                >
                  NEXT LEVEL ➜
                </button>
              )}
              <button type="button" className="fg-win-button" onClick={restart}>
                ↻ PLAY AGAIN
              </button>
              <button type="button" className="fg-win-button farm-exit-modal-button" onClick={onExit}>EXIT → START</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
