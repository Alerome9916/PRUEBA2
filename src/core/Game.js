import { COLORS, COMMANDS, ECONOMY, FACTIONS, UNIT_TYPES, WORLD } from "../config.js";
import { InputController } from "./InputController.js";
import { Camera } from "./Camera.js";
import { createBattlefield } from "../world/mapConfig.js";
import { Projectile } from "../entities/Projectile.js";
import { Statue } from "../entities/Statue.js";
import { Unit } from "../entities/Unit.js";

export class Game {
  constructor(canvas, hudElements = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hudElements = hudElements;
    this.gold = WORLD.playerGold;
    this.enemyGold = WORLD.enemyGold;
    this.playerCommand = COMMANDS.hold;
    this.enemyCommand = COMMANDS.hold;
    this.statusMessage = "Entrena unidades, mina oro y destruye la base enemiga.";
    this.statusTimer = 5;
    this.gameOver = false;

    this.viewport = { width: 1, height: 1 };
    this.battlefield = createBattlefield(this.viewport.width, this.viewport.height);
    this.camera = new Camera({
      viewportWidth: this.viewport.width,
      worldWidth: this.battlefield.width,
    });
    this.input = new InputController(this.canvas);

    this.units = [];
    this.projectiles = [];
    this.statues = null;
    this.enemyTimers = {
      miner: 4,
      soldier: 6,
      wave: ECONOMY.enemyWaveInterval,
      waveActive: 0,
    };

    this.lastFrameTime = 0;
    this.isRunning = false;

    this.bindUi();
    this.resize();
    this.createInitialArmies();
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

    if (this.statusTimer > 0) {
      this.statusTimer = Math.max(0, this.statusTimer - deltaSeconds);
    }

    if (!this.gameOver) {
      this.updateEnemyAi(deltaSeconds);
      this.updateUnits(deltaSeconds);
      this.updateProjectiles(deltaSeconds);
      this.cleanupEntities();
      this.checkWinLose();
    }

    this.updateHud();
  }

  updateUnits(deltaSeconds) {
    const context = this.createUnitContext();

    for (const unit of this.units) {
      unit.update(deltaSeconds, context);
    }
  }

  updateProjectiles(deltaSeconds) {
    for (const projectile of this.projectiles) {
      projectile.update(deltaSeconds);
    }
  }

  updateEnemyAi(deltaSeconds) {
    this.enemyTimers.miner -= deltaSeconds;
    this.enemyTimers.soldier -= deltaSeconds;
    this.enemyTimers.wave -= deltaSeconds;

    if (this.enemyTimers.miner <= 0) {
      this.enemyTimers.miner = ECONOMY.enemyMinerInterval;
      const enemyMiners = this.countUnits(FACTIONS.enemy, "miner");
      if (enemyMiners < 4) {
        this.trySpawnEnemyUnit("miner");
      }
    }

    if (this.enemyTimers.soldier <= 0) {
      this.enemyTimers.soldier = ECONOMY.enemySoldierInterval;
      const type = Math.random() < 0.68 ? "clubman" : "archer";
      this.trySpawnEnemyUnit(type);
    }

    if (this.enemyTimers.wave <= 0) {
      this.enemyTimers.wave = ECONOMY.enemyWaveInterval;
      this.enemyTimers.waveActive = ECONOMY.enemyWaveDuration;
      this.enemyCommand = COMMANDS.attack;
      this.setStatus("La IA enemiga lanza una oleada!", 4);
      this.trySpawnEnemyUnit("clubman");
      this.trySpawnEnemyUnit(Math.random() < 0.5 ? "clubman" : "archer");
    }

    if (this.enemyTimers.waveActive > 0) {
      this.enemyTimers.waveActive = Math.max(0, this.enemyTimers.waveActive - deltaSeconds);
      if (this.enemyTimers.waveActive === 0) {
        this.enemyCommand = COMMANDS.hold;
        this.assignHoldPositions(FACTIONS.enemy);
      }
    }
  }

  render() {
    const { ctx } = this;
    const { width, height } = this.viewport;

    ctx.clearRect(0, 0, width, height);
    this.drawSky();

    ctx.save();
    ctx.translate(-this.camera.x, 0);
    this.drawBattlefield();
    this.drawEntities();
    ctx.restore();

    this.drawCameraDebug();
    this.drawStatusOverlay();
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

    if (this.statues) {
      this.statues.player.updateRect(this.battlefield.playerBase);
      this.statues.enemy.updateRect(this.battlefield.enemyBase);
      for (const unit of this.units) {
        unit.groundY = this.battlefield.groundY;
      }
    }
  }

  createInitialArmies() {
    this.statues = {
      player: new Statue(FACTIONS.player, this.battlefield.playerBase),
      enemy: new Statue(FACTIONS.enemy, this.battlefield.enemyBase),
    };

    this.spawnUnit("miner", FACTIONS.player);
    this.spawnUnit("clubman", FACTIONS.player);
    this.spawnUnit("miner", FACTIONS.enemy);
    this.spawnUnit("clubman", FACTIONS.enemy);
    this.assignHoldPositions(FACTIONS.player);
    this.assignHoldPositions(FACTIONS.enemy);
  }

  bindUi() {
    for (const button of this.hudElements.commandButtons ?? []) {
      button.addEventListener("click", () => {
        this.setPlayerCommand(button.dataset.command);
      });
    }

    for (const button of this.hudElements.trainButtons ?? []) {
      button.addEventListener("click", () => {
        this.trainPlayerUnit(button.dataset.unit);
      });
    }

    this.updateCommandButtons();
  }

  setPlayerCommand(command) {
    if (this.gameOver || !Object.values(COMMANDS).includes(command)) {
      return;
    }

    this.playerCommand = command;
    if (command === COMMANDS.hold) {
      this.assignHoldPositions(FACTIONS.player);
    }

    this.updateCommandButtons();
  }

  trainPlayerUnit(type) {
    const unitConfig = UNIT_TYPES[type];
    if (this.gameOver || !unitConfig) {
      return;
    }

    if (this.gold < unitConfig.cost) {
      this.setStatus(`Oro insuficiente para ${unitConfig.label}.`, 1.8);
      return;
    }

    this.gold -= unitConfig.cost;
    this.spawnUnit(type, FACTIONS.player);
    this.setStatus(`${unitConfig.label} aliado entrenado.`, 1.8);
  }

  trySpawnEnemyUnit(type) {
    const unitConfig = UNIT_TYPES[type];
    if (!unitConfig || this.enemyGold < unitConfig.cost) {
      return false;
    }

    this.enemyGold -= unitConfig.cost;
    const unit = this.spawnUnit(type, FACTIONS.enemy);
    unit.holdPosition = this.battlefield.width - this.viewport.width * 0.82;
    return true;
  }

  spawnUnit(type, faction) {
    const alliedUnits = this.units.filter((unit) => unit.faction === faction).length;
    const offset = (alliedUnits % 6) * 14;
    const base = faction === FACTIONS.player ? this.battlefield.playerBase : this.battlefield.enemyBase;
    const x = faction === FACTIONS.player
      ? base.x + base.width + 45 + offset
      : base.x - 45 - offset;

    const unit = new Unit({
      type,
      faction,
      x,
      groundY: this.battlefield.groundY,
      battlefield: this.battlefield,
    });

    if (faction === FACTIONS.player && this.playerCommand === COMMANDS.hold) {
      unit.holdPosition = Math.max(unit.x, this.battlefield.centerX);
    }

    this.units.push(unit);
    return unit;
  }

  assignHoldPositions(faction) {
    for (const unit of this.units) {
      if (unit.faction !== faction || unit.isMiner) {
        continue;
      }

      unit.holdPosition = faction === FACTIONS.player
        ? Math.max(unit.x, this.battlefield.centerX)
        : Math.min(unit.x, this.battlefield.width - this.viewport.width * 0.82);
    }
  }

  createUnitContext() {
    return {
      battlefield: this.battlefield,
      units: this.units,
      getCommand: (faction) => (faction === FACTIONS.player ? this.playerCommand : this.enemyCommand),
      getMineWorkX: (faction) => (
        faction === FACTIONS.player ? this.battlefield.playerMine.workX : this.battlefield.enemyMine.workX
      ),
      getDepositX: (faction) => {
        const base = faction === FACTIONS.player ? this.battlefield.playerBase : this.battlefield.enemyBase;
        return faction === FACTIONS.player ? base.x + base.width + 18 : base.x - 18;
      },
      getRallyX: (faction) => {
        const base = faction === FACTIONS.player ? this.battlefield.playerBase : this.battlefield.enemyBase;
        return faction === FACTIONS.player ? base.x + base.width + 35 : base.x - 35;
      },
      getEnemyStatue: (faction) => (faction === FACTIONS.player ? this.statues.enemy : this.statues.player),
      addGold: (faction, amount) => this.addGold(faction, amount),
      addProjectile: (source, target) => this.addProjectile(source, target),
    };
  }

  addGold(faction, amount) {
    if (amount <= 0) {
      return;
    }

    if (faction === FACTIONS.player) {
      this.gold += amount;
    } else {
      this.enemyGold += amount;
    }
  }

  addProjectile(source, target) {
    this.projectiles.push(new Projectile({
      source,
      target,
      damage: source.damage,
      speed: source.stats.projectileSpeed,
    }));
  }

  cleanupEntities() {
    this.units = this.units.filter((unit) => unit.isAlive);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.done);
  }

  checkWinLose() {
    if (!this.statues.enemy.isAlive) {
      this.gameOver = true;
      this.setStatus("Victoria! La estatua enemiga ha caido.", Number.POSITIVE_INFINITY);
      return;
    }

    if (!this.statues.player.isAlive) {
      this.gameOver = true;
      this.setStatus("Derrota. La estatua aliada ha sido destruida.", Number.POSITIVE_INFINITY);
    }
  }

  countUnits(faction, type = null) {
    return this.units.filter((unit) => unit.faction === faction && (!type || unit.type === type)).length;
  }

  updateHud() {
    if (this.hudElements.goldCounter) {
      this.hudElements.goldCounter.textContent = String(Math.floor(this.gold));
    }

    if (this.hudElements.playerHp) {
      this.hudElements.playerHp.textContent = String(Math.ceil(this.statues?.player.hp ?? WORLD.statueHp));
    }

    if (this.hudElements.enemyHp) {
      this.hudElements.enemyHp.textContent = String(Math.ceil(this.statues?.enemy.hp ?? WORLD.statueHp));
    }

    if (this.hudElements.unitCounter) {
      const playerUnits = this.countUnits(FACTIONS.player);
      const enemyUnits = this.countUnits(FACTIONS.enemy);
      this.hudElements.unitCounter.textContent = `${playerUnits} / ${enemyUnits}`;
    }

    if (this.hudElements.status) {
      this.hudElements.status.textContent = this.statusTimer > 0 || this.gameOver ? this.statusMessage : "";
    }

    for (const button of this.hudElements.trainButtons ?? []) {
      const unitConfig = UNIT_TYPES[button.dataset.unit];
      button.disabled = this.gameOver || !unitConfig || this.gold < unitConfig.cost;
    }
  }

  updateCommandButtons() {
    for (const button of this.hudElements.commandButtons ?? []) {
      const isActive = button.dataset.command === this.playerCommand;
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  setStatus(message, seconds = 2) {
    this.statusMessage = message;
    this.statusTimer = seconds;
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
    this.statues.player.draw(ctx);
    this.statues.enemy.draw(ctx);
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

  drawEntities() {
    for (const unit of [...this.units].sort((a, b) => a.x - b.x)) {
      unit.draw(this.ctx);
    }

    for (const projectile of this.projectiles) {
      projectile.draw(this.ctx);
    }
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

    ctx.fillStyle = "rgba(17, 24, 39, 0.7)";
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Oro", mine.x + mine.width / 2, mine.y - 8);
    ctx.textAlign = "left";
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
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    ctx.fillStyle = "#f9fafb";
    ctx.font = "12px Arial";
    ctx.fillText("Camara: mouse en bordes, flechas o A/D", x, y - 4);
  }

  drawStatusOverlay() {
    if (!this.gameOver) {
      return;
    }

    const { ctx } = this;
    ctx.fillStyle = "rgba(17, 24, 39, 0.62)";
    ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    ctx.fillStyle = "#f9fafb";
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.statusMessage, this.viewport.width / 2, this.viewport.height / 2);
    ctx.font = "18px Arial";
    ctx.fillText("Recarga la pagina para jugar otra vez.", this.viewport.width / 2, this.viewport.height / 2 + 38);
    ctx.textAlign = "left";
  }
}
