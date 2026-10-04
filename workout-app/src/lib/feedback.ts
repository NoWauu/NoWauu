// Haptic + audio cues. Vibration exists on Android only; the beep works on
// iOS too, provided the AudioContext was created during a user gesture —
// hence `primeAudio()` is called from the "validate set" tap.

let ctx: AudioContext | null = null;

export function primeAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [0, 0.18].forEach((offset) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.14);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.15);
  });
}

export function haptic(pattern: number | number[] = 12) {
  navigator.vibrate?.(pattern);
}
