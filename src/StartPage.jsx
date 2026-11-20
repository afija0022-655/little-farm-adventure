import { useEffect, useRef, useState } from "react";
import LevelChoose from "./LevelChoose";
import LevelRules from "./LevelRules";
import Level2Rules from "./Level2Rules";
import FarmGame from "./FarmGame";
import Level2Game from "./Level2Game";
import "./StartPage.css";

// Original little farm background tune (music is optional).
const MELODY = [
  392, 440, 523.25, 659.25, 523.25, 440, 392, 329.63,
  349.23, 392, 440, 523.25, 440, 392, 349.23, 329.63,
];

export default function StartPage() {
  const [page, setPage] = useState("start");
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

  const goToStart = () => setPage("start");
  const goToLevels = () => setPage("levels");
  const playLevelOne = () => setPage("rules1");
  const startLevelOne = () => setPage("game1");
  const startLevelTwo = () => setPage("game2");

  function playSelectedLevel(level) {
    if (level === 1) { playLevelOne(); return; }
    if (level === 2) {
      let unlocked = 1;
      try {
        unlocked = Number(localStorage.getItem("littleFarmUnlockedLevel") || 1);
      } catch { /* browser without storage */ }
      if (unlocked >= 2) setPage("rules2"); // RULES FIRST, no automatic countdown.
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

  if (page === "game1") {
    return <FarmGame onNextLevel={goToLevels} />;
  }

  if (page === "game2") {
    // Level 2 intentionally has no Back button during gameplay.
    return <Level2Game onNextLevel={goToLevels} />;
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
