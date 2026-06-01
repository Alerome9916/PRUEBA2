import { COLORS, COMMANDS, FACTIONS, UNIT_TYPES } from "../config.js";

const ARRIVAL_DISTANCE = 5;

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

    if (this.type === "archer") {
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
    const headY = this.groundY - this.height;
    const bodyTop = headY + 11;
    const bodyBottom = this.groundY - 13;

    ctx.save();
    ctx.translate(this.x, 0);
    ctx.scale(this.facing < 0 ? -1 : 1, 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, this.groundY - 2, this.width, 6, 0, 0, Math.PI * 2);
    ctx.fill();

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
    ctx.restore();

    this.drawHealthBar(ctx);
    this.drawMiningProgress(ctx);
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

    if (this.type === "archer") {
      ctx.beginPath();
      ctx.arc(18, bodyTop + 18, 15, -Math.PI / 2, Math.PI / 2);
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

    const width = 38;
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
