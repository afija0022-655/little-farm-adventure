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

// Prepare gameplay images BEFORE mounting a timed level.
// Missing optional artwork must never trap the player on a loading screen.
const COMMON_IMAGES = [
  "/farmer-character.png", "/delivery-car.png", "/water-bucket.png", "/dead-plant.png",
];
const LEVEL_IMAGES = {
  1: ["/barn.png"],
  2: ["/chicken.png"],
  3: ["/chicken.png", "/cow.png", "/rabbit.png"],
  4: ["/chicken.png", "/cow.png", "/rabbit.png"],
  5: ["/chicken.png", "/cow.png", "/rabbit.png"],
};
const imagePromises = new Map();
function loadImage(src) {
  if (!imagePromises.has(src)) {
    imagePromises.set(src, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
      if (img.complete) resolve(img.naturalWidth > 0);
    }));
  }
  return imagePromises.get(src);
}
function preloadLevel(level) {
  return Promise.all([...COMMON_IMAGES, ...(LEVEL_IMAGES[level] || [])].map(loadImage));
}

// The game component mounts AFTER artwork loading; that is when its clock starts.
function GameAssetsGate({ level, children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => { if (active) setReady(true); }, 12000);
    preloadLevel(level).then(() => { if (active) setReady(true); });
    return () => { active = false; clearTimeout(timeout); };
  }, [level]);
  if (!ready) {
    return (
      <main className="farm-assets-loading" role="status" aria-live="polite">
        <div className="farm-assets-loading-card">
          <div style={{ fontSize: 42 }}>🌱🚜</div>
          <h2>Preparing your farm...</h2>
          <p>Loading game pictures before the timer starts.</p>
        </div>
      </main>
    );
  }
  return children;
}

// A browser may support orientation locking (mostly some Android/fullscreen browsers).
// iOS Safari and Facebook/Messenger can reject it. Do not fake rotation or block play.
function tryLandscape() {
  try {
    const promise = window.screen?.orientation?.lock?.("landscape");
    promise?.catch?.(() => {});
  } catch { /* unsupported: normal responsive layout remains usable */ }
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
  const [manualLandscape, setManualLandscape] = useState(false);
  const [browserHelp, setBrowserHelp] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inAppBrowser = typeof navigator !== "undefined" &&
    /FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(navigator.userAgent);
  const [portraitPhone, setPortraitPhone] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(orientation: portrait) and (pointer: coarse)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
    const update = () => {
      setPortraitPhone(query.matches);
      if (!query.matches) setManualLandscape(false);
    };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("farm-manual-landscape", manualLandscape && portraitPhone);
    return () => document.body.classList.remove("farm-manual-landscape");
  }, [manualLandscape, portraitPhone]);

  function openInBrowser() {
    // In-app browsers control whether a link can leave their webview.
    setBrowserHelp(true);
    window.open("https://little-farm-adventure.vercel.app/", "_blank", "noopener,noreferrer");
  }

  async function copyGameLink() {
    const link = "https://little-farm-adventure.vercel.app/";
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
      // Show selectable link if clipboard permission is unavailable.
    }
    setBrowserHelp(true);
  }

  useEffect(() => {
    // Let the landing page render first; gently prepare Level 1 images afterward.
    const timer = setTimeout(() => { preloadLevel(1); }, 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LAST_PAGE_KEY, page);
    } catch {
      // Private-mode / blocked storage: keep the game usable.
    }
  }, [page]);

  const [musicOn, setMusicOn] = useState(false);
  const [musicError, setMusicError] = useState("");
  const audioRef = useRef(null);
  const musicEnabledRef = useRef(false);

  function getMusic() {
    if (!audioRef.current) {
      const audio = new Audio("/little-farm-melody.wav");
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0.9;
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function stopMusic() {
    musicEnabledRef.current = false;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setMusicOn(false);
    setMusicError("");
  }

  function toggleMusic() {
    if (musicEnabledRef.current) { stopMusic(); return; }
    try {
      const audio = getMusic();
      musicEnabledRef.current = true;
      setMusicError("");
      // Play is called synchronously inside the user's click/tap.
      // This is more reliable on iPhone than awaiting AudioContext.resume().
      const playing = audio.play();
      if (playing && typeof playing.then === "function") {
        playing.then(() => {
          if (musicEnabledRef.current) setMusicOn(true);
        }).catch(() => {
          musicEnabledRef.current = false;
          setMusicOn(false);
          setMusicError("Music was blocked. Check volume / Silent Mode and tap Music ON again.");
        });
      } else {
        setMusicOn(true);
      }
    } catch {
      musicEnabledRef.current = false;
      setMusicOn(false);
      setMusicError("Music could not start on this browser.");
    }
  }

  useEffect(() => {
    function handleReturn() {
      // Do not autoplay on first load; only resume after an explicit ON tap.
      if (document.visibilityState === "visible" && musicEnabledRef.current && audioRef.current?.paused) {
        audioRef.current.play().catch(() => { setMusicOn(false); musicEnabledRef.current = false; });
      }
    }
    document.addEventListener("visibilitychange", handleReturn);
    window.addEventListener("pageshow", handleReturn);
    return () => {
      document.removeEventListener("visibilitychange", handleReturn);
      window.removeEventListener("pageshow", handleReturn);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const goToStart = () => {
    setManualLandscape(false);
    try { window.sessionStorage.setItem(LAST_PAGE_KEY, "start"); } catch { /* storage unavailable */ }
    setPage("start");
  };
  const goToLevels = () => {
    setPage("levels");
    preloadLevel(1);
    tryLandscape();
  };
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

  function renderPage() {
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
    return <GameAssetsGate level={1}><FarmGame onNextLevel={goToLevels} onExit={goToStart} /></GameAssetsGate>;
  }
  if (page === "game2") {
    // Level 2 intentionally has no Back button during gameplay.
    return <GameAssetsGate level={2}><Level2Game onNextLevel={goToLevels} onExit={goToStart} /></GameAssetsGate>;
  }
  if (page === "game3") {
    return <GameAssetsGate level={3}><Level3Game onNextLevel={goToLevels} onExit={goToStart} /></GameAssetsGate>;
  }
  if (page === "game4") {
    return <GameAssetsGate level={4}><Level4Game onNextLevel={goToLevels} onExit={goToStart} /></GameAssetsGate>;
  }
  if (page === "game5") {
    return <GameAssetsGate level={5}><Level5Game onNextLevel={goToLevels} onExit={goToStart} /></GameAssetsGate>;
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
      {musicError && <p className="farm-music-error" role="alert">{musicError}</p>}
      <section className="farm-start-center">
        <div className="farm-start-kicker">🌻 Welcome to your little farm 🌻</div>
        <h1 className="farm-start-title">Little Farm <span>Adventure</span></h1>
        <p className="farm-start-subtitle">Grow your crops. Care for your animals. Build your dream farm!</p>
        <button className="farm-play-button" type="button" onClick={goToLevels}>▶ START GAME</button>
      </section>
    </main>
  );
  }

  return (
    <>
      <div className={manualLandscape && portraitPhone ? "farm-rotate-shell farm-rotate-active" : "farm-rotate-shell"}>
        {renderPage()}
      </div>
      {portraitPhone && page !== "start" && (
        <div className="farm-view-actions">
          <button className="farm-view-button" type="button" onClick={() => setManualLandscape(v => !v)} aria-pressed={manualLandscape}>
            {manualLandscape ? "↩ Normal View" : "↻ Play Sideways"}
          </button>
          {inAppBrowser && <button className="farm-view-button" type="button" onClick={openInBrowser}>↗ Open in Browser</button>}
        </div>
      )}
      {inAppBrowser && page === "start" && (
        <button className="farm-browser-start-button" type="button" onClick={openInBrowser}>↗ Open in Browser</button>
      )}
      {browserHelp && inAppBrowser && (
        <div className="farm-browser-help" role="dialog" aria-label="Open game in Safari or Chrome">
          <button type="button" className="farm-browser-close" onClick={() => setBrowserHelp(false)} aria-label="Close">×</button>
          <strong>Open in Safari or Chrome</strong>
          <p>If the game still opens inside Facebook/Messenger, tap its ••• menu and choose “Open in external browser” if available, or copy this link and paste it into Safari/Chrome.</p>
          <button type="button" onClick={copyGameLink}>{linkCopied ? "✓ Link Copied" : "Copy Game Link"}</button>
          <input aria-label="Game URL" readOnly value="https://little-farm-adventure.vercel.app/" onFocus={e => e.target.select()} />
        </div>
      )}
    </>
  );
}
