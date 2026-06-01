import { CAMERA } from "../config.js";

export class Camera {
  constructor({ viewportWidth, worldWidth }) {
    this.x = 0;
    this.viewportWidth = viewportWidth;
    this.worldWidth = worldWidth;
  }

  resize({ viewportWidth, worldWidth }) {
    this.viewportWidth = viewportWidth;
    this.worldWidth = worldWidth;
    this.x = this.clamp(this.x);
  }

  update(deltaSeconds, input) {
    let direction = 0;

    if (input.isLeftPressed()) {
      direction -= 1;
    }

    if (input.isRightPressed()) {
      direction += 1;
    }

    if (input.mouse.inside) {
      if (input.mouse.x <= CAMERA.edgeSize) {
        direction -= 1;
      } else if (input.mouse.x >= this.viewportWidth - CAMERA.edgeSize) {
        direction += 1;
      }
    }

    this.x = this.clamp(this.x + direction * CAMERA.scrollSpeed * deltaSeconds);
  }

  worldToScreenX(worldX) {
    return worldX - this.x;
  }

  clamp(value) {
    return Math.max(0, Math.min(value, this.maxX));
  }

  get maxX() {
    return Math.max(0, this.worldWidth - this.viewportWidth);
  }
}
