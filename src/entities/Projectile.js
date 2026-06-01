export class Projectile {
  constructor({ source, target, damage, speed }) {
    this.source = source;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.startX = source.x;
    this.startY = source.groundY - source.height + 18;
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
    const previousProgress = Math.max(0, this.progress - 0.035);
    const previous = this.getPosition(previousProgress);

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
    const y = this.startY + (this.endY - this.startY) * eased - Math.sin(eased * Math.PI) * 70;

    return { x, y };
  }
}
