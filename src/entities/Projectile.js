export class Projectile {
  constructor({ source, target, damage, speed }) {
    this.source = source;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.style = source.type === "dragon" ? "fire" : "arrow";
    this.startX = source.x;
    this.startY = source.stats.flying ? source.groundY - source.height * 0.72 : source.groundY - source.height + 18;
    this.endX = target.kind === "statue" ? target.frontX : target.x;
    this.endY = target.kind === "statue" ? target.y + target.height * 0.45 : target.groundY - target.height * 0.65;
    this.distance = Math.max(1, Math.hypot(this.endX - this.startX, this.endY - this.startY));
    this.progress = 0;
    this.done = false;
  }

  update(deltaSeconds) {
    if (this.done) {
      return;
    }

    this.progress += (this.speed * deltaSeconds) / this.distance;

    if (this.progress >= 1) {
      this.progress = 1;
      if (this.target?.isAlive) {
        this.target.takeDamage(this.damage);
      }
      this.done = true;
    }
  }

  draw(ctx) {
    if (this.done) {
      return;
    }

    const position = this.getPosition();
    const previousProgress = Math.max(0, this.progress - 0.04);
    const previous = this.getPosition(previousProgress);

    if (this.style === "fire") {
      const radius = 8 + Math.sin(this.progress * Math.PI) * 4;
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(253, 186, 116, 0.85)";
      ctx.beginPath();
      ctx.arc(position.x + 3, position.y - 2, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.strokeStyle = "#3f2a12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(position.x, position.y);
    ctx.stroke();
  }

  getPosition(progress = this.progress) {
    const eased = Math.max(0, Math.min(1, progress));
    const x = this.startX + (this.endX - this.startX) * eased;
    const arcHeight = this.style === "fire" ? 35 : 70;
    const y = this.startY + (this.endY - this.startY) * eased - Math.sin(eased * Math.PI) * arcHeight;

    return { x, y };
  }
}
