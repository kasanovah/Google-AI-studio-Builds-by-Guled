export function playSomaliVoicePreview(text: string, pitch = 1.0, rate = 1.0) {
  if (typeof window === 'undefined') return;

  // If SpeechSynthesis is available in browser
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = pitch;
    utterance.rate = rate;
    
    // Check if any Somali or Arabic/East African voice is installed
    const voices = window.speechSynthesis.getVoices();
    const somaliVoice = voices.find(v => v.lang.startsWith('so') || v.lang.startsWith('ar') || v.name.toLowerCase().includes('somali'));
    if (somaliVoice) {
      utterance.voice = somaliVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    return;
  }

  // Fallback pleasant Web Audio synth chime
  try {
    const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(261.63 * pitch, now); // C4
    osc1.frequency.exponentialRampToValueAtTime(329.63 * pitch, now + 0.15); // E4
    osc1.frequency.exponentialRampToValueAtTime(392.00 * pitch, now + 0.35); // G4

    osc2.frequency.setValueAtTime(130.81 * pitch, now);
    osc2.frequency.exponentialRampToValueAtTime(196.00 * pitch, now + 0.35);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio preview fallback unavailable:', err);
  }
}
