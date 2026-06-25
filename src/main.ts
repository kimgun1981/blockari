import "./style.css";
import { CanvasRenderer } from "./render/CanvasRenderer";
import { GameEngine } from "./game/GameEngine";
import { KeyboardInput } from "./input/KeyboardInput";
import { TouchInput } from "./input/TouchInput";
import { ButtonInput } from "./input/ButtonInput";
import { HUD } from "./ui/HUD";
import { StartScreen, type StartChoice } from "./ui/StartScreen";
import { LevelSelect } from "./ui/LevelSelect";
import { SettingsPanel } from "./ui/SettingsPanel";
import { loadSettings, saveSettings } from "./ui/settings";
import { setHaptics } from "./input/haptics";
import { audio } from "./audio/ChiptuneEngine";
import { THEMES } from "./render/themes";

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

  // 메뉴 화면 (아래에서 생성, 닫기 헬퍼는 미리 선언)
  let startScreen: StartScreen;
  let levelSelect: LevelSelect;
  let settingsPanel: SettingsPanel;
  const closeMenus = () => {
    startScreen?.hide();
    levelSelect?.hide();
    settingsPanel?.hide();
  };

  // 테마/색맹
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
    renderer.resize();
    requestAnimationFrame(() => renderer.resize());
  };

  const onResize = () => renderer.resize();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
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

  // 게임 시작 (시작 버튼 탭 = 사용자 제스처 → 오디오 활성화)
  const startGame = (choice: StartChoice) => {
    closeMenus();
    setHaptics(settings.haptics);
    audio.init();
    audio.resume();
    audio.setMuted(false);
    applyAudioSettings();
    applyInputMode();
    requestWake();
    engine.start(choice);
  };

  // 화면 인스턴스
  settingsPanel = new SettingsPanel(
    {
      onThemeChange: () => applyTheme(),
      onColorblindChange: (on) => renderer.setColorblind(on),
      onBack: () => {
        settingsPanel.hide();
        startScreen.show();
      },
    },
    settings
  );
  levelSelect = new LevelSelect({
    onStart: startGame,
    onBack: () => {
      levelSelect.hide();
      startScreen.show();
    },
  });
  startScreen = new StartScreen(
    {
      onStart: startGame,
      onLevelSelect: () => {
        startScreen.hide();
        levelSelect.show();
      },
      onOpenSettings: () => {
        startScreen.hide();
        settingsPanel.show();
      },
    },
    settings
  );

  const goMenu = () => {
    engine.stop();
    releaseWake();
    detachInputs();
    closeMenus();
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

  startScreen.show();

  // PWA 서비스워커 (프로덕션 빌드에서만, base 경로 기준)
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL })
        .catch(() => {});
    });
  }

  console.log("BLOCKARI — 메인 간소화: 레벨도전 분리, 리플레이 제거");
}

boot();
