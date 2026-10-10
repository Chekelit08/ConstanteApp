import confetti from 'canvas-confetti';

export function fireSubtleConfetti() {
  try {
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#E11D48', '#171717', '#F59E0B', '#10B981'],
      ticks: 180,
      gravity: 1.2,
      scalar: 0.85,
      shapes: ['circle', 'square'],
      disableForReducedMotion: true,
    });
  } catch (e) {
    console.debug('Confetti suppressed:', e);
  }
}
