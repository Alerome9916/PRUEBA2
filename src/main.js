import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game-canvas");

if (!canvas) {
  throw new Error("No se encontro el canvas principal del juego.");
}

const game = new Game(canvas, {
  goldCounter: document.querySelector("#gold-counter"),
  playerHp: document.querySelector("#player-hp"),
  enemyHp: document.querySelector("#enemy-hp"),
  unitCounter: document.querySelector("#unit-counter"),
  status: document.querySelector("#status-message"),
  commandButtons: document.querySelectorAll("[data-command]"),
  trainButtons: document.querySelectorAll("[data-unit]"),
});

game.start();
