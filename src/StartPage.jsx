
import { useEffect, useRef, useState } from "react";

import LevelChoose from "./LevelChoose";
import LevelRules from "./LevelRules";
import FarmGame from "./FarmGame";

import "./StartPage.css";

// BACKGROUND MUSIC NOTES
const MELODY = [
  392, 440, 523.25, 659.25,
  523.25, 440, 392, 329.63,
  349.23, 392, 440, 523.25,
  440, 392, 349.23, 329.63,
];

export default function StartPage() {
  // PAGE CONTROL
  const [screen, setScreen] = useState("start");

  // MUSIC CONTROL
  const [musicOn, setMusicOn] = useState(false);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // STOP BACKGROUND MUSIC
  function stopMusic() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;

      audio.close().catch(() => {});
    }

    setMusicOn(false);
  }

  // PLAY A MUSIC NOTE
  function playNote(audio, frequency) {
    if (audio.state !== "running") return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    const time = audio.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      frequency,
      time
    );

    gain.gain.setValueAtTime(
      0.0001,
      time
    );

    gain.gain.exponentialRampToValueAtTime(
      0.04,
      time + 0.04
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      time + 0.35
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(time);
    oscillator.stop(time + 0.36);
  }

  // MUSIC ON / OFF
  async function toggleMusic() {
    if (audioRef.current) {
      stopMusic();
      return;
    }

    const AudioClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioClass) {
      alert("Your browser does not support audio.");
      return;
    }

    const audio = new AudioClass();
    audioRef.current = audio;

    try {
      await audio.resume();

      if (audioRef.current !== audio) return;

      let noteIndex = 0;

      function playNextNote() {
        if (audio.state !== "running") return;

        const frequency =
          MELODY[noteIndex % MELODY.length];

        playNote(audio, frequency);
        noteIndex++;
      }

      playNextNote();

      intervalRef.current = setInterval(
        playNextNote,
        410
      );

      setMusicOn(true);
    } catch (error) {
      console.error("Music error:", error);
      stopMusic();
    }
  }

  // CLEAN UP MUSIC
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }

      if (audioRef.current) {
        audioRef.current.close().catch(() => {});
      }
    };
  }, []);

  // START GAME -> LEVEL SELECTION
  function goToLevels() {
    setScreen("levels");
  }

  // LEVEL 1 PLAY -> RULES
  function playLevelOne() {
    setScreen("rules");
  }

  // RULES FINISH -> LEVEL 1 GAME
  function startLevelOneGame() {
    stopMusic();
    setScreen("game");
  }

  // BACK TO START PAGE
  function goToStart() {
    setScreen("start");
  }

  // ================================
  // LEVEL SELECTION SCREEN
  // ================================
  if (screen === "levels") {
    return (
      <LevelChoose
        onBack={goToStart}
        onPlay={playLevelOne}
        musicOn={musicOn}
        onToggleMusic={toggleMusic}
      />
    );
  }

  // ================================
  // LEVEL 1 RULES - 10 SECONDS
  // ================================
  if (screen === "rules") {
    return (
      <LevelRules
        onBack={goToLevels}
        onFinish={startLevelOneGame}
      />
    );
  }

  // ================================
  // FULL SCREEN LEVEL 1 GAME
  // NO BACK BUTTON
  // ================================
  if (screen === "game") {
    return <FarmGame />;
  }

  // ================================
  // MAIN STARTING PAGE
  // ================================
  return (
    <main className="farm-start-page">

      {/* BACKGROUND OVERLAY */}
      <div className="farm-start-shade" />

      {/* TOP NAVIGATION */}
      <header className="farm-start-topbar">

        {/* GAME NAME */}
        <span className="farm-start-brand">
          🌾 LITTLE FARM ADVENTURE
        </span>

        {/* MUSIC BUTTON */}
        <button
          type="button"
          className="farm-music-button"
          onClick={toggleMusic}
          aria-pressed={musicOn}
        >
          {musicOn
            ? "🔊 Music ON"
            : "🔇 Music OFF"}
        </button>

      </header>

      {/* MAIN CONTENT */}
      <section className="farm-start-center">

        {/* WELCOME TEXT */}
        <div className="farm-start-kicker">
          🌻 Welcome to your little farm 🌻
        </div>

        {/* GAME TITLE */}
        <h1 className="farm-start-title">
          Little Farm
          <span>Adventure</span>
        </h1>

        {/* SUBTITLE */}
        <p className="farm-start-subtitle">
          Grow your crops. Care for your farm.
          Begin your adventure!
        </p>

        {/* START GAME BUTTON */}
        <button
          type="button"
          className="farm-play-button"
          onClick={goToLevels}
        >
          ▶ START GAME
        </button>

      </section>

    </main>
  );
}
