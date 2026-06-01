import { COLORS, COMMANDS, FACTIONS, UNIT_TYPES } from "../config.js";

const ARRIVAL_DISTANCE = 5;
const RANGED_TYPES = new Set(["archer", "mamon", "dragon"]);

export class Unit {
  constructor({ type, faction, x, groundY, battlefield }) {
    this.kind = "unit";
    this.type = type;
    this.faction = faction;
    this.stats = UNIT_TYPES[type];
    this.x = x;
    this.groundY = groundY;
    this.width = this.stats.width;
    this.height = this.stats.height;
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;
    this.speed = this.stats.speed;
    this.damage = this.stats.damage;
    this.attackRange = this.stats.attackRange;
    this.visionRange = this.stats.visionRange;
    this.attackInterval = this.stats.attackInterval;
    this.attackTimer = 0;
    this.state = type === "miner" ? "walking" : "idle";
    this.facing = faction === FACTIONS.player ? 1 : -1;
    this.holdPosition = getDefaultHoldPosition(faction, battlefield);
    this.minePhase = "toMine";
    this.mineTimer = 0;
    this.carriedGold = 0;
    this.animationTime = Math.random() * 10;
  }

  get isAlive() {
    return this.hp > 0;
  }

  get isMiner() {
    return this.type === "miner";
  }

  get isHidden() {
    return this.state === "hidden";
  }

  takeDamage(amount) {
    if (this.isHidden) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.state = "dying";
    }
  }

  update(deltaSeconds, context) {
    if (!this.isAlive) {
      return;
    }

    this.animationTime += deltaSeconds;
    this.groundY = context.battlefield.groundY;
    this.attackTimer = Math.max(0, this.attackTimer - deltaSeconds);

    if (this.isMiner) {
      this.updateMiner(deltaSeconds, context);
      return;
    }

    this.updateFighter(deltaSeconds, context);
  }

  updateMiner(deltaSeconds, context) {
    const command = context.getCommand(this.faction);

    if (this.faction === FACTIONS.player && command === COMMANDS.defend) {
      this.mineTimer = 0;
      this.carriedGold = 0;
      this.minePhase = "toMine";
      this.state = "hidden";
      this.moveToward(context.getDepositX(this.faction), deltaSeconds);
      return;
    }

    if (this.state === "hidden") {
      this.state = "walking";
    }

    if (this.minePhase === "toMine") {
      this.state = "walking";
      if (this.moveToward(context.getMineWorkX(this.faction), deltaSeconds)) {
        this.minePhase = "mining";
        this.mineTimer = 0;
      }
      return;
    }

    if (this.minePhase === "mining") {
      this.state = "mining";
      this.mineTimer += deltaSeconds;
      if (this.mineTimer >= this.stats.mineDuration) {
        this.minePhase = "toBase";
        this.carriedGold = this.stats.carriedGold;
        this.state = "walking";
      }
      return;
    }

    this.state = "walking";
    if (this.moveToward(context.getDepositX(this.faction), deltaSeconds)) {
      context.addGold(this.faction, this.carriedGold);
      this.carriedGold = 0;
      this.minePhase = "toMine";
    }
  }

  updateFighter(deltaSeconds, context) {
    const command = context.getCommand(this.faction);

    if (command === COMMANDS.defend) {
      this.state = "retreating";
      this.moveToward(context.getRallyX(this.faction), deltaSeconds);
      return;
    }

    const target = this.findTarget(context, command);

    if (target && this.distanceToTarget(target) <= this.attackRange) {
      this.attack(target, context);
      return;
    }

    if (command === COMMANDS.attack) {
      const destination = target ? this.getApproachX(target) : context.getEnemyStatue(this.faction).frontX;
      this.state = "walking";
      this.moveToward(destination, deltaSeconds);
      return;
    }

    if (this.shouldAdvanceToHold()) {
      this.state = "walking";
      this.moveToward(this.holdPosition, deltaSeconds);
      return;
    }

    this.state = "idle";
  }

  findTarget(context, command) {
    const enemies = context.units
      .filter((unit) => unit.faction !== this.faction && unit.isAlive && !unit.isHidden)
      .map((unit) => ({ target: unit, distance: Math.abs(unit.x - this.x) }))
      .filter(({ distance }) => distance <= this.visionRange)
      .sort((a, b) => a.distance - b.distance);

    if (enemies.length > 0) {
      return enemies[0].target;
    }

    if (command === COMMANDS.attack) {
      return context.getEnemyStatue(this.faction);
    }

    return null;
  }

  attack(target, context) {
    this.state = "attacking";
    const targetX = target.kind === "statue" ? target.frontX : target.x;
    this.facing = targetX >= this.x ? 1 : -1;

    if (this.attackTimer > 0) {
      return;
    }

    if (RANGED_TYPES.has(this.type)) {
      context.addProjectile(this, target);
    } else {
      target.takeDamage(this.damage);
    }

    this.attackTimer = this.attackInterval;
  }

  shouldAdvanceToHold() {
    if (this.faction === FACTIONS.player) {
      return this.x < this.holdPosition - ARRIVAL_DISTANCE;
    }

    return this.x > this.holdPosition + ARRIVAL_DISTANCE;
  }

  moveToward(destinationX, deltaSeconds) {
    const distance = destinationX - this.x;

    if (Math.abs(distance) <= ARRIVAL_DISTANCE) {
      this.x = destinationX;
      return true;
    }

    this.facing = Math.sign(distance) || this.facing;
    this.x += Math.sign(distance) * this.speed * deltaSeconds;
    return false;
  }

  getApproachX(target) {
    const targetX = target.kind === "statue" ? target.frontX : target.x;
    const direction = targetX >= this.x ? 1 : -1;
    return targetX - direction * Math.max(8, this.attackRange * 0.75);
  }

  distanceToTarget(target) {
    const targetX = target.kind === "statue" ? target.frontX : target.x;
    return Math.abs(targetX - this.x);
  }

  draw(ctx) {
    if (!this.isAlive || this.isHidden) {
      return;
    }

    const color = this.faction === FACTIONS.player ? COLORS.playerUnit : COLORS.enemyUnit;
    const bob = this.state === "walking" ? Math.sin(this.animationTime * 9) * 2 : 0;

    ctx.save();
    ctx.translate(this.x, bob);
    ctx.scale(this.facing < 0 ? -1 : 1, 1);
    this.drawShadow(ctx);

    if (this.stats.flying) {
      this.drawDragon(ctx, color);
    } else if (this.stats.giant) {
      this.drawGiant(ctx, color);
    } else if (this.stats.mounted) {
      this.drawCavalry(ctx, color);
    } else {
      this.drawHumanoid(ctx, color);
    }

    ctx.restore();

    this.drawHealthBar(ctx);
    this.drawMiningProgress(ctx);
  }

  drawShadow(ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, this.groundY - 2, this.width, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHumanoid(ctx, color) {
    const headY = this.groundY - this.height;
    const bodyTop = headY + 11;
    const bodyBottom = this.groundY - 13;

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, bodyTop);
    ctx.lineTo(0, bodyBottom);
    ctx.moveTo(0, bodyTop + 13);
    ctx.lineTo(15, bodyTop + 25);
    ctx.moveTo(0, bodyBottom);
    ctx.lineTo(12, this.groundY);
    ctx.moveTo(0, bodyBottom);
    ctx.lineTo(-10, this.groundY);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, headY + 5, 8, 0, Math.PI * 2);
    ctx.fill();

    this.drawWeapon(ctx, bodyTop);
  }

  drawCavalry(ctx, color) {
    const horseY = this.groundY - 30;
    ctx.fillStyle = "#7c4a25";
    ctx.fillRect(-30, horseY - 12, 56, 24);
    ctx.beginPath();
    ctx.arc(30, horseY - 16, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3f2a12";
    ctx.lineWidth = 4;
    for (const x of [-20, 0, 18]) {
      ctx.beginPath();
      ctx.moveTo(x, horseY + 10);
      ctx.lineTo(x - 6, this.groundY);
      ctx.moveTo(x + 8, horseY + 10);
      ctx.lineTo(x + 12, this.groundY);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-6, horseY - 34);
    ctx.lineTo(-2, horseY - 8);
    ctx.moveTo(-2, horseY - 20);
    ctx.lineTo(22, horseY - 28);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-8, horseY - 42, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, horseY - 29);
    ctx.lineTo(52, horseY - 38);
    ctx.stroke();
  }

  drawDragon(ctx, color) {
    const baseY = this.groundY - 62 + Math.sin(this.animationTime * 5) * 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, baseY, 36, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, baseY - 12);
    ctx.lineTo(-54, baseY - 42);
    ctx.lineTo(-35, baseY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, baseY - 14);
    ctx.lineTo(44, baseY - 45);
    ctx.lineTo(34, baseY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, baseY - 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(47, baseY - 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, baseY + 2);
    ctx.lineTo(-62, baseY + 18);
    ctx.stroke();
  }

  drawGiant(ctx, color) {
    const headY = this.groundY - this.height;
    const torsoTop = headY + 24;
    ctx.fillStyle = color;
    ctx.fillRect(-20, torsoTop, 40, 64);
    ctx.beginPath();
    ctx.arc(0, headY + 12, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-17, torsoTop + 16);
    ctx.lineTo(-38, torsoTop + 55);
    ctx.moveTo(17, torsoTop + 16);
    ctx.lineTo(42, torsoTop + 48);
    ctx.moveTo(-10, torsoTop + 62);
    ctx.lineTo(-18, this.groundY);
    ctx.moveTo(12, torsoTop + 62);
    ctx.lineTo(25, this.groundY);
    ctx.stroke();
    ctx.strokeStyle = "#3f2a12";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(38, torsoTop + 45);
    ctx.lineTo(60, torsoTop - 8);
    ctx.stroke();
  }

  drawWeapon(ctx, bodyTop) {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;

    if (this.type === "clubman") {
      ctx.beginPath();
      ctx.moveTo(13, bodyTop + 24);
      ctx.lineTo(32, bodyTop + 2);
      ctx.stroke();
      return;
    }

    if (this.type === "squire") {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(-25, bodyTop + 8, 18, 28);
      ctx.strokeRect(-25, bodyTop + 8, 18, 28);
      ctx.beginPath();
      ctx.moveTo(14, bodyTop + 23);
      ctx.lineTo(34, bodyTop + 13);
      ctx.stroke();
      return;
    }

    if (RANGED_TYPES.has(this.type)) {
      ctx.lineWidth = this.type === "mamon" ? 4 : 3;
      ctx.beginPath();
      ctx.arc(18, bodyTop + 18, this.type === "mamon" ? 18 : 15, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(13, bodyTop + 24);
    ctx.lineTo(30, bodyTop + 30);
    ctx.moveTo(27, bodyTop + 24);
    ctx.lineTo(34, bodyTop + 34);
    ctx.stroke();

    if (this.carriedGold > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(-22, bodyTop + 26, 12, 12);
    }
  }

  drawHealthBar(ctx) {
    if (this.hp === this.maxHp) {
      return;
    }

    const width = Math.max(38, this.width);
    const x = this.x - width / 2;
    const y = this.groundY - this.height - 16;
    const ratio = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = COLORS.hpBack;
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x, y, width * ratio, 5);
  }

  drawMiningProgress(ctx) {
    if (this.state !== "mining") {
      return;
    }

    const width = 36;
    const x = this.x - width / 2;
    const y = this.groundY - this.height - 18;
    const ratio = Math.min(1, this.mineTimer / this.stats.mineDuration);

    ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
    ctx.fillRect(x, y, width, 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x, y, width * ratio, 6);
  }
}

function getDefaultHoldPosition(faction, battlefield) {
  if (faction === FACTIONS.player) {
    return battlefield.centerX;
  }

  return battlefield.width - battlefield.width / 3;
}
