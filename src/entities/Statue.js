import { COLORS, FACTIONS, WORLD } from "../config.js";

export class Statue {
  constructor(faction, rect) {
    this.kind = "statue";
    this.faction = faction;
    this.maxHp = WORLD.statueHp;
    this.hp = rect.hp ?? this.maxHp;
    this.updateRect(rect);
  }

  updateRect(rect) {
    this.x = rect.x;
    this.y = rect.y;
    this.width = rect.width;
    this.height = rect.height;
  }

  get isAlive() {
    return this.hp > 0;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get frontX() {
    return this.faction === FACTIONS.player ? this.x + this.width : this.x;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  draw(ctx) {
    const color = this.faction === FACTIONS.player ? COLORS.playerBase : COLORS.enemyBase;
    const label = this.faction === FACTIONS.player ? "Base aliada" : "Base enemiga";

    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "rgba(17, 24, 39, 0.55)";
    ctx.fillRect(this.x - 12, this.y + this.height - 18, this.width + 24, 18);

    ctx.fillStyle = "#f9fafb";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, this.centerX, this.y - 14);
    ctx.textAlign = "left";

    this.drawHealthBar(ctx, this.x - 12, this.y + this.height + 14, this.width + 24, 10);
  }

  drawHealthBar(ctx, x, y, width, height) {
    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = COLORS.hpBack;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x, y, width * ratio, height);
    ctx.strokeStyle = "rgba(249, 250, 251, 0.65)";
    ctx.strokeRect(x, y, width, height);
  }
}
