import { useEffect, useRef, useState } from "react";
import "./Level4Game.css";

// Level 4: Level 4 mechanics plus cumulative 800 Coins in completed deliveries.
const LEVEL_TIME = 300; // 5 minutes
// Gentle farm ambience: exact in-game spacing, also respects Pause.
const COW_SOUND_EVERY = 6000; // 6 seconds
const CHICKEN_SOUND_EVERY = 10000; // 10 seconds
const TARGET_CARROTS = 10;
const TARGET_ONIONS = 10;
const TARGET_EGGS = 4;
const TARGET_MILK = 3;
const TARGET_INCOME = 800; // Cumulative delivery income; spending coins does not lower this.
const BONUS = 50;
const TRUCK_LIMIT = 10;
const WATER_WAIT = 5000;
const WATER_WINDOW = 5000;
const GROW_TIME = { carrot: 6000, onion: 8000 };
const SELL_PRICE = { carrot: 30, onion: 35, egg: 40, milk: 80 };
const SEED_PRICE = { carrot: 10, onion: 20 };
const CHICKEN_FIRST_REQUEST = 10000;
const CHICKEN_WATER_WINDOW = 10000; // chicken stops and waits for up to 10 sec
const CHICKEN_EGG_DELAY = 10000; // egg appears 10s after water
const COW_FIRST_REQUEST = 15000; // cows start asking 15s after round start
const COW_WATER_WINDOW = 10000; // give water in 10 seconds
const COW_MILK_DELAY = 20000; // milk appears 20 seconds after water
const RABBIT_FREQUENCY = 10000; // normal gap between rabbit visits; ONLY if a carrot is ready
const RABBIT_AFTER_SHOO = 15000; // wait 15 in-game seconds AFTER rabbit is clicked
const RABBIT_PEEK_TIME = 5000; // first 5 seconds peeking from RIGHT edge
const RABBIT_RUN_TIME = 2800; // run RIGHT to LEFT towards a READY carrot
const RABBIT_EAT_TIME = 5000; // five seconds to click and shoo rabbit
const RABBIT_RIGHT_EDGE = 98.4; // peek at the RIGHT edge
// FENCE-SAFE PATH: corridor is BELOW the cows, then LEFT of both pens.
// These are percentages of the game board, not screen pixels.
// Cow pen: x=70..97, y=14..51. Chicken pen: x=5..50, y=68..95.
// Using y=77 keeps the WHOLE rabbit sprite below the cow fence;
// x=60 provides a separate vertical lane between both enclosures.
const RABBIT_PEEK_Y = 77;
const RABBIT_TURN_X = 60;
const RABBIT_FIRST_LEG = 0.50;
const RABBIT_SECOND_LEG = 0.78;
// Farmer moves continuously using requestAnimationFrame (not grid jumps).
const FARMER_SPEED = 0.065; // Board percentage-points per millisecond
const FARMER_MIN_SEGMENT = 170;
const FARMER_MAX_SEGMENT = 520;
const DELIVERY_TIME = 2600;
const COLS = 8;
const ROWS = 5;
// Display rows 1 and 2 higher up so the farmer's entire planting path
// stays ABOVE the chicken enclosure (the coop starts at 68%).
const BOARD_ROW_Y = [6, 23, 43, 55, 86];
const PEN = { left: 5, top: 68, width: 45, height: 27 };
// The cow farm REPLACES the old barn in the upper-right of the field.
const COW_PEN = { left: 70, top: 14, width: 27, height: 37 };
// Keep the farmer's head visible while standing above the top row.
// Crop plots still use BOARD_ROW_Y, so their positions never change.
const FARMER_ROW_Y = [11, 23, 43, 55, 86];
const gridPosition = (p) => ({
  left: ((p.x + 0.5) / COLS) * 100,
  top: FARMER_ROW_Y[p.y],
});
const penPosition = (x, y) => ({
  left: PEN.left + (PEN.width * x) / 100,
  top: PEN.top + (PEN.height * y) / 100 - 4,
});
const PEN_GATE_OUT = { left: 55, top: 59 };
const PEN_GATE_IN = { left: 46, top: 79 };
const COW_GATE_OUT = { left: 66, top: 57 };
const COW_GATE_IN = { left: 72, top: 48 };
const cowPenPosition = (x, y) => ({
  left: COW_PEN.left + COW_PEN.width * x / 100,
  top: COW_PEN.top + COW_PEN.height * y / 100 - 3,
});

const SOIL = [
  { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 3, y: 1 }, { x: 4, y: 1 },
  { x: 1, y: 2 }, { x: 2, y: 2 },
  { x: 3, y: 2 }, { x: 4, y: 2 },
];

const emptyPlots = () => SOIL.map(() => ({ crop: null, stage: "empty", due: 0 }));
const initialStats = () => ({ coins: 0, carrotSeeds: 10, onionSeeds: 10, planted: 0, harvested: 0, carrotsHarvested: 0, onionsHarvested: 0, eggsCollected: 0, milkCollected: 0, income: 0, delivered: 0 });
const emptyCargo = () => ({ carrot: 0, onion: 0, egg: 0, milk: 0 });
const emptyEggs = () => [];
const emptyMilk = () => [];
const initialFarmer = () => ({ x: 5, y: 3 }); // Always OUTSIDE the pen for crops
const makeChickens = (time) => [
  // Their initial water requests are offset, and only one may ask at a time.
  // x and y are PERCENTAGES INSIDE THE CHICKEN PEN, not the farm board.
  { id: 1, x: 30, y: 62, state: "idle", due: time + CHICKEN_FIRST_REQUEST, moveAt: time + 1600 },
  { id: 2, x: 70, y: 62, state: "idle", due: time + CHICKEN_FIRST_REQUEST + 7000, moveAt: time + 2700 },
];
const makeCows = (time) => [
  { id: 1, x: 28, y: 60, state: "idle", due: time + COW_FIRST_REQUEST, moveAt: time + 2000 },
  { id: 2, x: 73, y: 60, state: "idle", due: time + COW_FIRST_REQUEST + 7500, moveAt: time + 3500 },
];
const cargoCount = (c) => c.carrot + c.onion + c.egg + c.milk;
const timeLabel = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const randomBetween = (a, b) => a + Math.random() * (b - a);

// Three straight, fence-safe legs. NEVER move diagonally past a pen corner:
// 1. RIGHT -> LEFT across an empty GRASS lane BELOW the cow enclosure.
// 2. Move UP only after reaching the grass corridor between the pens.
// 3. LEFT towards the ready carrot ABOVE the chicken enclosure.
// The rabbit sprite is centered on (x,y), so each lane leaves room for its
// whole visible body, not merely the coordinate at its center.
function rabbitOutsidePenRoute(progress, carrotTarget) {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= RABBIT_FIRST_LEG) {
    const t = p / RABBIT_FIRST_LEG;
    return {
      x: RABBIT_RIGHT_EDGE + (RABBIT_TURN_X - RABBIT_RIGHT_EDGE) * t,
      y: RABBIT_PEEK_Y,
    };
  }
  if (p <= RABBIT_SECOND_LEG) {
    const t = (p - RABBIT_FIRST_LEG) / (RABBIT_SECOND_LEG - RABBIT_FIRST_LEG);
    return {
      x: RABBIT_TURN_X,
      y: RABBIT_PEEK_Y + (carrotTarget.top - RABBIT_PEEK_Y) * t,
    };
  }
  const t = (p - RABBIT_SECOND_LEG) / (1 - RABBIT_SECOND_LEG);
  return {
    x: RABBIT_TURN_X + (carrotTarget.left - RABBIT_TURN_X) * t,
    y: carrotTarget.top,
  };
}

function findPath(start, target) {
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const seen = new Set([`${start.x},${start.y}`]);
  for (let n = 0; n < queue.length; n++) {
    const p = queue[n];
    if (Math.abs(p.x - target.x) + Math.abs(p.y - target.y) === 1) return p.path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
      // Crop routes stay on the upper rows. Row 4 is never a planting route.
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS - 1 || seen.has(key)) continue;
      if (SOIL.some((p) => p.x === x && p.y === y)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...p.path, { x, y }] });
    }
  }
  return null;
}

// BFS to an exact grid cell (for walking between crops and the pen gate).
// The farmer avoids soil and never cuts through the chicken fence for crops.
function findPathToCell(start, target) {
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const seen = new Set([`${start.x},${start.y}`]);
  for (let n = 0; n < queue.length; n++) {
    const point = queue[n];
    if (point.x === target.x && point.y === target.y) return point.path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = point.x + dx;
      const y = point.y + dy;
      const key = `${x},${y}`;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS - 1 || seen.has(key)) continue;
      if (SOIL.some((soil) => soil.x === x && soil.y === y)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...point.path, { x, y }] });
    }
  }
  return null;
}

function segmentTime(from, to) {
  const dist = Math.hypot(to.left - from.left, to.top - from.top);
  return Math.max(FARMER_MIN_SEGMENT, Math.min(FARMER_MAX_SEGMENT, dist / FARMER_SPEED));
}

export default function Level4Game({ onNextLevel, onExit }) {
  const gameStart = useRef(Date.now());
  const pausedAt = useRef(null);
  const pausedTotal = useRef(0);
  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const walkRef = useRef(null);
  const farmerRafRef = useRef(null);
  const farmerNodeRef = useRef(null);
  const farmerVisualRef = useRef(gridPosition(initialFarmer()));
  // True only when the farmer finished a task INSIDE the chicken enclosure.
  const farmerInPenRef = useRef(false);
  const farmerInCowPenRef = useRef(false);
  // Water is reserved at click time, but the farmer must really walk to each crop.
  // If he is busy, saved watering trips wait in this FIFO queue.
  const cropWaterQueueRef = useRef([]);
  const deliveryRef = useRef(null);
  const audioRef = useRef(null);
  const lastBeep = useRef(null);
  // Four bundled local audio files (no network required while playing).
  const gameSoundsRef = useRef(null);
  const cowSoundCycle = useRef(0);
  const chickenSoundCycle = useRef(0);

  const gameTime = () => (pausedRef.current ? pausedAt.current : Date.now()) - pausedTotal.current;
  const [now, setNow] = useState(gameStart.current);
  const [left, setLeft] = useState(LEVEL_TIME);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [plots, setPlots] = useState(emptyPlots);
  const plotsRef = useRef(plots);
  const [stats, setStats] = useState(initialStats);
  const statsRef = useRef(stats);
  const [selected, setSelected] = useState("carrot");
  const selectedRef = useRef("carrot");
  const [farmer, setFarmer] = useState(initialFarmer);
  // Visual state: use a slightly smaller farmer sprite INSIDE the pen
  // so his feet do not overlap the front wooden rail.
  const [farmerInsidePen, setFarmerInsidePen] = useState(false);
  const [farmerInsideCowPen, setFarmerInsideCowPen] = useState(false);
  const farmerRef = useRef(farmer);
  const [farmerVisual, setFarmerVisual] = useState(() => gridPosition(initialFarmer()));
  const [walking, setWalking] = useState(false);
  const [chickens, setChickens] = useState(() => makeChickens(gameStart.current));
  const [cows, setCows] = useState(() => makeCows(gameStart.current));
  const cowsRef = useRef(cows);
  const [groundMilk, setGroundMilk] = useState(emptyMilk);
  const groundMilkRef = useRef(groundMilk);
  const nextMilkId = useRef(1);
  const [rabbit, setRabbit] = useState(null);
  const rabbitRef = useRef(null);
  const nextRabbitAt = useRef(gameStart.current); // ready carrot triggers first visit immediately
  const lastRabbitWarningSecond = useRef(null); // play one danger sound per eating second
  const chickensRef = useRef(chickens);
  // Eggs belong to the grass, not to the chicken. They stay until collected.
  const [groundEggs, setGroundEggs] = useState(emptyEggs);
  const groundEggsRef = useRef(groundEggs);
  const nextEggId = useRef(1);
  const [cargo, setCargo] = useState(emptyCargo);
  const cargoRef = useRef(cargo);
  const [driving, setDriving] = useState(false);
  const [message, setMessage] = useState("🌱 Select Carrot or Onion seed, then click a soil plot!");
  const [speech, setSpeech] = useState("");
  const speechDue = useRef(0);

  const setPlotData = (next) => { plotsRef.current = next; setPlots(next); };
  const setStatsData = (next) => { statsRef.current = next; setStats(next); };
  const setCargoData = (next) => { cargoRef.current = next; setCargo(next); };
  const setChickenData = (next) => { chickensRef.current = next; setChickens(next); };
  const setCowData = (next) => { cowsRef.current = next; setCows(next); };
  const setGroundMilkData = (next) => { groundMilkRef.current = next; setGroundMilk(next); };
  const setRabbitData = (next) => { rabbitRef.current = next; setRabbit(next); };
  const setGroundEggData = (next) => { groundEggsRef.current = next; setGroundEggs(next); };
  const setOnePlot = (i, item) => setPlotData(plotsRef.current.map((p, j) => j === i ? item : p));
  const say = (words) => { setSpeech(words); speechDue.current = gameTime() + 1700; };

  // Animate the actual DOM node at every animation frame instead of
  // rerendering the whole game or jumping to a new square every 190 ms.
  function paintFarmer(point) {
    farmerVisualRef.current = { left: point.left, top: point.top };
    if (farmerNodeRef.current) {
      farmerNodeRef.current.style.left = `${point.left}%`;
      farmerNodeRef.current.style.top = `${point.top}%`;
    }
  }

  // Waypoints are board-relative positions, with optional logical grid cells.
  // Crop commands can start from the pen, but they always EXIT the gate first.
  function cropWaypoints(target) {
    const base = initialFarmer();
    const startGrid = (farmerInPenRef.current || farmerInCowPenRef.current) ? base : farmerRef.current;
    const gridRoute = findPath(startGrid, target);
    if (gridRoute === null) return null;
    const points = [];
    if (farmerInPenRef.current) {
      points.push({ pos: PEN_GATE_IN });
      points.push({ pos: PEN_GATE_OUT, exitPen: true });
      points.push({ pos: gridPosition(base), grid: base });
    } else if (farmerInCowPenRef.current) {
      points.push({ pos: COW_GATE_IN });
      points.push({ pos: COW_GATE_OUT, exitCowPen: true });
      points.push({ pos: gridPosition(base), grid: base });
    }
    for (const cell of gridRoute) {
      points.push({ pos: gridPosition(cell), grid: cell });
    }
    return points;
  }

  // From ANY last grid position, walk to the gate via a clear grid route.
  // If already in the pen, walk directly to the next chicken or ground egg.
  // Move between either animal pen and any plot without cutting through fences.
  function penWaypoints(destination, penKind = "chicken") {
    const flag = penKind === "cow" ? "inCowPen" : "inPen";
    if ((penKind === "cow" && farmerInCowPenRef.current) ||
        (penKind === "chicken" && farmerInPenRef.current)) {
      return [{ pos: destination, [flag]: true }];
    }
    const gateCell = initialFarmer();
    const points = [];
    if (farmerInPenRef.current) {
      points.push({ pos: PEN_GATE_IN }, { pos: PEN_GATE_OUT, exitPen: true },
        { pos: gridPosition(gateCell), grid: gateCell });
    } else if (farmerInCowPenRef.current) {
      points.push({ pos: COW_GATE_IN }, { pos: COW_GATE_OUT, exitCowPen: true },
        { pos: gridPosition(gateCell), grid: gateCell });
    } else {
      const gridRoute = findPathToCell(farmerRef.current, gateCell);
      if (gridRoute === null) return null;
      points.push(...gridRoute.map((grid) => ({ pos: gridPosition(grid), grid })));
    }
    points.push({ pos: penKind === "cow" ? COW_GATE_OUT : PEN_GATE_OUT });
    points.push({ pos: penKind === "cow" ? COW_GATE_IN : PEN_GATE_IN, [flag]: true });
    points.push({ pos: destination, [flag]: true });
    return points;
  }

  function beginSmoothWalk(details, waypoints) {
    if (walkRef.current || pausedRef.current || finishedRef.current) return false;
    if (!waypoints || waypoints.length === 0) return false;
    const from = { ...farmerVisualRef.current };
    walkRef.current = {
      ...details,
      waypoints,
      index: 0,
      segmentStart: from,
      startedAt: gameTime(),
      duration: segmentTime(from, waypoints[0].pos),
    };
    setWalking(true);
    return true;
  }

  function audioOn() {
    try {
      const Engine = window.AudioContext || window.webkitAudioContext;
      if (!Engine) return;
      if (!audioRef.current || audioRef.current.state === "closed") audioRef.current = new Engine();
      if (audioRef.current.state === "suspended") audioRef.current.resume().catch(() => {});
    } catch { /* audio is optional */ }
  }

  // Each sound is short and independent. Never auto-loop: this avoids
  // accidental playback while paused or after the round has finished.
  function playLevelSound(type) {
    const sound = gameSoundsRef.current?.[type];
    if (!sound) return;
    try {
      sound.pause();
      sound.currentTime = 0;
      const promise = sound.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {}); // Browser can block audio until first click.
      }
    } catch { /* Audio is optional for environments without sound. */ }
  }

  function stopLevelSounds(names = ["cow", "chicken", "win", "lose"]) {
    const sounds = gameSoundsRef.current;
    if (!sounds) return;
    for (const name of names) {
      const sound = sounds[name];
      if (!sound) continue;
      sound.pause();
      try { sound.currentTime = 0; } catch { /* not seekable yet */ }
    }
  }

  function tickSound(freq = 850) {
    const a = audioRef.current;
    if (!a || a.state !== "running") return;
    const osc = a.createOscillator(), gain = a.createGain(), t = a.currentTime;
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t); osc.stop(t + 0.09);
  }

  // A distinct, short warning alarm while a rabbit attacks a ready carrot.
  // Audio is enabled through player interactions (planting / watering / etc.).
  function rabbitWarningSound() {
    const a = audioRef.current;
    if (!a || a.state !== "running") return;
    try {
      const osc = a.createOscillator();
      const volume = a.createGain();
      const start = a.currentTime;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(660, start);
      osc.frequency.exponentialRampToValueAtTime(1050, start + 0.16);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.055, start + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(volume);
      volume.connect(a.destination);
      osc.start(start);
      osc.stop(start + 0.19);
    } catch { /* alarm is optional if audio is unavailable */ }
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    walkRef.current = null;
    cropWaterQueueRef.current = [];
    deliveryRef.current = null;
    setWalking(false);
    setDriving(false);
    const s = statsRef.current;
    // All four product targets PLUS 800 Coins from completed deliveries.
    // income is cumulative, unlike wallet coins spent on seeds/clearing.
    const won = s.carrotsHarvested >= TARGET_CARROTS &&
      s.onionsHarvested >= TARGET_ONIONS &&
      s.eggsCollected >= TARGET_EGGS &&
      s.milkCollected >= TARGET_MILK &&
      s.income >= TARGET_INCOME;
    if (won) {
      setStatsData({ ...s, coins: s.coins + BONUS });
      try {
        const previous = Number(localStorage.getItem("littleFarmUnlockedLevel") || 1);
        localStorage.setItem("littleFarmUnlockedLevel", String(Math.max(previous || 1, 5)));
      } catch { /* localStorage is optional */ }
      say("Great job! 🏆");
    } else say("Oops! 😟");
    // A different, one-time audio cue for the final result.
    // Stop both animal sounds so the ending is heard clearly.
    stopLevelSounds();
    audioOn();
    playLevelSound(won ? "win" : "lose");
    setResult(won ? "won" : "lost");
  }

  // A single in-game clock drives everything. While paused, *all* deadlines stay frozen.
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || finishedRef.current) return;
      const t = gameTime();
      setNow(t);
      const seconds = Math.max(0, Math.ceil((gameStart.current + LEVEL_TIME * 1000 - t) / 1000));
      setLeft(seconds);
      if (seconds <= 10 && seconds > 0 && lastBeep.current !== seconds) {
        lastBeep.current = seconds;
        tickSound(seconds <= 3 ? 1100 : 780);
      }
      if (t >= gameStart.current + LEVEL_TIME * 1000) { finish(); return; }

      // Farm ambience is measured from the same PAUSE-AWARE game clock as
      // everything else. Every 6s: cow. Every 10s: chicken. No sound at 0s.
      const elapsed = Math.max(0, t - gameStart.current);
      const cowCycle = Math.floor(elapsed / COW_SOUND_EVERY);
      if (cowCycle > 0 && cowCycle > cowSoundCycle.current) {
        cowSoundCycle.current = cowCycle;
        playLevelSound("cow");
      }
      const chickenCycle = Math.floor(elapsed / CHICKEN_SOUND_EVERY);
      if (chickenCycle > 0 && chickenCycle > chickenSoundCycle.current) {
        chickenSoundCycle.current = chickenCycle;
        playLevelSound("chicken");
      }
      if (speechDue.current && t >= speechDue.current) { setSpeech(""); speechDue.current = 0; }

      // Smooth farmer movement runs on animation frames below, not in this
      // 90-ms game loop. So the farmer stays at the last command location.

      // When a previous walking trip finishes, the next reserved watering
      // trip starts. This also works while multiple plants need water.
      if (!walkRef.current && cropWaterQueueRef.current.length) {
        startNextCropWaterWalk();
      }

      // Crop growth / watering countdown
      let changing = false, thirsty = 0, died = 0;
      const nextPlots = plotsRef.current.map((p) => {
        if (p.stage === "waiting" && t >= p.due) {
          changing = true;
          if (t >= p.due + WATER_WINDOW) { died++; return { ...p, stage: "dead", due: 0 }; }
          thirsty++; return { ...p, stage: "thirsty", due: p.due + WATER_WINDOW };
        }
        if (p.stage === "thirsty" && t >= p.due) {
          changing = true; died++; return { ...p, stage: "dead", due: 0 };
        }
        if (p.stage === "growing" && t >= p.due) {
          changing = true; return { ...p, stage: "ready", due: 0 };
        }
        return p;
      });
      if (changing) setPlotData(nextPlots);
      if (died) setMessage("🥀 A plant died. Click CLEAR (−2 Coins). ");
      else if (thirsty) setMessage("🪣 A crop needs water! Click its bucket.");

      // Chicken pen: wander normally, STOP when asking for water.
      // Never show 2 water requests at the same time; postpone the next hen.
      let hensChanged = false;
      let waterRequestActive = chickensRef.current.some((hen) => ["thirsty", "watering"].includes(hen.state));
      const nextHens = chickensRef.current.map((c) => {
        if (c.state === "thirsty" && t >= c.due) {
          hensChanged = true;
          setMessage("🐔 A chicken died! No water within 10 seconds.");
          return { ...c, state: "dead", due: 0 };
        }
        if (c.state === "idle" && t >= c.due) {
          hensChanged = true;
          if (waterRequestActive) {
            // Ask later instead of displaying simultaneous water buckets.
            return { ...c, due: t + randomBetween(1200, 2500) };
          }
          waterRequestActive = true;
          setMessage("🪣 A chicken needs water! You have 10 seconds.");
          return { ...c, state: "thirsty", due: t + CHICKEN_WATER_WINDOW };
        }
        if (c.state === "laying" && t >= c.due) {
          // Drop a separate egg on the grass at the hen's current location.
          // The egg stays on the ground even when the hen walks away.
          hensChanged = true;
          const egg = {
            id: nextEggId.current++,
            x: Math.max(15, Math.min(85, c.x)),
            y: Math.max(70, Math.min(79, c.y + 16)),
          };
          setGroundEggData([...groundEggsRef.current, egg]);
          setMessage("🥚 An egg was laid on the grass! Click the egg to load it into the truck.");
          // She can walk again and ask for water on a later, random turn.
          return {
            ...c,
            state: "idle",
            due: t + randomBetween(9000, 15000),
            moveAt: t + randomBetween(1400, 2600),
          };
        }
        // Only hens that are not thirsty or dead may wander.
        if (["idle", "laying"].includes(c.state) && t >= c.moveAt) {
          hensChanged = true;
          return {
            ...c,
            // Positions are percentages inside .l4-chicken-pen.
            // Separate non-overlapping lanes keep both hens and their buttons visible.
            x: randomBetween(c.id === 1 ? 24 : 64, c.id === 1 ? 35 : 76),
            y: randomBetween(59, 66),
            moveAt: t + randomBetween(1400, 2900),
          };
        }
        return c;
      });
      if (hensChanged) setChickenData(nextHens);

      // Cow pen: TWO cows wander only inside their own fenced field.
      // Cow water is requested every ~15 seconds between completed milk cycles.
      let cowsChanged = false;
      let cowWaterActive = cowsRef.current.some((c) => ["thirsty", "watering"].includes(c.state));
      const nextCows = cowsRef.current.map((c) => {
        if (c.state === "thirsty" && t >= c.due) {
          cowsChanged = true;
          setMessage("🐄 A cow died without water!");
          return { ...c, state: "dead", due: 0 };
        }
        if (c.state === "idle" && t >= c.due) {
          cowsChanged = true;
          if (cowWaterActive) return { ...c, due: t + 1700 };
          cowWaterActive = true;
          setMessage("🪣 A cow needs water! Click within 10 seconds.");
          return { ...c, state: "thirsty", due: t + COW_WATER_WINDOW };
        }
        if (c.state === "milking" && t >= c.due) {
          cowsChanged = true;
          const milk = { id: nextMilkId.current++, x: c.x, y: 76 };
          setGroundMilkData([...groundMilkRef.current, milk]);
          setMessage("📦 A milk packet is on the grass! Click COLLECT MILK.");
          return { ...c, state: "idle", due: t + COW_FIRST_REQUEST,
            moveAt: t + randomBetween(1500, 2600) };
        }
        if (["idle", "milking"].includes(c.state) && t >= c.moveAt) {
          cowsChanged = true;
          return { ...c,
            x: randomBetween(c.id === 1 ? 22 : 65, c.id === 1 ? 38 : 80),
            y: randomBetween(54, 67),
            moveAt: t + randomBetween(2200, 3700) };
        }
        return c;
      });
      if (cowsChanged) setCowData(nextCows);

      // RABBIT: appear from RIGHT only if at least one carrot is HARVEST READY.
      // No rabbit on empty soil, onion, or a carrot still growing/waiting.
      // Once it appears, enforce a 10-second cooldown before another visit.
      // Pausing freezes the in-game clock, including this cooldown.
      if (t >= nextRabbitAt.current && !rabbitRef.current) {
        const readyCarrotExists = plotsRef.current.some(
          (plot) => plot.crop === "carrot" && plot.stage === "ready"
        );
        if (readyCarrotExists) {
          nextRabbitAt.current = t + RABBIT_FREQUENCY;
          setRabbitData({
            phase: "peek",
            phaseStart: t,
            phaseDue: t + RABBIT_PEEK_TIME,
            x: RABBIT_RIGHT_EDGE,
            y: RABBIT_PEEK_Y,
            targetIndex: null,
            target: null,
            scared: false,
          });
          setMessage("🐇 READY carrot spotted! Rabbit is peeking from the RIGHT — click to scare it!");
        }
      }

      const currentRabbit = rabbitRef.current;
      if (currentRabbit) {
        if (currentRabbit.scared) {
          if (t >= currentRabbit.scaredAt + 550) setRabbitData(null);
        } else if (currentRabbit.phase === "peek" && t >= currentRabbit.phaseDue) {
          const ready = plotsRef.current.map((p, index) => ({ p, index }))
            .filter(({ p }) => p.crop === "carrot" && p.stage === "ready");
          if (!ready.length) {
            setRabbitData(null);
            setMessage("🐇 No ready carrots — the rabbit left the farm.");
          } else {
            const chosen = ready[Math.floor(Math.random() * ready.length)].index;
            const target = {
              left: ((SOIL[chosen].x + 0.5) / COLS) * 100,
              top: BOARD_ROW_Y[SOIL[chosen].y],
            };
            setRabbitData({
              ...currentRabbit,
              phase: "running",
              phaseStart: t,
              phaseDue: t + RABBIT_RUN_TIME,
              targetIndex: chosen,
              target,
              // Stay in the lower grass lane until movement starts.
              // Do NOT jump up into the cow fence when peek ends.
              y: RABBIT_PEEK_Y,
            });
            setMessage("🐇 Rabbit is running toward a READY carrot! Click to shoo!");
          }
        } else if (currentRabbit.phase === "running") {
          const index = currentRabbit.targetIndex;
          const plot = plotsRef.current[index];
          if (!plot || plot.crop !== "carrot" || plot.stage !== "ready") {
            // Farmer already harvested it: rabbit cannot hurt an empty plot.
            setRabbitData(null);
          } else {
            const ratio = Math.min(1, (t - currentRabbit.phaseStart) / RABBIT_RUN_TIME);
            if (ratio >= 1) {
              setRabbitData({
                ...currentRabbit,
                phase: "eating",
                phaseStart: t,
                phaseDue: t + RABBIT_EAT_TIME,
                x: currentRabbit.target.left,
                y: currentRabbit.target.top,
              });
              lastRabbitWarningSecond.current = Math.ceil(RABBIT_EAT_TIME / 1000);
              rabbitWarningSound();
              setMessage("🚨 Rabbit attack! Click the rabbit before the red warning ends!");
            } else {
              setRabbitData({
                ...currentRabbit,
                // Right -> left via the LOWER grass lane, clear of cow fence.
                ...rabbitOutsidePenRoute(ratio, currentRabbit.target),
              });
            }
          }
        } else if (currentRabbit.phase === "eating" && t < currentRabbit.phaseDue) {
          const warningSecond = Math.ceil((currentRabbit.phaseDue - t) / 1000);
          if (warningSecond !== lastRabbitWarningSecond.current) {
            lastRabbitWarningSecond.current = warningSecond;
            rabbitWarningSound();
          }
        } else if (currentRabbit.phase === "eating" && t >= currentRabbit.phaseDue) {
          const index = currentRabbit.targetIndex;
          const plot = plotsRef.current[index];
          if (plot && plot.crop === "carrot" && plot.stage === "ready") {
            // Important: leave a DEAD plant that needs CLEAR, not an empty plot.
            setOnePlot(index, { ...plot, stage: "dead", due: 0 });
            setMessage("🥀 Oh no! The rabbit ate a carrot. It's now a DEAD plant; click CLEAR.");
          }
          setRabbitData(null);
        }
      }

      // Delivery completes only if there is still time
      if (deliveryRef.current && t >= deliveryRef.current.due) {
        const goods = deliveryRef.current.goods;
        deliveryRef.current = null;
        setDriving(false);
        setCargoData(emptyCargo());
        const reward = Object.entries(goods).reduce((sum, [kind, n]) => sum + n * SELL_PRICE[kind], 0);
        setStatsData({
          ...statsRef.current,
          coins: statsRef.current.coins + reward,
          income: statsRef.current.income + reward,
          delivered: statsRef.current.delivered + cargoCount(goods),
        });
        say("Good job! 🪙");
        setMessage(`🚚 Delivered ${cargoCount(goods)} products! +${reward} Coins.`);
      }
    }, 90);
    return () => clearInterval(id);
  }, []);

  // Frame-by-frame movement, based on the same PAUSABLE game clock.
  // Crucially, no automatic 'go home' happens after any task.
  useEffect(() => {
    let active = true;
    const animate = () => {
      if (!active) return;
      const walk = walkRef.current;
      if (!finishedRef.current && !pausedRef.current && walk) {
        const next = walk.waypoints[walk.index];
        if (next) {
          const elapsed = gameTime() - walk.startedAt;
          const ratio = Math.max(0, Math.min(1, elapsed / walk.duration));
          // Constant-speed interpolation avoids stopping at every square.
          const eased = ratio;
          paintFarmer({
            left: walk.segmentStart.left + (next.pos.left - walk.segmentStart.left) * eased,
            top: walk.segmentStart.top + (next.pos.top - walk.segmentStart.top) * eased,
          });
          if (ratio >= 1) {
            // A waypoint has been reached. Save its real position.
            paintFarmer(next.pos);
            if (next.grid) {
              farmerRef.current = next.grid;
              farmerInPenRef.current = false;
              farmerInCowPenRef.current = false;
              setFarmerInsidePen(false);
              setFarmerInsideCowPen(false);
            } else if (next.inPen) {
              farmerInPenRef.current = true;
              farmerInCowPenRef.current = false;
              setFarmerInsidePen(true);
              setFarmerInsideCowPen(false);
            } else if (next.inCowPen) {
              farmerInCowPenRef.current = true;
              farmerInPenRef.current = false;
              setFarmerInsideCowPen(true);
              setFarmerInsidePen(false);
            } else if (next.exitPen) {
              farmerInPenRef.current = false;
              setFarmerInsidePen(false);
            } else if (next.exitCowPen) {
              farmerInCowPenRef.current = false;
              setFarmerInsideCowPen(false);
            }
            walk.index += 1;
            if (walk.index < walk.waypoints.length) {
              walk.segmentStart = { ...next.pos };
              walk.startedAt = gameTime();
              walk.duration = segmentTime(next.pos, walk.waypoints[walk.index].pos);
            } else {
              walkRef.current = null;
              setWalking(false);
              if (walk.kind === "crop") applyPlotAction(walk.plotIndex, walk.action);
              else if (walk.kind === "pen") finishPenAction(walk);
              // No reset or home path; farmer will stand here until the next click.
            }
          }
        }
      }
      farmerRafRef.current = requestAnimationFrame(animate);
    };
    farmerRafRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      if (farmerRafRef.current !== null) cancelAnimationFrame(farmerRafRef.current);
    };
  }, []);

  // Load cow/chicken calls and unique win/lose melodies once per Level 4 mount.
  useEffect(() => {
    if (typeof Audio === "undefined") return undefined;
    const paths = {
      cow: "/cow-moo.mp3",
      chicken: "/chicken-cluck.mp3",
      win: "/level-win.mp3",
      lose: "/game-over.mp3",
    };
    const sounds = Object.fromEntries(Object.entries(paths).map(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = "auto";
      audio.volume = key === "cow" ? 0.43 : key === "chicken" ? 0.55 : 0.65;
      return [key, audio];
    }));
    gameSoundsRef.current = sounds;
    return () => {
      for (const audio of Object.values(sounds)) {
        audio.pause();
        try { audio.currentTime = 0; } catch { /* not seekable yet */ }
      }
      gameSoundsRef.current = null;
    };
  }, []);

  useEffect(() => () => { if (audioRef.current) audioRef.current.close().catch(() => {}); }, []);

  function applyPlotAction(index, action = "plot") {
    if (finishedRef.current || pausedRef.current) return;
    const p = plotsRef.current[index];
    const t = gameTime();
    if (action === "water") {
      if (p.stage !== "watering") return;
      setOnePlot(index, { ...p, stage: "growing", due: t + GROW_TIME[p.crop] });
      say("Very good! 💧");
      setMessage(`${p.crop === "carrot" ? "🥕 Carrot" : "🧅 Onion"} watered! Growing...`);
      return;
    }
    if (p.stage === "empty") {
      const type = selectedRef.current;
      const key = type === "carrot" ? "carrotSeeds" : "onionSeeds";
      if (statsRef.current[key] <= 0) { say("Need seeds!"); setMessage(`🛒 Buy ${type} seeds from the shop first.`); return; }
      setOnePlot(index, { crop: type, stage: "waiting", due: t + WATER_WAIT });
      setStatsData({ ...statsRef.current, [key]: statsRef.current[key] - 1, planted: statsRef.current.planted + 1 });
      setMessage(`${type === "carrot" ? "🥕 Carrot" : "🧅 Onion"} planted! Water requested in 5s.`);
    } else if (p.stage === "dead") {
      setOnePlot(index, { crop: null, stage: "empty", due: 0 });
      setStatsData({ ...statsRef.current, coins: statsRef.current.coins - 2 });
      say("Oops! 😟"); setMessage("🥀 −2 Coins! Try again!");
    } else if (p.stage === "ready") {
      if (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT) { setMessage("🚚 Truck is busy or full! Press GO."); return; }
      setOnePlot(index, { crop: null, stage: "empty", due: 0 });
      setCargoData({ ...cargoRef.current, [p.crop]: cargoRef.current[p.crop] + 1 });
      setStatsData({
        ...statsRef.current,
        harvested: statsRef.current.harvested + 1,
        carrotsHarvested: statsRef.current.carrotsHarvested + (p.crop === "carrot" ? 1 : 0),
        onionsHarvested: statsRef.current.onionsHarvested + (p.crop === "onion" ? 1 : 0),
      });
      say("Very good! 🌟");
      setMessage(`${p.crop === "carrot" ? "🥕 Carrot" : "🧅 Onion"} loaded into truck!`);
    }
  }

  function startNextCropWaterWalk() {
    if (walkRef.current || pausedRef.current || finishedRef.current) return;

    while (cropWaterQueueRef.current.length) {
      const index = cropWaterQueueRef.current.shift();
      const plot = plotsRef.current[index];
      if (!plot || plot.stage !== "watering") continue;

      const points = cropWaypoints(SOIL[index]);
      if (points === null) {
        setOnePlot(index, { ...plot, stage: "thirsty", due: gameTime() + WATER_WINDOW });
        setMessage("🚧 Farmer cannot reach that plot. Try watering again.");
        continue;
      }
      if (!points.length) {
        applyPlotAction(index, "water");
        continue;
      }
      beginSmoothWalk({ kind: "crop", plotIndex: index, action: "water" }, points);
      setMessage("👨‍🌾 Farmer is walking smoothly to water the plant...");
      return;
    }
  }

  function clickPlot(index, action = "plot") {
    audioOn();
    if (pausedRef.current || finishedRef.current || gameTime() >= gameStart.current + LEVEL_TIME * 1000) return;
    const p = plotsRef.current[index];
    if (action === "water") {
      if (p.stage !== "thirsty" || gameTime() >= p.due) return;

      // Claim the bucket in time. This stops the 5-second plant-death timer.
      // Growing starts only after the farmer arrives, not immediately on click.
      setOnePlot(index, { ...p, stage: "watering", due: 0 });
      cropWaterQueueRef.current.push(index);
      if (!walkRef.current) startNextCropWaterWalk();
      else setMessage("🪣 Water reserved! Farmer will walk there after his current task.");
      return;
    }
    if (walkRef.current || cropWaterQueueRef.current.length) { setMessage("👨‍🌾 Farmer is still walking!"); return; }
    if (!["empty", "dead", "ready"].includes(p.stage)) { setMessage("⏳ Wait, or click the water bucket!"); return; }
    if (p.stage === "empty") {
      const key = selectedRef.current === "carrot" ? "carrotSeeds" : "onionSeeds";
      if (statsRef.current[key] < 1) { say("Need seeds!"); setMessage("🛒 No selected seeds. Buy them in the shop!"); return; }
    }
    if (p.stage === "ready" && (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT)) { setMessage("🚚 Deliver first!"); return; }
    const points = cropWaypoints(SOIL[index]);
    if (points === null) {
      setMessage("🚧 Farmer cannot reach this plot.");
      return;
    }
    if (!points.length) {
      applyPlotAction(index);
      return;
    }
    beginSmoothWalk({ kind: "crop", plotIndex: index, action }, points);
    setMessage("👨‍🌾 Farmer is walking smoothly to the plot...");
  }

  // Enter animal pens only to water or collect eggs/milk. Then STOP there.
  // On the next crop command the farmer walks OUT via the gate first.
  function beginPenVisit(action, id, destination, penKind = "chicken") {
    const points = penWaypoints(destination, penKind);
    if (points === null) return false;
    return beginSmoothWalk({ kind: "pen", action, id }, points);
  }

  function finishPenAction(w) {
    if (w.action === "waterChicken") {
      const hen = chickensRef.current.find((c) => c.id === w.id);
      if (!hen || hen.state !== "watering") return;
      setChickenData(chickensRef.current.map((c) => c.id === w.id
        ? { ...c, state: "laying", due: gameTime() + CHICKEN_EGG_DELAY, moveAt: gameTime() + 1800 }
        : c));
      say("Very good! 💧");
      setMessage("💧 Chicken drank water! An egg will appear on the grass in 10 seconds.");
    } else if (w.action === "collectEgg") {
      const egg = groundEggsRef.current.find((item) => item.id === w.id);
      if (!egg) return;
      if (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT) {
        setGroundEggData(groundEggsRef.current.map((item) => item.id === w.id ? { ...item, pending: false } : item));
        setMessage("🚚 Truck full! The egg remains on the grass.");
        return;
      }
      setGroundEggData(groundEggsRef.current.filter((item) => item.id !== w.id));
      setCargoData({ ...cargoRef.current, egg: cargoRef.current.egg + 1 });
      setStatsData({ ...statsRef.current, eggsCollected: statsRef.current.eggsCollected + 1 });
      say("Collect Egg! 🥚");
      setMessage("🥚 COLLECT EGG complete! Egg loaded into the delivery truck.");
    } else if (w.action === "waterCow") {
      const cow = cowsRef.current.find((c) => c.id === w.id);
      if (!cow || cow.state !== "watering") return;
      setCowData(cowsRef.current.map((c) => c.id === w.id
        ? { ...c, state: "milking", due: gameTime() + COW_MILK_DELAY, moveAt: gameTime() + 2000 } : c));
      say("Very good! 💧");
      setMessage("🐄 Cow drank water! Milk will appear on the grass in 20 seconds.");
    } else if (w.action === "collectMilk") {
      const item = groundMilkRef.current.find((m) => m.id === w.id);
      if (!item) return;
      if (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT) {
        setGroundMilkData(groundMilkRef.current.map((m) => m.id === w.id ? { ...m, pending: false } : m));
        setMessage("🚚 Truck full! Milk remains on the grass.");
        return;
      }
      setGroundMilkData(groundMilkRef.current.filter((m) => m.id !== w.id));
      setCargoData({ ...cargoRef.current, milk: cargoRef.current.milk + 1 });
      setStatsData({ ...statsRef.current, milkCollected: statsRef.current.milkCollected + 1 });
      say("Collect Milk! 🥛");
      setMessage("🥛 Milk collected! Added to the delivery truck.");
    }
  }

  function waterChicken(id) {
    audioOn();
    if (pausedRef.current || finishedRef.current || walkRef.current || cropWaterQueueRef.current.length) {
      if (walkRef.current || cropWaterQueueRef.current.length) setMessage("👨‍🌾 Farmer is busy! Try again shortly.");
      return;
    }
    const chick = chickensRef.current.find((c) => c.id === id);
    if (!chick || chick.state !== "thirsty" || gameTime() >= chick.due) return;
    // Claim the water request on click, before the farmer walks, so it cannot expire mid-walk.
    setChickenData(chickensRef.current.map((c) => c.id === id
      ? { ...c, state: "watering", due: 0 }
      : c));
    if (!beginPenVisit("waterChicken", id, penPosition(Math.min(87, chick.x + 15), chick.y))) {
      setChickenData(chickensRef.current.map((c) => c.id === id
        ? { ...chick, state: "thirsty", due: gameTime() + CHICKEN_WATER_WINDOW }
        : c));
      setMessage("🚧 Farmer cannot reach the chicken.");
      return;
    }
    setMessage("👨‍🌾 Farmer is walking to give the chicken water...");
  }

  function collectEgg(eggId) {
    audioOn();
    if (pausedRef.current || finishedRef.current || gameTime() >= gameStart.current + LEVEL_TIME * 1000) return;
    const egg = groundEggsRef.current.find((item) => item.id === eggId);
    if (!egg || egg.pending) return;
    if (walkRef.current || cropWaterQueueRef.current.length) { setMessage("👨‍🌾 Farmer is busy! Try again shortly."); return; }
    if (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT) {
      setMessage("🚚 Truck full or delivering! Finish delivery, then collect the egg.");
      return;
    }
    setGroundEggData(groundEggsRef.current.map((item) => item.id === eggId ? { ...item, pending: true } : item));
    if (!beginPenVisit("collectEgg", eggId, penPosition(Math.min(88, egg.x + 12), Math.max(30, egg.y - 5)))) {
      setGroundEggData(groundEggsRef.current.map((item) => item.id === eggId ? { ...item, pending: false } : item));
      setMessage("🚧 Farmer cannot reach the egg.");
      return;
    }
    setMessage("👨‍🌾 Farmer is walking to COLLECT EGG...");
  }

  function waterCow(id) {
    audioOn();
    if (pausedRef.current || finishedRef.current || gameTime() >= gameStart.current + LEVEL_TIME * 1000) return;
    if (walkRef.current || cropWaterQueueRef.current.length) {
      setMessage("👨‍🌾 Farmer is busy! Try the cow's water bucket again."); return;
    }
    const cow = cowsRef.current.find((c) => c.id === id);
    if (!cow || cow.state !== "thirsty" || gameTime() >= cow.due) return;
    setCowData(cowsRef.current.map((c) => c.id === id ? { ...c, state: "watering", due: 0 } : c));
    if (!beginPenVisit("waterCow", id, cowPenPosition(cow.x + (cow.id === 1 ? 12 : -12), cow.y + 9), "cow")) {
      setCowData(cowsRef.current.map((c) => c.id === id ? { ...cow, state: "thirsty", due: gameTime() + COW_WATER_WINDOW } : c));
      setMessage("🚧 Farmer cannot reach the cow."); return;
    }
    setMessage("👨‍🌾 Farmer is walking to water the cow...");
  }

  function collectMilk(id) {
    audioOn();
    if (pausedRef.current || finishedRef.current || gameTime() >= gameStart.current + LEVEL_TIME * 1000) return;
    const item = groundMilkRef.current.find((m) => m.id === id);
    if (!item || item.pending) return;
    if (walkRef.current || cropWaterQueueRef.current.length) {
      setMessage("👨‍🌾 Farmer is busy! Try again shortly."); return;
    }
    if (deliveryRef.current || cargoCount(cargoRef.current) >= TRUCK_LIMIT) {
      setMessage("🚚 Deliver current products before collecting milk."); return;
    }
    setGroundMilkData(groundMilkRef.current.map((m) => m.id === id ? { ...m, pending: true } : m));
    if (!beginPenVisit("collectMilk", id, cowPenPosition(item.x + (item.x > 50 ? -8 : 8), item.y - 5), "cow")) {
      setGroundMilkData(groundMilkRef.current.map((m) => m.id === id ? { ...m, pending: false } : m));
      setMessage("🚧 Farmer cannot reach the milk."); return;
    }
    setMessage("👨‍🌾 Farmer is walking to COLLECT MILK...");
  }

  function scareRabbit() {
    audioOn();
    const r = rabbitRef.current;
    if (!r || r.scared || pausedRef.current || finishedRef.current) return;
    const shooTime = gameTime();
    nextRabbitAt.current = shooTime + RABBIT_AFTER_SHOO;
    lastRabbitWarningSecond.current = null;
    setRabbitData({ ...r, scared: true, scaredAt: shooTime });
    setMessage("💨 Shoo! The rabbit ran away before eating a carrot!");
  }

  function chooseSeed(type) {
    if (pausedRef.current || finishedRef.current) return;
    selectedRef.current = type;
    setSelected(type);
    setMessage(`${type === "carrot" ? "🥕 Carrot" : "🧅 Onion"} selected. Now click a PLANT plot.`);
  }

  function buySeed(type) {
    audioOn();
    if (pausedRef.current || finishedRef.current) return;
    if (statsRef.current.coins < SEED_PRICE[type]) { setMessage("🪙 Not enough coins!"); return; }
    const key = type === "carrot" ? "carrotSeeds" : "onionSeeds";
    setStatsData({ ...statsRef.current, coins: statsRef.current.coins - SEED_PRICE[type], [key]: statsRef.current[key] + 1 });
    setMessage(`🛒 Bought 1 ${type} seed for ${SEED_PRICE[type]} Coins.`);
  }

  function deliver() {
    audioOn();
    if (pausedRef.current || finishedRef.current || deliveryRef.current || !cargoCount(cargoRef.current)) return;
    deliveryRef.current = { goods: { ...cargoRef.current }, due: gameTime() + DELIVERY_TIME };
    setDriving(true);
    say("Let's go! 🚚");
    setMessage("🚚 Delivering your products...");
  }

  function togglePause() {
    audioOn();
    if (finishedRef.current) return;
    if (!pausedRef.current) {
      // Pause must stop animal ambience immediately, not just freeze timers.
      stopLevelSounds(["cow", "chicken"]);
      pausedAt.current = Date.now();
      pausedRef.current = true;
      setPaused(true);
    } else {
      pausedTotal.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
      pausedRef.current = false;
      setPaused(false);
    }
  }

  function restart() {
    audioOn();
    // A fresh round starts a fresh 6s / 10s ambience schedule.
    stopLevelSounds();
    cowSoundCycle.current = 0;
    chickenSoundCycle.current = 0;
    const t = Date.now();
    gameStart.current = t;
    pausedAt.current = null;
    pausedTotal.current = 0;
    pausedRef.current = false;
    finishedRef.current = false;
    lastBeep.current = null;
    walkRef.current = null;
    cropWaterQueueRef.current = [];
    deliveryRef.current = null;
    speechDue.current = 0;
    setNow(t);
    setLeft(LEVEL_TIME);
    setPaused(false);
    setResult(null);
    setPlotData(emptyPlots());
    setStatsData(initialStats());
    const f = initialFarmer();
    farmerRef.current = f;
    farmerInPenRef.current = false;
    farmerInCowPenRef.current = false;
    setFarmerInsidePen(false);
    setFarmerInsideCowPen(false);
    setFarmer(f);
    setFarmerVisual(gridPosition(f));
    paintFarmer(gridPosition(f));
    setWalking(false);
    setCargoData(emptyCargo());
    setDriving(false);
    setChickenData(makeChickens(t));
    setCowData(makeCows(t));
    setGroundEggData(emptyEggs());
    setGroundMilkData(emptyMilk());
    nextEggId.current = 1;
    nextMilkId.current = 1;
    nextRabbitAt.current = t; // rabbit waits until a carrot is ready
    lastRabbitWarningSecond.current = null;
    setRabbitData(null);
    selectedRef.current = "carrot"; setSelected("carrot");
    setSpeech("");
    setMessage("🌱 New round! Choose a seed then plant.");
  }

  const goalsMet = stats.carrotsHarvested >= TARGET_CARROTS &&
    stats.onionsHarvested >= TARGET_ONIONS &&
    stats.eggsCollected >= TARGET_EGGS &&
    stats.milkCollected >= TARGET_MILK &&
    stats.income >= TARGET_INCOME;
  const timerPercent = Math.max(0, (left / LEVEL_TIME) * 100);
  return (
    <main
      className={`l4-game ${paused ? "l4-paused" : ""}`}
      onPointerDownCapture={audioOn}
      onKeyDownCapture={audioOn}
    >
      <header className="l4-topbar">
        <div className="l4-top-actions">
          <button type="button" onClick={restart} title="Restart">↻</button>
          <button type="button" onClick={togglePause} title={paused ? "Resume" : "Pause"}>{paused ? "▶" : "Ⅱ"}</button>
          <button type="button" className="l4-exit" onClick={onExit} title="Exit to Start Page" aria-label="Exit Level 4 to Start Page">EXIT</button>
        </div>
        <div className={`l4-clock ${left <= 10 ? "urgent" : ""}`}>
          <strong>⏰ LEVEL 4 — {timeLabel(left)}</strong>
          <div className="l4-track"><span style={{ width: `${timerPercent}%` }} /></div>
          <small>{goalsMet ? "✅ Goal reached! Keep farming!" : "10 carrots + 10 onions + 4 eggs + 3 milk + 800 Coins"}</small>
        </div>
        <div className="l4-wallet">🪙 <strong>{stats.coins}</strong> Coins</div>
      </header>

      <div className="l4-layout">
        <section className="l4-left">
          <div className="l4-heading">🐄 Animal Farm Adventure <span>☀️ Sunny Day</span></div>
          <div className="l4-board">
            {/* The old barn is replaced with a NEW COW FARM. */}
            {SOIL.map((pos, i) => {
              const plot = plots[i];
              const seconds = Math.ceil(Math.max(0, plot.due - now) / 1000);
              const icon = plot.stage === "dead" ? null : plot.stage === "empty" ? "🟫" : plot.crop === "onion" ? "🧅" : "🥕";
              const caption = { empty: "PLANT", waiting: "WAIT", thirsty: "WATER", watering: "WATERED", growing: "GROW", ready: "HARVEST", dead: "CLEAR" }[plot.stage];
              return (
                <div className="l4-plot-wrap" key={i} style={{ left: `${((pos.x + 0.5) / COLS) * 100}%`, top: `${BOARD_ROW_Y[pos.y]}%` }}>
                  <button type="button" className={`l4-plot l4-${plot.stage} ${rabbit?.phase === "eating" && !rabbit.scared && rabbit.targetIndex === i ? "l4-plot-rabbit-danger" : ""}`} disabled={paused || !!result} onClick={() => clickPlot(i)}>
                    {plot.stage === "dead" ? <img src="/dead-plant.png" alt="Dead plant" /> : <span>{icon}</span>}
                    <b>{caption}</b>
                    {["waiting", "growing"].includes(plot.stage) && <small>{seconds}s</small>}
                  </button>
                  {plot.stage === "thirsty" && (
                    <button className="l4-plot-water" type="button" disabled={paused || !!result} onClick={() => clickPlot(i, "water")} aria-label={`Water ${plot.crop} plant, ${seconds} seconds left`}>
                      <img src="/water-bucket.png" alt="" />
                      <small>{seconds}s</small>
                    </button>
                  )}
                </div>
              );
            })}

            {/* CHICKEN ENCLOSURE: no visible title. Chickens use pen-relative positions.
                Keeping the animals INSIDE this element guarantees that
                they walk inside the fence, never elsewhere on the board. */}
            <div className="l4-chicken-pen" role="group" aria-label="Chicken enclosure">
              <img className="l4-pen-fence l4-pen-fence-back" src="/chicken-fence.png" alt="" draggable="false" />

              {chickens.map((c) => {
                const countdown = Math.ceil(Math.max(0, c.due - now) / 1000);
                return (
                  <div
                    className={`l4-chicken l4-chicken-${c.state}`}
                    key={c.id}
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  >
                    <img
                      className="l4-hen-photo"
                      src="/chicken.png"
                      alt="Chicken"
                      draggable="false"
                    />

                    {/* No 'Chicken 1' / 'Chicken 2' labels.
                        Just a Level 1-style water bucket above each hen. */}
                    {c.state === "thirsty" && (
                      <button
                        type="button"
                        className="l4-hen-water"
                        disabled={paused || !!result}
                        onClick={() => waterChicken(c.id)}
                        aria-label={`Water chicken ${c.id} — ${countdown} seconds left`}
                      >
                        <img src="/water-bucket.png" alt="" />
                        <span>{countdown}s</span>
                      </button>
                    )}
                    {c.state === "laying" && (
                      <span className="l4-hen-status">🥚 {countdown}s</span>
                    )}
                    {c.state === "dead" && (
                      <span className="l4-hen-status l4-hen-rip">💀 RIP</span>
                    )}
                  </div>
                );
              })}

              {/* Each egg is a separate object on the grass, not attached to a hen.
                  Tap/click the egg itself to load it into the truck. */}
              {groundEggs.map((egg) => (
                <button
                  type="button"
                  key={egg.id}
                  className="l4-ground-egg"
                  style={{ left: `${egg.x}%`, top: `${egg.y}%` }}
                  disabled={paused || !!result || egg.pending}
                  onClick={() => collectEgg(egg.id)}
                  aria-label="Collect egg from the grass"
                  title="COLLECT EGG"
                >
                  <span className="l4-egg-icon">🥚</span>
                  <span className="l4-egg-caption">{egg.pending ? "COLLECTING" : "COLLECT EGG"}</span>
                </button>
              ))}

              {/* Front wooden rail adds depth; chickens and eggs stay clickable. */}
              <img className="l4-pen-fence l4-pen-fence-front" src="/chicken-fence.png" alt="" draggable="false" />
            </div>


            {/* COW FARM — replaces the barn, fenced in upper-right field. */}
            <div className="l4-cow-pen" role="group" aria-label="Cow enclosure">
              <img className="l4-cow-fence l4-cow-fence-back" src="/chicken-fence.png" alt="" draggable="false" />
              {cows.map((cow) => {
                const countdown = Math.ceil(Math.max(0, cow.due - now) / 1000);
                return (
                  <div key={cow.id} className={`l4-cow l4-cow-${cow.state}`}
                    style={{ left: `${cow.x}%`, top: `${cow.y}%` }}>
                    <img src="/cow.png" className="l4-cow-image" alt="Cow" draggable="false" />
                    {cow.state === "thirsty" && (
                      <button type="button" className="l4-cow-water"
                        onClick={() => waterCow(cow.id)} disabled={paused || !!result}
                        aria-label={`Water cow ${cow.id}, ${countdown} seconds left`}>
                        <img src="/water-bucket.png" alt="" /><span>{countdown}s</span>
                      </button>
                    )}
                    {cow.state === "milking" && <span className="l4-cow-timer">🥛 {countdown}s</span>}
                    {cow.state === "dead" && <span className="l4-cow-timer l4-cow-rip">💀 RIP</span>}
                  </div>
                );
              })}
              {groundMilk.map((milk) => (
                <button key={milk.id} type="button" className="l4-ground-milk"
                  style={{ left: `${milk.x}%`, top: `${milk.y}%` }}
                  disabled={paused || !!result || milk.pending}
                  onClick={() => collectMilk(milk.id)}
                  title="COLLECT MILK" aria-label="Collect milk from the grass">
                  <span className="l4-milk-packet" aria-hidden="true">MILK</span><small>{milk.pending ? "COLLECTING" : "COLLECT MILK"}</small>
                </button>
              ))}
              <img className="l4-cow-fence l4-cow-fence-front" src="/chicken-fence.png" alt="" draggable="false" />
            </div>

            {/* A ready carrot allows a rabbit visit; shooing gives 15s of protection. */}
            {rabbit && (
              <button type="button" className={`l4-rabbit l4-rabbit-${rabbit.phase} ${rabbit.scared ? "l4-rabbit-scared" : ""}`}
                style={{ left: `${rabbit.x}%`, top: `${rabbit.y}%` }}
                onClick={scareRabbit} disabled={paused || !!result || rabbit.scared}
                aria-label="Shoo away rabbit before it eats a carrot" title="CLICK TO SHOO!">
                <img
                  src={rabbit.phase === "running" && !paused && !rabbit.scared ? "/rabbit-running.gif" : "/rabbit.png"}
                  alt="Rabbit"
                  draggable="false"
                />
                {rabbit.phase === "peek" && <span className="l4-rabbit-alert">👀 5s PEEK</span>}
              </button>
            )}

            {/* Farmer stays put after any command; enters pens only for animals/eggs/milk. */}
            <div ref={farmerNodeRef} className={`l4-farmer ${(farmerInsidePen || farmerInsideCowPen) ? "l4-farmer-in-pen" : ""} ${walking ? "l4-farmer-walking" : ""}`} style={{ left: `${farmerVisual.left}%`, top: `${farmerVisual.top}%` }}>
              {speech && <span className="l4-speech">{speech}</span>}
              <img src="/farmer-character.png" alt="Farmer" draggable="false" />
            </div>

            <div className={`l4-truck ${driving ? "l4-driving" : ""}`}>
              <div
                className="l4-truck-visual"
                tabIndex={0}
                onClick={(event) => event.currentTarget.focus()}
                role="group"
                aria-label={`Delivery truck: ${cargo.carrot} carrots, ${cargo.onion} onions, ${cargo.egg} eggs, ${cargo.milk} milk packets; ${cargoCount(cargo)} of ${TRUCK_LIMIT} items loaded. Hover or focus for details.`}
              >
                <img src="/delivery-car.png" alt="Delivery truck" draggable="false" />
                <div className="l4-cargo-icons">
                  {Object.entries(cargo).flatMap(([type, qty]) => Array.from({ length: qty }, (_, i) => <span key={`${type}-${i}`}>{type === "carrot" ? "🥕" : type === "onion" ? "🧅" : type === "milk" ? "📦" : "🥚"}</span>))}
                </div>
                {/* Hover the truck (or keyboard-focus it) for CURRENT cargo. */}
                <div className="l4-truck-tooltip" aria-hidden="true">
                  <strong>🚚 Truck Load</strong>
                  <span>🥕 Carrot <b>{cargo.carrot}</b></span>
                  <span>🧅 Onion <b>{cargo.onion}</b></span>
                  <span>🥚 Egg <b>{cargo.egg}</b></span>
                  <span>📦 Milk <b>{cargo.milk}</b></span>
                  <span className="l4-truck-tooltip-total">Total <b>{cargoCount(cargo)}/{TRUCK_LIMIT}</b></span>
                </div>
              </div>
              <div className="l4-truck-label">📦 {cargoCount(cargo)}/{TRUCK_LIMIT}</div>
              {!driving && <button className="l4-go" type="button" onClick={deliver} disabled={!cargoCount(cargo) || paused || !!result}>GO 🚚</button>}
            </div>
          </div>
          <div className="l4-message" role="status">{message}</div>
        </section>

        <aside className="l4-sidebar">
          <section className="l4-panel">
            <h2>🌱 Choose Seed</h2>
            <p>Select a crop <b>before</b> clicking PLANT.</p>
            <div className="l4-seed-select">
              <button className={selected === "carrot" ? "active" : ""} type="button" onClick={() => chooseSeed("carrot")} disabled={paused || !!result}>🥕 Carrot <small>{stats.carrotSeeds} seeds</small></button>
              <button className={selected === "onion" ? "active" : ""} type="button" onClick={() => chooseSeed("onion")} disabled={paused || !!result}>🧅 Onion <small>{stats.onionSeeds} seeds</small></button>
            </div>
          </section>
          <section className="l4-panel">
            <h2>🎯 Today's Missions</h2>
            <p>🥕 Carrots harvested: <b>{stats.carrotsHarvested}/{TARGET_CARROTS}</b></p>
            <p>🧅 Onions harvested: <b>{stats.onionsHarvested}/{TARGET_ONIONS}</b></p>
            <p>🥚 Eggs collected: <b>{stats.eggsCollected}/{TARGET_EGGS}</b></p>
            <p>📦 Milk collected: <b>{stats.milkCollected}/{TARGET_MILK}</b></p>
            <p>🪙 Delivery Coins: <b>{stats.income}/{TARGET_INCOME}</b></p>
            <small>Deliver your products using GO to earn 800 Coins. Seed purchases do not reduce delivery income.</small>
          </section>
          <section className="l4-panel">
            <h2>🛒 Farmer's Shop</h2>
            <button type="button" onClick={() => buySeed("carrot")} disabled={stats.coins < SEED_PRICE.carrot || paused || !!result}>🥕 Buy Carrot Seed — {SEED_PRICE.carrot} Coins</button>
            <button type="button" onClick={() => buySeed("onion")} disabled={stats.coins < SEED_PRICE.onion || paused || !!result}>🧅 Buy Onion Seed — {SEED_PRICE.onion} Coins</button>
            <small>No auto-buy. Seeds cannot be planted at 0.</small>
          </section>
        </aside>
      </div>

      {paused && !result && <div className="l4-overlay"><div className="l4-modal"><h2>⏸ Game Paused</h2><p>The clock, crops, cows, chickens, rabbit and truck are frozen.</p><button type="button" onClick={togglePause}>▶ RESUME</button><button type="button" className="farm-exit-modal-button" onClick={onExit}>EXIT → START</button></div></div>}
      {/* Level 4 result uses the SAME visual design as Level 1's result card. */}
      {result && (
        <div className="l4-overlay l4-result-overlay">
          <section
            className="l4-modal l4-result-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="l4-result-title"
          >
            <div className="l4-result-trophy">{result === "won" ? "🏆" : "⏰"}</div>
            <h2 id="l4-result-title">
              {result === "won" ? "Level 4 Complete!" : "Game Over!"}
            </h2>
            <p className="l4-result-intro">
              Time's up! Your 5-minute farming round has ended.
            </p>

            <div className="l4-result-list">
              <p>🥕 Carrots harvested: <strong>{stats.carrotsHarvested}</strong> / {TARGET_CARROTS}</p>
              <p>🧅 Onions harvested: <strong>{stats.onionsHarvested}</strong> / {TARGET_ONIONS}</p>
              <p>🥚 Eggs collected: <strong>{stats.eggsCollected}</strong> / {TARGET_EGGS}</p>
              <p>📦 Milk collected: <strong>{stats.milkCollected}</strong> / {TARGET_MILK}</p>
              <p>📦 Products delivered: <strong>{stats.delivered}</strong></p>
              <p>🪙 Delivery income: <strong>{stats.income}</strong> / {TARGET_INCOME} Coins</p>
            </div>

            {result === "won" && (
              <div className="l4-result-reward">🎉 +{BONUS} Bonus Coins!</div>
            )}

            <div className="l4-result-total">
              <span>🪙 Total Earned Coins</span>
              <strong>{stats.income + (result === "won" ? BONUS : 0)} Coins</strong>
            </div>

            <p className="l4-result-wallet">
              Wallet after seed and clearing costs: <strong>{stats.coins} Coins</strong>
            </p>

            {result === "won" ? (
              <p className="l4-result-unlocked">🔓 Level 5 Unlocked!</p>
            ) : (
              <p className="l4-result-lose-note">
                Harvest {TARGET_CARROTS} carrots, {TARGET_ONIONS} onions,
                collect {TARGET_EGGS} eggs and {TARGET_MILK} milk packets,
                and earn at least {TARGET_INCOME} delivery Coins to win!
              </p>
            )}

            <div className="l4-result-actions">
              {result === "won" && onNextLevel && (
                <button
                  type="button"
                  className="l4-result-button l4-result-next"
                  onClick={onNextLevel}
                >
                  NEXT LEVEL ➜
                </button>
              )}
              <button
                type="button"
                className="l4-result-button"
                onClick={restart}
              >
                ↻ PLAY AGAIN
              </button>
              <button type="button" className="l4-result-button farm-exit-modal-button" onClick={onExit}>EXIT → START</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
