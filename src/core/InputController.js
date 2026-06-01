export class InputController {
  constructor(targetElement) {
    this.targetElement = targetElement;
    this.keys = new Set();
    this.mouse = {
      x: 0,
      y: 0,
      inside: false,
    };

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    this.targetElement.addEventListener("mousemove", (event) => {
      const rect = this.targetElement.getBoundingClientRect();
      this.mouse.x = event.clientX - rect.left;
      this.mouse.y = event.clientY - rect.top;
      this.mouse.inside = true;
    });

    this.targetElement.addEventListener("mouseenter", () => {
      this.mouse.inside = true;
    });

    this.targetElement.addEventListener("mouseleave", () => {
      this.mouse.inside = false;
    });
  }

  isLeftPressed() {
    return this.keys.has("ArrowLeft") || this.keys.has("KeyA");
  }

  isRightPressed() {
    return this.keys.has("ArrowRight") || this.keys.has("KeyD");
  }
}
