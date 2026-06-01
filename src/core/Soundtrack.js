export class Soundtrack {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.step = 0;
    this.scale = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 783.99];
  }

  async toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    }

    await this.start();
    return true;
  }

  async start() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.08;
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    if (this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.playStep();
    this.intervalId = window.setInterval(() => this.playStep(), 560);
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isPlaying = false;
  }

  playStep() {
    if (!this.audioContext || !this.masterGain) {
      return;
    }

    const now = this.audioContext.currentTime;
    const root = this.scale[this.step % this.scale.length];
    const harmony = this.scale[(this.step + 2) % this.scale.length] / 2;

    this.playTone(root, now, 0.22, "triangle", 0.55);
    this.playTone(harmony, now, 0.45, "sine", 0.35);

    if (this.step % 4 === 0) {
      this.playTone(root / 2, now, 0.75, "sawtooth", 0.22);
    }

    this.step += 1;
  }

  playTone(frequency, startTime, duration, type, volume) {
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.04);
  }
}
