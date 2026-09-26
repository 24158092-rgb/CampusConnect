/**
 * Emergency siren built with the Web Audio API (no audio files, works offline).
 * Browsers only allow sound after a user gesture, so `unlockAudio()` is called on login.
 */
let ctx: AudioContext | null = null;
let stopFn: (() => void) | null = null;

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
  }
  return ctx;
}

export function unlockAudio() {
  try {
    void context().resume();
  } catch {
    /* audio unavailable */
  }
}

export function startSiren() {
  stopSiren();
  try {
    const ac = context();
    void ac.resume();
    const osc = ac.createOscillator();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 900;
    lfo.type = 'sine';
    lfo.frequency.value = 1.6; // wail speed
    lfoGain.gain.value = 350; // sweep 550–1250 Hz
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.value = 0.18;
    osc.connect(gain).connect(ac.destination);
    osc.start();
    lfo.start();
    if ('vibrate' in navigator) navigator.vibrate([600, 300, 600, 300, 600, 300, 600]);
    stopFn = () => {
      try {
        gain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
        osc.stop(ac.currentTime + 0.2);
        lfo.stop(ac.currentTime + 0.2);
      } catch {
        /* already stopped */
      }
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  } catch {
    stopFn = null;
  }
}

export function stopSiren() {
  stopFn?.();
  stopFn = null;
}
