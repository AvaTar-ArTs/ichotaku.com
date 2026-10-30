/* Transmission — opt-in audio for the flagship.
 * Playback never starts on its own. Once the visitor presses play, the
 * AnalyserNode exposes amplitude and three bands that modulate the
 * Spiral-Sine field. */

export class Transmission {
  constructor(element, { onState } = {}) {
    this.el = element;
    this.onState = onState || (() => {});
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.frequency = new Uint8Array(0);
    this.playing = false;
    this.el.addEventListener("ended", () => this.stop());
  }

  async ensureGraph() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;
    this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
    this.source = this.ctx.createMediaElementSource(this.el);
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async play() {
    await this.ensureGraph();
    if (!this.ctx) { this.el.play(); this.playing = true; this.onState(true); return; }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    await this.el.play();
    this.playing = true;
    this.onState(true);
  }

  pause() {
    this.el.pause();
    this.playing = false;
    this.onState(false);
  }

  stop() {
    this.el.pause();
    this.playing = false;
    this.onState(false);
  }

  toggle() {
    return this.playing ? (this.pause(), Promise.resolve()) : this.play();
  }

  /* level 0..1, plus low / mid / high energy and a 12-band read-out */
  read() {
    const out = { level: 0, low: 0, mid: 0, high: 0, bands: new Array(12).fill(0) };
    if (!this.analyser || !this.playing) return out;
    this.analyser.getByteFrequencyData(this.frequency);
    const bins = this.frequency.length;
    const band = (from, to) => {
      let sum = 0, count = 0;
      for (let i = from; i < to; i++) { sum += this.frequency[i]; count++; }
      return count ? sum / count / 255 : 0;
    };
    const third = Math.floor(bins / 3);
    out.low = band(0, third);
    out.mid = band(third, third * 2);
    out.high = band(third * 2, bins);
    out.level = (out.low + out.mid + out.high) / 3;
    for (let i = 0; i < 12; i++) {
      const from = Math.floor((i / 12) * bins);
      const to = Math.floor(((i + 1) / 12) * bins);
      out.bands[i] = band(from, to);
    }
    return out;
  }
}
