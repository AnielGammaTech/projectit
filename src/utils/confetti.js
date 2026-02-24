import confetti from 'canvas-confetti';

// Standard task completion confetti
export function fireTaskConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
    ticks: 150,
    gravity: 1.2,
    scalar: 0.9,
  });
}

// Big celebration for completing all tasks or project milestones
export function fireCelebrationConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#f59e0b', '#ef4444', '#ec4899'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

// Subtle confetti for smaller wins
export function fireSubtleConfetti() {
  confetti({
    particleCount: 30,
    spread: 40,
    origin: { y: 0.8 },
    colors: ['#10b981', '#34d399'],
    ticks: 80,
    gravity: 1.5,
    scalar: 0.7,
  });
}
