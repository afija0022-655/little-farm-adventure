
import { useEffect, useRef, useState } from "react";
import LevelChoose from "./LevelChoose";
import LevelRules from "./LevelRules";
import FarmGame from "./FarmGame";
import "./StartPage.css";

const MELODY = [
  392, 440, 523.25, 659.25,
  523.25, 440, 392, 329.63,
  349.23, 392, 440, 523.25,
  440, 392, 349.23, 329.63,
];

export default function StartPage() {
  // Page navigation
  const [screen, setScreen] = useState("start");

  // Music state
  const [musicOn, setMusicOn] = useState(false);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Stop background music
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

  // Play music notes
  function playNote(audio, frequency) {
    if (audio.state !== "running") return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const time = audio.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0.0001, time);

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

  // Music ON / OFF
  async function toggleMusic() {
    if (audioRef.current) {
      stopMusic();
      return;
    }

    const AudioClass =
      window.AudioContext || window.webkitAudioContext;

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

      const playNextNote = () => {
        if (audio.state !== "running") return;

        const frequency =
          MELODY[noteIndex % MELODY.length];

        playNote(audio, frequency);
        noteIndex++;
      };

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

  // Clean up music
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

  // START -> LEVEL CHOOSE
  function goToLevels() {
    setScreen("levels");
  }

  // PLAY -> SHOW RULES
  function playLevelOne() {
    setScreen("rules");
  }

  // RULES FINISHED -> GAME
  function startLevelOneGame() {
    stopMusic();
    setScreen("game");
  }

  // BACK TO START
  function goToStart() {
    setScreen("start");
  }

  // LEVEL CHOOSE PAGE
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

  // LEVEL 1 RULES PAGE - 10 SECONDS
  if (screen === "rules") {
    return (
      <LevelRules
        onBack={goToLevels}
        onFinish={startLevelOneGame}
      />
    );
  }

  // LEVEL 1 FARMING GAME
  if (screen === "game") {
    return (
      <>
        <button
          type="button"
          onClick={goToLevels}
          style={{
            position: "fixed",
            top: "15px",
            left: "15px",
            zIndex: 1000,
            padding: "12px 20px",
            background: "#27683e",
            color: "white",
            border: "2px solid white",
            borderRadius: "20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ← BACK TO LEVELS
        </button>

        <FarmGame />
      </>
    );
  }

  // MAIN START PAGE
  return (
    <main className="farm-start-page">

      {/* Background overlay */}
      <div className="farm-start-shade" />

      {/* Top navigation */}
      <header className="farm-start-topbar">

        <span className="farm-start-brand">
          🌾 LITTLE FARM ADVENTURE
        </span>

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

      {/* Start screen */}
      <section className="farm-start-center">

        <div className="farm-start-kicker">
          🌻 Welcome to your little farm 🌻
        </div>

        <h1 className="farm-start-title">
          Little Farm
          <span>Adventure</span>
        </h1>

        <p className="farm-start-subtitle">
          Grow your crops. Care for your farm.
          Begin your adventure!
        </p>

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
