import { useEffect, useRef, useState } from "react";
import LevelChoose from "./LevelChoose";
import LevelRules from "./LevelRules";
import Level2Rules from "./Level2Rules";
import Level3Rules from "./Level3Rules";
import Level4Rules from "./Level4Rules";
import Level5Rules from "./Level5Rules";
import FarmGame from "./FarmGame";
import Level2Game from "./Level2Game";
import Level3Game from "./Level3Game";
import Level4Game from "./Level4Game";
import Level5Game from "./Level5Game";
import "./StartPage.css";
import "./MobileLandscape.css";

// Preload commonly used game artwork after the first page renders.
// Images are cached by the browser when possible. This does not alter game timers.
const GAME_IMAGES = [
  "/farm-cover.jpg",
  "/level.jpg",
  "/level1background.jpg",
  "/farmer-character.png",
  "/barn.png",
  "/chicken.png",
  "/cow.png",
  "/rabbit.png",
  "/delivery-car.png",
  "/water-bucket.png",
  "/dead-plant.png",
];

function preloadGameImages() {
  GAME_IMAGES.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

// Original little farm background tune (music is optional).
const MELODY = [
  392, 440, 523.25, 659.25, 523.25, 440, 392, 329.63,
  349.23, 392, 440, 523.25, 440, 392, 349.23, 329.63,
];

// Preserve the current screen when the browser refreshes this tab.
// sessionStorage only remembers the screen, not the live farming round.
const LAST_PAGE_KEY = "littleFarmCurrentPage";
const VALID_PAGES = new Set([
  "start", "levels", "rules1", "rules2", "rules3", "rules4", "rules5",
  "game1", "game2", "game3", "game4", "game5",
]);

function getInitialPage() {
  try {
    const saved = window.sessionStorage.getItem(LAST_PAGE_KEY);
    return VALID_PAGES.has(saved) ? saved : "start";
  } catch {
    return "start";
  }
}

export default function StartPage() {
  const [page, setPage] = useState(getInitialPage);

  useEffect(() => {
    preloadGameImages();
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LAST_PAGE_KEY, page);
    } catch {
      // Private-mode / blocked storage: keep the game usable.
    }
  }, [page]);

  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  function stopMusic() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }
    setMusicOn(false);
  }

  function playNote(context, frequency) {
    if (context.state === "closed") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const t = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.36);
  }

  async function toggleMusic() {
    if (musicOn) { stopMusic(); return; }
    const Engine = window.AudioContext || window.webkitAudioContext;
    if (!Engine) return;
    const audio = new Engine();
    audioRef.current = audio;
    try {
      await audio.resume();
      let noteIndex = 0;
      function nextNote() {
        if (audio.state !== "running") return;
        playNote(audio, MELODY[noteIndex % MELODY.length]);
        noteIndex++;
      }
      nextNote();
      intervalRef.current = setInterval(nextNote, 410);
      setMusicOn(true);
    } catch { stopMusic(); }
  }

  useEffect(() => () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    if (audioRef.current) audioRef.current.close().catch(() => {});
  }, []);

  const goToStart = () => {
    try { window.sessionStorage.setItem(LAST_PAGE_KEY, "start"); } catch { /* storage unavailable */ }
    setPage("start");
  };
  const goToLevels = () => setPage("levels");
  const playLevelOne = () => setPage("rules1");
  const startLevelOne = () => setPage("game1");
  const startLevelTwo = () => setPage("game2");
  const startLevelThree = () => setPage("game3");
  const startLevelFour = () => setPage("game4");
  const startLevelFive = () => setPage("game5");

  function playSelectedLevel(level) {
    if (level === 1) { playLevelOne(); return; }
    if (level >= 2 && level <= 5) {
      let unlocked = 1;
      try { unlocked = Number(localStorage.getItem("littleFarmUnlockedLevel") || 1); }
      catch { /* browser without storage */ }
      if (unlocked >= level) setPage(`rules${level}`);
    }
  }

  if (page === "levels") {
    return (
      <LevelChoose
        onBack={goToStart}
        onPlay={playLevelOne}
        onPlayLevel={playSelectedLevel}
        musicOn={musicOn}
        onToggleMusic={toggleMusic}
      />
    );
  }

  if (page === "rules1") {
    return <LevelRules onBack={goToLevels} onFinish={startLevelOne} />;
  }
  if (page === "rules2") {
    return <Level2Rules onBack={goToLevels} onFinish={startLevelTwo} />;
  }
  if (page === "rules3") {
    return <Level3Rules onBack={goToLevels} onFinish={startLevelThree} />;
  }
  if (page === "rules4") {
    return <Level4Rules onBack={goToLevels} onFinish={startLevelFour} />;
  }
  if (page === "rules5") {
    return <Level5Rules onBack={goToLevels} onFinish={startLevelFive} />;
  }

  if (page === "game1") {
    return <FarmGame onNextLevel={goToLevels} onExit={goToStart} />;
  }
  if (page === "game2") {
    // Level 2 intentionally has no Back button during gameplay.
    return <Level2Game onNextLevel={goToLevels} onExit={goToStart} />;
  }
  if (page === "game3") {
    return <Level3Game onNextLevel={goToLevels} onExit={goToStart} />;
  }
  if (page === "game4") {
    return <Level4Game onNextLevel={goToLevels} onExit={goToStart} />;
  }
  if (page === "game5") {
    return <Level5Game onNextLevel={goToLevels} onExit={goToStart} />;
  }

  return (
    <main className="farm-start-page">
      <div className="farm-start-shade" aria-hidden="true" />
      <header className="farm-start-topbar">
        <span className="farm-start-brand">🌾 LITTLE FARM ADVENTURE</span>
        <button className="farm-music-button" type="button" onClick={toggleMusic} aria-pressed={musicOn}>
          {musicOn ? "🔊 Music ON" : "🔇 Music OFF"}
        </button>
      </header>
      <section className="farm-start-center">
        <div className="farm-start-kicker">🌻 Welcome to your little farm 🌻</div>
        <h1 className="farm-start-title">Little Farm <span>Adventure</span></h1>
        <p className="farm-start-subtitle">Grow your crops. Care for your animals. Build your dream farm!</p>
        <button className="farm-play-button" type="button" onClick={goToLevels}>▶ START GAME</button>
      </section>
    </main>
  );
}
