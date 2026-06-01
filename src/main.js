import { DIFFICULTIES } from "./config.js";
import { Game } from "./core/Game.js";
import { Soundtrack } from "./core/Soundtrack.js";

const canvas = document.querySelector("#game-canvas");
const menu = document.querySelector("#start-menu");
const hud = document.querySelector("#hud");
const startButton = document.querySelector("#start-game");
const difficultySelect = document.querySelector("#difficulty-select");
const audioButton = document.querySelector("#toggle-music");
const difficultyDescription = document.querySelector("#difficulty-description");
const soundtrack = new Soundtrack();
let game = null;

if (!canvas) {
  throw new Error("No se encontro el canvas principal del juego.");
}

function updateDifficultyDescription() {
  if (!difficultyDescription || !difficultySelect) {
    return;
  }

  const difficulty = DIFFICULTIES[difficultySelect.value] ?? DIFFICULTIES.normal;
  difficultyDescription.textContent = `${difficulty.label}: IA atacante con x${difficulty.enemyHpMultiplier} vida, x${difficulty.enemyDamageMultiplier} dano y ritmo x${(1 / difficulty.enemySpawnMultiplier).toFixed(1)}.`;
}

startButton?.addEventListener("click", async () => {
  const difficulty = difficultySelect?.value ?? "normal";
  menu?.classList.add("is-hidden");
  hud?.classList.remove("is-hidden");

  if (!game) {
    game = new Game(canvas, {
      goldCounter: document.querySelector("#gold-counter"),
      playerHp: document.querySelector("#player-hp"),
      enemyHp: document.querySelector("#enemy-hp"),
      unitCounter: document.querySelector("#unit-counter"),
      status: document.querySelector("#status-message"),
      commandButtons: document.querySelectorAll("[data-command]"),
      trainButtons: document.querySelectorAll("[data-unit]"),
      difficultyLabel: document.querySelector("#difficulty-label"),
    }, { difficulty });
    game.start();
  }

  if (!soundtrack.isPlaying) {
    await soundtrack.start();
    if (audioButton) {
      audioButton.textContent = "Musica: ON";
    }
  }
});

audioButton?.addEventListener("click", async () => {
  const isPlaying = await soundtrack.toggle();
  audioButton.textContent = isPlaying ? "Musica: ON" : "Musica: OFF";
});

difficultySelect?.addEventListener("change", updateDifficultyDescription);
updateDifficultyDescription();
