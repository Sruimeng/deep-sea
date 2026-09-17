import type { Sound } from './types'

export class Audio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private beat = 0
  private nextBeat = 0
  private stage = 0
  muted = false
  music = true
  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.gain.value = this.muted ? 0 : 0.24
        this.master.connect(this.context.destination)
      }
      await this.context.resume()
    } catch {
      /* Gameplay remains available without audio. */
    }
  }
  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(muted ? 0 : 0.24, this.context.currentTime, 0.02)
  }
  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.2,
    end = frequency,
    when = 0,
  ) {
    const ctx = this.context
    if (!ctx || !this.master || ctx.state !== 'running') return
    const at = ctx.currentTime + when
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(15, end), at + duration)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(volume, at + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(at)
    oscillator.stop(at + duration + 0.02)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }
  private noise(duration: number, volume: number, frequency: number) {
    const ctx = this.context
    if (!ctx || !this.master || ctx.state !== 'running') return
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain()
    source.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start()
    source.onended = () => {
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }
  playFrame(sounds: Sound[]) {
    const rank: Partial<Record<Sound, number>> = {
      block: 1,
      punch: 2,
      heavy: 3,
      counter: 4,
      finish: 5,
      special: 6,
    }
    let impact: Sound | undefined
    for (const sound of new Set(sounds)) {
      if (!rank[sound]) this.play(sound)
      else if (!impact || rank[sound]! > rank[impact]!) impact = sound
    }
    if (impact) this.play(impact)
  }
  play(sound: Sound) {
    if (this.muted) return
    switch (sound) {
      case 'charge':
        this.tone(120, 0.18, 'sine', 0.35, 850)
        this.tone(240, 0.18, 'triangle', 0.12, 1200)
        break
      case 'swing':
        this.noise(0.1, 0.24, 1400)
        break
      case 'block':
        this.tone(1200, 0.12, 'triangle', 0.3, 500)
        this.noise(0.055, 0.35, 6000)
        break
      case 'punch':
        this.noise(0.09, 0.85, 2800)
        this.tone(160, 0.09, 'triangle', 0.7, 35)
        this.tone(720, 0.025, 'square', 0.13, 160)
        break
      case 'counter':
        this.noise(0.065, 1.0, 4600)
        this.tone(230, 0.14, 'triangle', 0.8, 42)
        this.tone(88, 0.27, 'sine', 1.15, 25)
        this.tone(1400, 0.035, 'square', 0.16, 380)
        break
      case 'finish':
        this.noise(0.12, 1.1, 2300)
        this.tone(170, 0.3, 'sine', 1.2, 26)
        this.tone(900, 0.07, 'sawtooth', 0.15, 190)
        this.tone(58, 0.23, 'triangle', 0.55, 24, 0.055)
        break
      case 'heavy':
        this.noise(0.055, 0.95, 4200)
        this.noise(0.16, 0.7, 1100)
        this.tone(125, 0.25, 'sine', 1.1, 28)
        this.tone(62, 0.18, 'triangle', 0.6, 23)
        break
      case 'hurt':
        this.tone(240, 0.14, 'sawtooth', 0.26, 60)
        break
      case 'jump':
        this.tone(180, 0.16, 'square', 0.1, 420)
        break
      case 'dash':
        this.tone(580, 0.13, 'triangle', 0.22, 70)
        this.noise(0.14, 0.22, 2400)
        break
      case 'reward':
        ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.24, 'sine', 0.38, f, i * 0.07))
        break
      case 'pickup':
        this.tone(660, 0.08, 'sine', 0.4)
        this.tone(990, 0.15, 'sine', 0.3, 990, 0.07)
        break
      case 'break':
        this.noise(0.23, 0.5, 3800)
        this.tone(110, 0.22, 'sawtooth', 0.3, 24)
        this.tone(330, 0.045, 'square', 0.16)
        break
      case 'special':
        this.noise(0.28, 0.65, 1800)
        this.tone(85, 0.48, 'sine', 1.0, 24)
        this.tone(1500, 0.22, 'triangle', 0.16, 180)
        ;[110, 165, 220, 330].forEach((f, i) =>
          this.tone(f, 0.45, 'sawtooth', 0.18, f * 2, i * 0.06),
        )
        break
      case 'win':
        ;[330, 440, 550, 660].forEach((f, i) => this.tone(f, 0.3, 'square', 0.18, f, i * 0.13))
        break
      case 'warn':
        this.tone(420, 0.18, 'square', 0.12)
        this.tone(420, 0.18, 'square', 0.12, 420, 0.3)
        break
      case 'shoot':
        this.tone(800, 0.16, 'sine', 0.14, 250)
        break
    }
  }
  tick(playing: boolean, stage: number) {
    if (!this.context || !playing || this.muted || !this.music) {
      this.nextBeat = 0
      return
    }
    this.stage = stage
    const time = this.context.currentTime
    if (time < this.nextBeat) return
    this.nextBeat = time + 0.225
    const notes = [55, 55, 82.41, 55, 73.42, 55, 98, 82.41]
    const f = notes[this.beat % notes.length]! * (this.stage === 4 ? 0.89 : 1)
    this.tone(f, 0.13, 'triangle', 0.26)
    if (this.beat % 2 === 0) this.tone(100, 0.065, 'sine', 0.28, 25)
    if (this.beat % 4 === 2) this.tone(175, 0.04, 'sawtooth', 0.1, 70)
    if (this.beat % 8 === 6) this.tone(f * 8, 0.1, 'square', 0.045)
    this.beat++
  }
  dispose() {
    void this.context?.close()
  }
}
