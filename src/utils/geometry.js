export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(dx, dy) {
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function randomPointInCircle(scene, x, y, radius) {
  const angle = scene.mathRng.realInRange(0, Math.PI * 2);
  const distanceScale = Math.sqrt(scene.mathRng.realInRange(0, 1));
  return {
    x: x + Math.cos(angle) * radius * distanceScale,
    y: y + Math.sin(angle) * radius * distanceScale
  };
}
