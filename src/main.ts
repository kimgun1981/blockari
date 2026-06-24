import "./style.css";
import { CanvasRenderer } from "./render/CanvasRenderer";
import { GameEngine } from "./game/GameEngine";
import { KeyboardInput } from "./input/KeyboardInput";
import { TouchInput } from "./input/TouchInput";
import { ButtonInput } from "./input/ButtonInput";
import { HUD } from "./ui/HUD";
import { StartScreen, type StartChoice } from "./ui/StartScreen";
import { loadSettings, saveSettings } from "./ui/settings";
import { setHaptics } from "./input/haptics";
import { audio } from "./audio/ChiptuneEngine";
import { dailySeed } from "./game/rng";
import { loadLastReplay, decodeReplay, type Replay } from "./game/replay";
import { THEMES } from "./render/themes";

// 확장: 일일 챌린지 · 리플레이 · 리더보드 · 테마 · 색맹 모드
function boot() {
  const canvas = document.getElementById("board") as HTMLCanvasElement | null;
  const stage = document.getElementById("stage");
  const controls = document.getElementById("controls");
  if (!canvas || !stage || !controls) {
    console.error("필수 DOM 요소를 찾을 수 없습니다.");
    return;
  }

  const settings = loadSettings();
  setHaptics(settings.haptics);
  document.body.classList.toggle("crt", settings.crt);

  const renderer = new CanvasRenderer(canvas);
  const hud = new HUD();
  const engine = new GameEngine(renderer, (v) => hud.update(v));

  // 테마/색맹 적용
  const applyTheme = () => {
    renderer.setTheme(settings.theme);
    hud.setTheme(settings.theme);
    document.documentElement.style.setProperty(
      "--accent",
      THEMES[settings.theme].accent
    );
  };
  applyTheme();
  renderer.setColorblind(settings.colorblind);

  // 입력기
  const keyboard = new KeyboardInput(engine);
  keyboard.attach();
  const touch = new TouchInput(engine, stage);
  const buttons = new ButtonInput(engine, controls, {
    das: settings.das,
    arr: settings.arr,
  });

  const detachInputs = () => {
    touch.detach();
    buttons.detach();
  };
  const applyInputMode = () => {
    detachInputs();
    if (settings.inputMode === "buttons") buttons.attach();
    else touch.attach();
    // D-pad 표시 후 레이아웃이 바뀌므로 보드 크기를 다시 계산
    renderer.resize();
    requestAnimationFrame(() => renderer.resize());
  };

  const onResize = () => renderer.resize();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  // 보드 영역 크기가 바뀔 때마다(예: D-pad 표시로 줄어들 때) 자동 재계산
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => renderer.resize()).observe(stage);
  }

  // Wake Lock
  let wakeLock: WakeLockSentinel | null = null;
  const requestWake = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* 무시 */
    }
  };
  const releaseWake = () => {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && engine.status === "playing") {
      requestWake();
    }
  });

  const applyAudioSettings = () => {
    audio.setBgmEnabled(settings.bgm);
    audio.setSfxEnabled(settings.sfx);
    audio.setBgmVolume(settings.bgmVol);
    audio.setSfxVolume(settings.sfxVol);
  };

  // 공통 시작 준비 (사용자 제스처 → 오디오 활성화)
  const prepare = () => {
    startScreen.hide();
    setHaptics(settings.haptics);
    audio.init();
    audio.resume();
    audio.setMuted(false);
    applyAudioSettings();
    renderer.resize();
    requestWake();
  };

  const startGame = (choice: StartChoice) => {
    prepare();
    applyInputMode();
    engine.start(choice);
  };
  const startDaily = () => {
    prepare();
    applyInputMode();
    engine.start({ startLevel: 1, autoLevelUp: true, seed: dailySeed(), daily: true });
  };
  const playReplay = (r: Replay) => {
    prepare();
    detachInputs(); // 리플레이 중 사용자 입력 차단
    engine.startReplay(r);
  };
  const playLastReplay = () => {
    const r = loadLastReplay();
    if (r) playReplay(r);
  };

  const startScreen = new StartScreen(
    {
      onStart: startGame,
      onDaily: startDaily,
      onReplay: playLastReplay,
      onThemeChange: () => applyTheme(),
      onColorblindChange: (on) => renderer.setColorblind(on),
    },
    settings
  );

  const goMenu = () => {
    engine.stop();
    releaseWake();
    detachInputs();
    startScreen.show();
  };

  // 상단바
  const soundBtn = document.getElementById("btn-sound")!;
  const syncSoundBtn = () => {
    soundBtn.textContent = audio.isMuted() ? "🔇" : "🔊";
  };
  soundBtn.addEventListener("click", () => {
    audio.init();
    const next = !audio.isMuted();
    audio.setMuted(next);
    settings.bgm = !next;
    settings.sfx = !next;
    saveSettings(settings);
    syncSoundBtn();
  });
  document
    .getElementById("btn-pause")!
    .addEventListener("click", () => engine.togglePause());
  document.getElementById("btn-menu")!.addEventListener("click", goMenu);
  window.addEventListener("keydown", (ev) => {
    if (ev.code === "KeyM" && !ev.repeat) goMenu();
  });

  // 공유 리플레이 링크 (#r=...) 자동 재생
  const hash = location.hash;
  if (hash.startsWith("#r=")) {
    const r = decodeReplay(hash.slice(3));
    history.replaceState(null, "", location.pathname); // 해시 제거
    if (r) {
      playReplay(r);
    } else {
      startScreen.show();
    }
  } else {
    startScreen.show();
  }

  // PWA 서비스워커 (프로덕션 빌드에서만, base 경로 기준 등록)
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL })
        .catch(() => {});
    });
  }

  console.log("BLOCKARI — 확장: 일일챌린지·리플레이·리더보드·테마·색맹");
}

boot();
