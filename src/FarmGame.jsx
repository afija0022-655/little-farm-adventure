
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

// FARMING TIMERS
const WATER_REQUEST_AFTER = 5000;
const WATER_CHANCE = 5000;
const GROW_TIME = 7000;
const WALK_STEP = 230;
const DELIVERY_TIME = 2800;

const COLS = 7;
const ROWS = 5;

// SOIL PLOTS
const SOIL = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
];

// STARTING RESOURCES
const INITIAL_STATS = {
  coins: 0,
  seeds: 5,
  planted: 0,
  harvested: 0,
  earned: 0,
};

const INITIAL_FARMER = {
  x: 4,
  y: 3,
  direction: "left",
};

function newPlots() {
  return SOIL.map(() => ({
    stage: "empty",
    deadline: 0,
  }));
}

function isSoil(x, y) {
  return SOIL.some(
    (plot) => plot.x === x && plot.y === y
  );
}

// AUTOMATIC FARMER PATH
function findPath(start, target) {
  const queue = [
    {
      x: start.x,
      y: start.y,
      path: [],
    },
  ];

  const visited = new Set([
    `${start.x},${start.y}`,
  ]);

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];

    const distance =
      Math.abs(current.x - target.x) +
      Math.abs(current.y - target.y);

    if (distance === 1) {
      return current.path;
    }

    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x},${y}`;

      if (
        x < 0 ||
        x >= COLS ||
        y < 0 ||
        y >= ROWS ||
        isSoil(x, y) ||
        visited.has(key)
      ) {
        continue;
      }

      visited.add(key);

      queue.push({
        x,
        y,
        path: [
          ...current.path,
          { x, y },
        ],
      });
    }
  }

  return null;
}

// FORMAT GAME TIMER
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remaining).padStart(2, "0")
  );
}

// MAIN GAME COMPONENT
export default function FarmGame({ onNextLevel }) {
  // PLOTS
  const [plots, setPlots] = useState(newPlots);
  const plotsRef = useRef(plots);

  // PLAYER RESOURCES
  const [stats, setStats] = useState({
    ...INITIAL_STATS,
  });

  const statsRef = useRef({
    ...INITIAL_STATS,
  });

  // FARMER
  const [farmer, setFarmer] = useState({
    ...INITIAL_FARMER,
  });

  const farmerRef = useRef({
    ...INITIAL_FARMER,
  });

  const [walking, setWalking] = useState(false);
  const walkingRef = useRef(false);

  // DELIVERY TRUCK
  const [cargo, setCargo] = useState(0);
  const cargoRef = useRef(0);

  const [driving, setDriving] = useState(false);
  const drivingRef = useRef(false);

  // ANIMATIONS
  const [speech, setSpeech] = useState("");
  const [splash, setSplash] = useState(-1);

  const [message, setMessage] = useState(
    "🌱 Plant, water, harvest and deliver before the 1-minute timer ends!"
  );

  // PAUSE SYSTEM
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const pausedAtRef = useRef(null);
  const totalPausedRef = useRef(0);

  function getGameTime() {
    const time = pausedRef.current
      ? pausedAtRef.current
      : Date.now();

    return time - totalPausedRef.current;
  }

  // ONE-MINUTE TIMER
  const deadlineRef = useRef(
    Date.now() + LEVEL_SECONDS * 1000
  );

  const [secondsLeft, setSecondsLeft] =
    useState(LEVEL_SECONDS);

  const [now, setNow] = useState(Date.now());

  // RESULT
  const [outcome, setOutcome] = useState(null);
  const finishedRef = useRef(false);

  // TIMER REFERENCES
  const walkTimer = useRef(null);
  const deliveryTimer = useRef(null);

  const walkDueRef = useRef(null);
  const driveDueRef = useRef(null);

  const speechUntilRef = useRef(null);
  const splashUntilRef = useRef(null);

  // SOUND
  const audioRef = useRef(null);
  const lastBeepRef = useRef(null);

  // UPDATE PLOTS
  function replacePlots(next) {
    plotsRef.current = next;
    setPlots(next);
  }

  function updatePlot(index, value) {
    const updated = plotsRef.current.map(
      (plot, i) =>
        i === index ? value : plot
    );

    replacePlots(updated);
  }

  // UPDATE STATS
  function updateStats(next) {
    statsRef.current = next;
    setStats(next);
  }

  // FARMER SPEECH
  function farmerSays(text) {
    setSpeech(text);

    speechUntilRef.current =
      getGameTime() + 1800;
  }

  // ENABLE SOUND
  function enableTickSound() {
    try {
      const AudioEngine =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioEngine) return;

      if (
        !audioRef.current ||
        audioRef.current.state === "closed"
      ) {
        audioRef.current = new AudioEngine();
      }

      if (
        audioRef.current.state === "suspended"
      ) {
        audioRef.current.resume().catch(() => {});
      }
    } catch (error) {
      console.warn(
        "Audio unavailable:",
        error
      );
    }
  }

  // PLAY CLOCK SOUND
  function beep(
    frequency = 780,
    duration = 0.09
  ) {
    const context = audioRef.current;

    if (
      !context ||
      context.state !== "running"
    ) {
      return;
    }

    try {
      const oscillator =
        context.createOscillator();

      const volume = context.createGain();
      const t = context.currentTime;

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        frequency,
        t
      );

      volume.gain.setValueAtTime(
        0.0001,
        t
      );

      volume.gain.exponentialRampToValueAtTime(
        0.085,
        t + 0.015
      );

      volume.gain.exponentialRampToValueAtTime(
        0.0001,
        t + duration
      );

      oscillator.connect(volume);
      volume.connect(context.destination);

      oscillator.start(t);
      oscillator.stop(t + duration + 0.015);
    } catch (error) {
      console.warn(
        "Sound error:",
        error
      );
    }
  }

  // PAUSE / RESUME
  function togglePause() {
    enableTickSound();

    if (finishedRef.current) return;

    if (!pausedRef.current) {
      pausedRef.current = true;
      pausedAtRef.current = Date.now();

      setPaused(true);
    } else {
      totalPausedRef.current +=
        Date.now() - pausedAtRef.current;

      pausedAtRef.current = null;
      pausedRef.current = false;

      setPaused(false);
    }
  }

  // FINISH LEVEL
  function endGame() {
    if (finishedRef.current) return;

    finishedRef.current = true;

    clearTimeout(walkTimer.current);
    clearTimeout(deliveryTimer.current);

    walkingRef.current = false;
    drivingRef.current = false;

    setWalking(false);
    setDriving(false);

    const finalStats = statsRef.current;

    const won =
      finalStats.harvested >= REQUIRED_CARROTS &&
      finalStats.earned >= REQUIRED_INCOME;

    if (won) {
      // ADD BONUS
      updateStats({
        ...finalStats,
        coins:
          finalStats.coins + COMPLETION_BONUS,
      });

      // UNLOCK LEVEL 2
      try {
        const previous = Number(
          localStorage.getItem(
            "littleFarmUnlockedLevel"
          ) || "1"
        );

        localStorage.setItem(
          "littleFarmUnlockedLevel",
          String(Math.max(previous || 1, 2))
        );
      } catch (error) {
        console.warn(
          "Progress save failed:",
          error
        );
      }

      setMessage(
        "🏆 Level 1 Complete! Level 2 Unlocked!"
      );

      farmerSays("Amazing! 🏆");
    } else {
      setMessage(
        "⏰ Game Over! Try again!"
      );

      farmerSays("Oops! 😟");
    }

    setOutcome(won ? "won" : "lost");

    beep(
      won ? 1100 : 350,
      0.4
    );
  }

  // GAME CLOCK AND PLANT TIMERS
  useEffect(() => {
    const ticker = setInterval(() => {
      if (
        finishedRef.current ||
        pausedRef.current
      ) {
        return;
      }

      const time = getGameTime();

      setNow(time);

      // FARMER SPEECH TIMER
      if (
        speechUntilRef.current !== null &&
        time >= speechUntilRef.current
      ) {
        speechUntilRef.current = null;
        setSpeech("");
      }

      // WATER SPLASH TIMER
      if (
        splashUntilRef.current !== null &&
        time >= splashUntilRef.current
      ) {
        splashUntilRef.current = null;
        setSplash(-1);
      }

      // ONE-MINUTE COUNTDOWN
      const remaining = Math.max(
        0,
        Math.ceil(
          (deadlineRef.current - time) / 1000
        )
      );

      setSecondsLeft(remaining);

      // LAST 10 SECONDS SOUND
      if (
        remaining <= 10 &&
        remaining > 0 &&
        lastBeepRef.current !== remaining
      ) {
        lastBeepRef.current = remaining;

        beep(
          remaining <= 3 ? 1100 : 800,
          remaining <= 3 ? 0.16 : 0.09
        );
      }

      // GAME ENDS AT ZERO
      if (time >= deadlineRef.current) {
        endGame();
        return;
      }

      let requests = 0;
      let deaths = 0;
      let changed = false;

      const next = plotsRef.current.map(
        (plot) => {
          // WATER REQUEST
          if (
            plot.stage === "waiting" &&
            time >= plot.deadline
          ) {
            changed = true;

            if (
              time >=
              plot.deadline + WATER_CHANCE
            ) {
              deaths++;

              return {
                stage: "dead",
                deadline: 0,
              };
            }

            requests++;

            return {
              stage: "thirsty",
              deadline:
                plot.deadline + WATER_CHANCE,
            };
          }

          // DEAD PLANT
          if (
            plot.stage === "thirsty" &&
            time >= plot.deadline
          ) {
            changed = true;
            deaths++;

            return {
              stage: "dead",
              deadline: 0,
            };
          }

          // CARROT READY
          if (
            plot.stage === "growing" &&
            time >= plot.deadline
          ) {
            changed = true;

            return {
              stage: "ready",
              deadline: 0,
            };
          }

          return plot;
        }
      );

      if (changed) {
        replacePlots(next);
      }

      if (deaths > 0) {
        setMessage(
          "🥀 Plant died! Click CLEAR to remove it."
        );
      } else if (requests > 0) {
        setMessage(
          "🪣 Water needed! Click the bucket within 5 seconds."
        );
      }
    }, 100);

    return () => clearInterval(ticker);
  }, []);

  // CLEANUP
  useEffect(() => {
    return () => {
      clearTimeout(walkTimer.current);
      clearTimeout(deliveryTimer.current);

      if (audioRef.current) {
        audioRef.current.close().catch(() => {});
      }
    };
  }, []);

  // PLANT / WATER / CLEAR / HARVEST
  function performAction(index, action) {
    if (
      finishedRef.current ||
      pausedRef.current ||
      getGameTime() >= deadlineRef.current
    ) {
      return;
    }

    const plot = plotsRef.current[index];

    // WATER PLANT
    if (action === "water") {
      if (plot.stage !== "watering") return;

      updatePlot(index, {
        stage: "growing",
        deadline:
          getGameTime() + GROW_TIME,
      });

      setSplash(index);

      splashUntilRef.current =
        getGameTime() + 850;

      farmerSays("Very good! 💦");

      setMessage(
        "💦 Watered! Your carrot is growing."
      );

      return;
    }

    // ====================================
    // PLANT - MANUAL SEED PURCHASE ONLY
    // ====================================
    if (plot.stage === "empty") {

      // SEEDS MUST BE GREATER THAN ZERO
      if (statsRef.current.seeds <= 0) {
        setMessage(
          "🌱 No seeds left! Click BUY SEED in Farmer's Shop."
        );

        farmerSays("Need seeds! 🌱");
        return;
      }

      // PLANT ONE SEED
      updatePlot(index, {
        stage: "waiting",
        deadline:
          getGameTime() + WATER_REQUEST_AFTER,
      });

      // DEDUCT ONE SEED
      // DO NOT AUTO-BUY
      updateStats({
        ...statsRef.current,
        seeds:
          statsRef.current.seeds - 1,
        planted:
          statsRef.current.planted + 1,
      });

      setMessage(
        "🌱 Seed planted! Water will be needed in 5 seconds."
      );

      return;
    }

    // DEAD PLANT CLEAR
    if (plot.stage === "dead") {
      updatePlot(index, {
        stage: "empty",
        deadline: 0,
      });

      updateStats({
        ...statsRef.current,
        coins:
          statsRef.current.coins - 2,
      });

      farmerSays("Oops! 😟");

      setMessage(
        "🥀 −2 Coins! Try again!"
      );

      return;
    }

    // HARVEST CARROT
    if (plot.stage === "ready") {
      if (
        drivingRef.current ||
        cargoRef.current >= TRUCK_CAPACITY
      ) {
        setMessage(
          "🚚 Truck full! Press GO to deliver first."
        );

        return;
      }

      updatePlot(index, {
        stage: "empty",
        deadline: 0,
      });

      const nextCargo =
        cargoRef.current + 1;

      cargoRef.current = nextCargo;
      setCargo(nextCargo);

      updateStats({
        ...statsRef.current,
        harvested:
          statsRef.current.harvested + 1,
      });

      farmerSays(
        Math.random() > 0.5
          ? "Good job! 🥕"
          : "Very good! 🌟"
      );

      setMessage(
        `🥕 Carrot loaded (${nextCargo}/6). Press GO to earn Coins.`
      );

      return;
    }
  }

  // FARMER AUTOMATIC WALKING
  function walkToPlot(
    index,
    action = "plot"
  ) {
    enableTickSound();

    if (
      walkingRef.current ||
      pausedRef.current ||
      finishedRef.current ||
      getGameTime() >= deadlineRef.current
    ) {
      return;
    }

    const plot = plotsRef.current[index];
    const time = getGameTime();

    // CHECK WATERING
    if (action === "water") {
      if (
        plot.stage !== "thirsty" ||
        time >= plot.deadline
      ) {
        setMessage(
          "🥀 Too late to water this plant!"
        );

        return;
      }
    } else {

      // ==================================
      // NO SEEDS = NO PLANT
      // EVEN IF PLAYER HAS ENOUGH COINS
      // ==================================
      if (
        plot.stage === "empty" &&
        statsRef.current.seeds <= 0
      ) {
        setMessage(
          "🌱 Seeds finished! Click BUY SEED in Farmer's Shop (10 Coins)."
        );

        farmerSays("Oops! No seeds!");
        return;
      }

      // TRUCK CAPACITY CHECK
      if (
        plot.stage === "ready" &&
        (
          drivingRef.current ||
          cargoRef.current >= TRUCK_CAPACITY
        )
      ) {
        setMessage(
          "🚚 Deliver your current carrots first!"
        );

        return;
      }

      // OTHER PLOT STATES
      if (
        !["empty", "dead", "ready"].includes(
          plot.stage
        )
      ) {
        setMessage(
          plot.stage === "thirsty"
            ? "🪣 Click the small bucket!"
            : "⏳ Wait for the carrot to grow."
        );

        return;
      }
    }

    // FIND PATH
    const path = findPath(
      farmerRef.current,
      SOIL[index]
    );

    if (path === null) {
      setMessage(
        "Farmer cannot reach this plot."
      );

      return;
    }

    // RESERVE WATER
    if (action === "water") {
      updatePlot(index, {
        stage: "watering",
        deadline: 0,
      });
    }

    // ALREADY NEAR SOIL
    if (path.length === 0) {
      performAction(index, action);
      return;
    }

    walkingRef.current = true;
    setWalking(true);

    setMessage(
      action === "water"
        ? "👨‍🌾 Farmer is bringing water..."
        : "👨‍🌾 Farmer is walking to the plot..."
    );

    let step = 0;

    walkDueRef.current = getGameTime();

    function move() {
      if (finishedRef.current) return;

      // FREEZE WALKING DURING PAUSE
      if (
        pausedRef.current ||
        getGameTime() < walkDueRef.current
      ) {
        walkTimer.current = setTimeout(
          move,
          40
        );

        return;
      }

      // REACHED SOIL
      if (step >= path.length) {
        walkingRef.current = false;
        setWalking(false);

        performAction(index, action);
        return;
      }

      // MOVE FARMER
      const next = path[step++];
      const previous = farmerRef.current;

      const position = {
        ...next,

        direction:
          next.x < previous.x
            ? "left"
            : next.x > previous.x
            ? "right"
            : previous.direction,
      };

      farmerRef.current = position;
      setFarmer(position);

      walkDueRef.current =
        getGameTime() + WALK_STEP;

      walkTimer.current = setTimeout(
        move,
        40
      );
    }

    move();
  }

  // DELIVERY TRUCK
  function deliver() {
    enableTickSound();

    if (
      drivingRef.current ||
      pausedRef.current ||
      finishedRef.current ||
      cargoRef.current <= 0 ||
      getGameTime() >= deadlineRef.current
    ) {
      return;
    }

    const amount = cargoRef.current;

    drivingRef.current = true;
    setDriving(true);

    farmerSays("Let's go! 🚚");

    setMessage(
      `🚚 Delivering ${amount} carrot(s)...`
    );

    driveDueRef.current =
      getGameTime() + DELIVERY_TIME;

    function finishDelivery() {
      if (finishedRef.current) return;

      // PAUSE DELIVERY
      if (
        pausedRef.current ||
        getGameTime() < driveDueRef.current
      ) {
        deliveryTimer.current = setTimeout(
          finishDelivery,
          40
        );

        return;
      }

      // DELIVERY MUST FINISH BEFORE TIME ENDS
      if (
        getGameTime() >= deadlineRef.current
      ) {
        return;
      }

      const reward =
        amount * COINS_PER_CARROT;

      cargoRef.current = 0;
      setCargo(0);

      drivingRef.current = false;
      setDriving(false);

      // ADD DELIVERY COINS
      updateStats({
        ...statsRef.current,

        coins:
          statsRef.current.coins + reward,

        earned:
          statsRef.current.earned + reward,
      });

      farmerSays("Very good! 🪙");

      setMessage(
        `✅ Delivery complete! +${reward} Coins!`
      );
    }

    deliveryTimer.current = setTimeout(
      finishDelivery,
      40
    );
  }

  // ====================================
  // BUY SEED FROM SHOP ONLY
  // ====================================
  function buySeed() {
    enableTickSound();

    if (
      finishedRef.current ||
      pausedRef.current ||
      getGameTime() >= deadlineRef.current
    ) {
      return;
    }

    // NEED 10 COINS
    if (
      statsRef.current.coins < SEED_PRICE
    ) {
      setMessage(
        "🪙 Not enough Coins to buy a seed!"
      );

      return;
    }

    // PAY 10 COINS, GET 1 SEED
    updateStats({
      ...statsRef.current,

      coins:
        statsRef.current.coins - SEED_PRICE,

      seeds:
        statsRef.current.seeds + 1,
    });

    setMessage(
      "🛒 Bought 1 carrot seed for 10 Coins!"
    );

    farmerSays("New seed! 🌱");
  }

  // RESTART
  function restart() {
    enableTickSound();

    clearTimeout(walkTimer.current);
    clearTimeout(deliveryTimer.current);

    replacePlots(newPlots());

    // BACK TO 0 COINS AND 5 SEEDS
    updateStats({
      ...INITIAL_STATS,
    });

    farmerRef.current = {
      ...INITIAL_FARMER,
    };

    setFarmer({
      ...INITIAL_FARMER,
    });

    walkingRef.current = false;
    setWalking(false);

    cargoRef.current = 0;
    setCargo(0);

    drivingRef.current = false;
    setDriving(false);

    finishedRef.current = false;
    setOutcome(null);

    // RESET PAUSE
    pausedRef.current = false;
    pausedAtRef.current = null;
    totalPausedRef.current = 0;

    setPaused(false);

    // RESET ANIMATIONS
    speechUntilRef.current = null;
    splashUntilRef.current = null;

    walkDueRef.current = null;
    driveDueRef.current = null;

    setSpeech("");
    setSplash(-1);

    // RESET CLOCK
    lastBeepRef.current = null;

    deadlineRef.current =
      Date.now() + LEVEL_SECONDS * 1000;

    setSecondsLeft(LEVEL_SECONDS);
    setNow(Date.now());

    setMessage(
      "🌱 New 1-minute round! Start with 5 free seeds."
    );
  }

  // MISSIONS
  const goalsMet =
    stats.harvested >= REQUIRED_CARROTS &&
    stats.earned >= REQUIRED_INCOME;

  const missions = [
    {
      name: "Harvest 5 carrots",
      icon: "🥕",
      current: stats.harvested,
      target: REQUIRED_CARROTS,
    },
    {
      name: "Earn 150 delivery coins",
      icon: "🪙",
      current: stats.earned,
      target: REQUIRED_INCOME,
    },
  ];

  const totalEarned =
    stats.earned +
    (outcome === "won"
      ? COMPLETION_BONUS
      : 0);

  return (
    <main
      className={`fg-game ${
        paused ? "fg-paused" : ""
      }`}
    >

      {/* GAME HEADER */}
      <header className="fg-header">

        {/* RESTART + PAUSE */}
        <div className="fg-header-actions">
          <button
            type="button"
            className="fg-top-restart"
            onClick={restart}
            title="Restart Level 1"
            aria-label="Restart Level 1"
          >
            ↻
          </button>

          <button
            type="button"
            className="fg-top-pause"
            onClick={togglePause}
            title={paused ? "Resume" : "Pause"}
            aria-label={
              paused ? "Resume Level 1" : "Pause Level 1"
            }
            aria-pressed={paused}
          >
            {paused ? "▶" : "⏸"}
          </button>
        </div>

        {/* ONE-MINUTE TIMER */}
        <div
          className={`fg-clock ${
            secondsLeft <= 10
              ? "fg-clock-urgent"
              : ""
          }`}
        >
          <div className="fg-clock-main">
            <span className="fg-clock-label">
              ⏰ LEVEL 1
            </span>

            <strong className="fg-clock-time">
              {formatTime(secondsLeft)}
            </strong>
          </div>

          <div className="fg-clock-track">
            <div
              style={{
                width: `${
                  (secondsLeft / LEVEL_SECONDS) * 100
                }%`,
              }}
            />
          </div>

          <span className="fg-clock-hint">
            {goalsMet
              ? `✅ Goal reached! Earned: ${stats.earned} Coins — keep farming!`
              : secondsLeft <= 10
              ? "⚠️ Hurry! Last 10 seconds!"
              : "Minimum: 5 carrots + 150 Coins"}
          </span>
        </div>

        {/* COINS AND SEEDS */}
        <div className="fg-inventory">

          <div className="fg-inventory-item">
            <span>🪙</span>
            <strong>{stats.coins}</strong>
            <small>Coins</small>
          </div>

          <div className="fg-inventory-item">
            <span>🌱</span>
            <strong>{stats.seeds}</strong>
            <small>Seeds</small>
          </div>

        </div>
      </header>

      {/* GAME LAYOUT */}
      <div className="fg-layout">

        {/* FARM */}
        <section className="fg-world">

          <div className="fg-world-header">
            <span>🌿 My Little Garden</span>
            <span>☀️ Sunny Day</span>
          </div>

          <div className="fg-board">

            {/* BARN */}
            <img
              src="/barn.png"
              className="fg-barn"
              alt="Farm barn"
              draggable="false"
            />

            {/* SOIL PLOTS */}
            {SOIL.map((position, index) => {
              const plot = plots[index];
              const stage = plot.stage;

              const remaining = Math.max(
                0,
                plot.deadline - now
              );

              const seconds = Math.ceil(
                remaining / 1000
              );

              const icons = {
                empty: "🟫",
                waiting: "🌱",
                thirsty: "🌱",
                watering: "💧",
                growing: "🌿",
                ready: "🥕",
              };

              const labels = {
                empty: "PLANT",
                waiting: "WAIT",
                thirsty: "WATER",
                watering: "WATERING",
                growing: "GROW",
                ready: "HARVEST",
                dead: "CLEAR",
              };

              const progress =
                stage === "waiting"
                  ? (
                      1 -
                      remaining /
                        WATER_REQUEST_AFTER
                    ) * 100
                  : stage === "growing"
                  ? (
                      1 -
                      remaining / GROW_TIME
                    ) * 100
                  : 0;

              return (
                <div
                  key={index}
                  className="fg-soil-cell"
                  style={{
                    left: `${
                      (
                        (position.x + 0.5) /
                        COLS
                      ) * 100
                    }%`,

                    top: `${
                      (
                        (position.y + 0.5) /
                        ROWS
                      ) * 100
                    }%`,
                  }}
                >

                  {/* SOIL BUTTON */}
                  <button
                    type="button"
                    className={`fg-plot fg-${stage}`}
                    onClick={() =>
                      walkToPlot(index)
                    }
                    disabled={
                      walking ||
                      paused ||
                      !!outcome
                    }
                    aria-label={`Plot ${
                      index + 1
                    }: ${labels[stage]}`}
                  >

                    {stage === "dead" ? (
                      <img
                        src="/dead-plant.png"
                        className="fg-dead-image"
                        alt="Dead plant"
                      />
                    ) : (
                      <span className="fg-crop">
                        {icons[stage]}
                      </span>
                    )}

                    <span className="fg-plot-label">
                      {labels[stage]}
                    </span>

                    {/* LOADING BAR */}
                    {(
                      stage === "waiting" ||
                      stage === "growing"
                    ) && (
                      <>
                        <div className="fg-loading">
                          <div
                            style={{
                              width: `${
                                Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    progress
                                  )
                                )
                              }%`,
                            }}
                          />
                        </div>

                        <small className="fg-remaining">
                          {seconds}s
                        </small>
                      </>
                    )}

                    {stage === "watering" && (
                      <span className="fg-spinner" />
                    )}

                  </button>

                  {/* WATER BUCKET */}
                  {stage === "thirsty" && (
                    <button
                      type="button"
                      className="fg-mini-bucket"
                      onClick={() =>
                        walkToPlot(
                          index,
                          "water"
                        )
                      }
                      disabled={
                        walking ||
                        paused ||
                        !!outcome
                      }
                      aria-label={`Water plot ${
                        index + 1
                      }`}
                    >
                      <img
                        src="/water-bucket.png"
                        alt=""
                      />

                      <span>{seconds}s</span>
                    </button>
                  )}

                  {/* WATER SPLASH */}
                  {splash === index && (
                    <span className="fg-splash">
                      💦
                    </span>
                  )}

                </div>
              );
            })}

            {/* DELIVERY TRUCK */}
            <div
              className={`fg-truck ${
                driving
                  ? "fg-truck-driving"
                  : ""
              }`}
            >

              <div className="fg-truck-visual">

                <img
                  src="/delivery-car.png"
                  className="fg-truck-image"
                  alt="Blue delivery truck"
                  draggable="false"
                />

                {/* CARROTS IN TRUCK BED */}
                <div
                  className="fg-truck-cargo"
                  aria-label={`${cargo} carrots loaded`}
                >
                  {Array.from(
                    { length: cargo },
                    (_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                      >
                        🥕
                      </span>
                    )
                  )}
                </div>

              </div>

              {/* CARROT COUNT */}
              <div className="fg-truck-count">
                🥕 {cargo}/{TRUCK_CAPACITY}
              </div>

              {/* GO BUTTON */}
              {!driving && (
                <button
                  type="button"
                  className="fg-go"
                  onClick={deliver}
                  disabled={
                    !cargo ||
                    paused ||
                    !!outcome
                  }
                >
                  GO 🚚
                </button>
              )}

            </div>

            {/* FARMER */}
            <div
              className={`fg-farmer ${
                walking
                  ? "fg-walking"
                  : ""
              }`}
              style={{
                left: `${
                  (
                    (farmer.x + 0.5) /
                    COLS
                  ) * 100
                }%`,

                top: `${
                  (
                    (farmer.y + 0.5) /
                    ROWS
                  ) * 100
                }%`,
              }}
            >

              {speech && (
                <div className="fg-speech">
                  {speech}
                </div>
              )}

              <img
                src="/farmer-character.png"
                className="fg-farmer-image"
                alt="Farmer"
                draggable="false"
              />

            </div>

          </div>

          {/* MESSAGE */}
          <div
            className="fg-message"
            role="status"
          >
            {message}
          </div>

        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="fg-sidebar">

          {/* MISSIONS */}
          <section className="fg-panel">
            <h2>🎯 Today's Missions</h2>

            {missions.map((mission) => {
              const progress = Math.min(
                mission.current,
                mission.target
              );

              return (
                <div
                  className="fg-mission"
                  key={mission.name}
                >

                  <div className="fg-mission-row">
                    <span>
                      {mission.icon}{" "}
                      {mission.name}
                    </span>

                    <strong>
                      {mission.current}/
                      {mission.target}
                    </strong>
                  </div>

                  <div className="fg-progress">
                    <div
                      style={{
                        width: `${
                          (
                            progress /
                            mission.target
                          ) * 100
                        }%`,
                      }}
                    />
                  </div>

                </div>
              );
            })}

            <div className="fg-reward">
              🏆 Bonus on success: 50 Coins
            </div>

            <p className="fg-goal-help">
              You can earn more than
              150 Coins. Only delivered
              carrots count as income.
            </p>
          </section>

          {/* FARMER'S SHOP */}
          <section className="fg-panel fg-shop">
            <h2>🛒 Farmer's Shop</h2>

            <div className="fg-shop-item">
              <span>🌱</span>

              <div>
                <strong>
                  Carrot Seed × 1
                </strong>

                <small>
                  Price: 10 Coins
                </small>
              </div>
            </div>

            {/* MANUAL BUY BUTTON */}
            <button
              type="button"
              className="fg-buy"
              onClick={buySeed}
              disabled={
                stats.coins < SEED_PRICE ||
                paused ||
                !!outcome
              }
            >
              🪙 BUY SEED
            </button>

          </section>

        </aside>
      </div>

      {/* PAUSE SCREEN */}
      {paused && !outcome && (
        <div
          className="fg-pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fg-pause-title"
        >

          <div className="fg-pause-card">

            <div className="fg-pause-icon">
              ⏸
            </div>

            <h2 id="fg-pause-title">
              Game Paused
            </h2>

            <p>
              Timer, crops, farmer and
              delivery truck are paused.
            </p>

            <button
              type="button"
              onClick={togglePause}
            >
              ▶ RESUME GAME
            </button>

          </div>
        </div>
      )}

      {/* GAME RESULT */}
      {outcome && (
        <div className="fg-win-overlay">

          <section
            className="fg-win-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fg-outcome-title"
          >

            <div className="fg-trophy">
              {outcome === "won"
                ? "🏆"
                : "⏰"}
            </div>

            <h2 id="fg-outcome-title">
              {outcome === "won"
                ? "Level 1 Complete!"
                : "Game Over!"}
            </h2>

            <p>
              Time's up! Your 1-minute
              farming round has ended.
            </p>

            {/* RESULTS */}
            <div className="fg-result-list">
              <p>
                🥕 Carrots harvested:{" "}
                <strong>
                  {stats.harvested}
                </strong>
              </p>

              <p>
                🪙 Delivery income:{" "}
                <strong>
                  {stats.earned} Coins
                </strong>
              </p>
            </div>

            {outcome === "won" ? (
              <>
                <div className="fg-win-reward">
                  🎉 +50 Bonus Coins!
                </div>

                {/* TOTAL COINS */}
                <div className="fg-total-coins">
                  <span>
                    🪙 Total Earned Coins
                  </span>

                  <strong>
                    {totalEarned} Coins
                  </strong>
                </div>

                <p className="fg-wallet-balance">
                  Wallet after seed and
                  clearing costs:{" "}
                  <strong>
                    {stats.coins} Coins
                  </strong>
                </p>

                <p>
                  🔓 Level 2 Unlocked!
                </p>
              </>
            ) : (
              <>
                <div className="fg-total-coins">
                  <span>
                    🪙 Total Earned Coins
                  </span>

                  <strong>
                    {totalEarned} Coins
                  </strong>
                </div>

                <p className="fg-wallet-balance">
                  Wallet Balance:{" "}
                  <strong>
                    {stats.coins} Coins
                  </strong>
                </p>

                <p className="fg-lose-note">
                  Need at least 5 harvested
                  carrots and 150 delivery
                  Coins before time runs out.
                </p>
              </>
            )}

            {/* RESULT BUTTONS */}
            <div className="fg-result-actions">

              {outcome === "won" && (
                <button
                  type="button"
                  className="fg-win-button fg-next-level-button"
                  onClick={() =>
                    onNextLevel?.()
                  }
                >
                  NEXT LEVEL ➜
                </button>
              )}

              <button
                type="button"
                className="fg-win-button"
                onClick={restart}
              >
                ↻ PLAY AGAIN
              </button>

            </div>

          </section>
        </div>
      )}

    </main>
  );
}
