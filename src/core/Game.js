import { COLORS, WORLD } from "../config.js";
import { InputController } from "./InputController.js";
import { Camera } from "./Camera.js";
import { createBattlefield } from "../world/mapConfig.js";

export class Game {
  constructor(canvas, hudElements = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hudElements = hudElements;
    this.gold = WORLD.playerGold;
    this.currentCommand = "hold";

    this.viewport = { width: 1, height: 1 };
    this.battlefield = createBattlefield(this.viewport.width, this.viewport.height);
    this.camera = new Camera({
      viewportWidth: this.viewport.width,
      worldWidth: this.battlefield.width,
    });
    this.input = new InputController(this.canvas);

    this.lastFrameTime = 0;
    this.isRunning = false;

    this.bindUi();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  loop(timestamp) {
    if (!this.isRunning) {
      return;
    }

    const deltaSeconds = this.lastFrameTime
      ? Math.min((timestamp - this.lastFrameTime) / 1000, 0.05)
      : 0;

    this.lastFrameTime = timestamp;
    this.update(deltaSeconds);
    this.render();

    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  update(deltaSeconds) {
    this.camera.update(deltaSeconds, this.input);
  }

  render() {
    const { ctx } = this;
    const { width, height } = this.viewport;

    ctx.clearRect(0, 0, width, height);
    this.drawSky();

    ctx.save();
    ctx.translate(-this.camera.x, 0);
    this.drawBattlefield();
    ctx.restore();

    this.drawCameraDebug();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const height = Math.max(1, Math.floor(rect.height || window.innerHeight));
    const pixelRatio = window.devicePixelRatio || 1;

    this.viewport = { width, height };
    this.canvas.width = Math.floor(width * pixelRatio);
    this.canvas.height = Math.floor(height * pixelRatio);
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    this.battlefield = createBattlefield(width, height);
    this.camera.resize({
      viewportWidth: width,
      worldWidth: this.battlefield.width,
    });
  }

  bindUi() {
    if (this.hudElements.goldCounter) {
      this.hudElements.goldCounter.textContent = String(this.gold);
    }

    for (const button of this.hudElements.commandButtons ?? []) {
      button.addEventListener("click", () => {
        this.currentCommand = button.dataset.command;
        this.updateCommandButtons();
      });
    }

    this.updateCommandButtons();
  }

  updateCommandButtons() {
    for (const button of this.hudElements.commandButtons ?? []) {
      const isActive = button.dataset.command === this.currentCommand;
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  drawSky() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.viewport.height);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(1, COLORS.skyBottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
  }

  drawBattlefield() {
    const { ctx, battlefield } = this;

    this.drawWorldGuides();

    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, battlefield.groundY, battlefield.width, battlefield.height - battlefield.groundY);
    ctx.fillStyle = COLORS.groundHighlight;
    ctx.fillRect(0, battlefield.groundY, battlefield.width, 10);

    this.drawMine(battlefield.playerMine);
    this.drawMine(battlefield.enemyMine);
    this.drawStatue(battlefield.playerBase, COLORS.playerBase, "Base aliada");
    this.drawStatue(battlefield.enemyBase, COLORS.enemyBase, "Base enemiga");
  }

  drawWorldGuides() {
    const { ctx, battlefield, viewport } = this;
    const sectionWidth = viewport.width;

    ctx.save();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.font = "14px Arial";
    ctx.setLineDash([8, 8]);

    for (let x = 0; x <= battlefield.width; x += sectionWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, battlefield.height);
      ctx.stroke();
      ctx.fillText(`Pantalla ${Math.floor(x / sectionWidth) + 1}`, x + 16, 34);
    }

    ctx.restore();
  }

  drawStatue(statue, color, label) {
    const { ctx } = this;
    const centerX = statue.x + statue.width / 2;

    ctx.fillStyle = color;
    ctx.fillRect(statue.x, statue.y, statue.width, statue.height);
    ctx.fillStyle = "rgba(17, 24, 39, 0.55)";
    ctx.fillRect(statue.x - 12, statue.y + statue.height - 18, statue.width + 24, 18);

    ctx.fillStyle = "#f9fafb";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, centerX, statue.y - 14);
    ctx.fillText(`${statue.hp} HP`, centerX, statue.y + statue.height + 28);
    ctx.textAlign = "left";
  }

  drawMine(mine) {
    const { ctx } = this;

    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.ellipse(
      mine.x + mine.width / 2,
      mine.y + mine.height / 2,
      mine.width / 2,
      mine.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawCameraDebug() {
    const { ctx } = this;
    const barWidth = 220;
    const barHeight = 8;
    const x = 18;
    const y = this.viewport.height - 28;
    const progress = this.camera.maxX > 0 ? this.camera.x / this.camera.maxX : 0;

    ctx.fillStyle = "rgba(17, 24, 39, 0.65)";
    ctx.fillRect(x - 8, y - 12, barWidth + 16, 30);
    ctx.fillStyle = "rgba(249, 250, 251, 0.35)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    ctx.fillStyle = "#f9fafb";
    ctx.font = "12px Arial";
    ctx.fillText("Camara: mouse en bordes o flechas", x, y - 4);
  }
}
