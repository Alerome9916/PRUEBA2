import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game-canvas");

if (!canvas) {
  throw new Error("No se encontro el canvas principal del juego.");
}

const game = new Game(canvas, {
  goldCounter: document.querySelector("#gold-counter"),
  commandButtons: document.querySelectorAll("[data-command]"),
});

game.start();
