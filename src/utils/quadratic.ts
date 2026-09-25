// Quadratic equation for area optimization: A(x) = -x^2 + b*x
// where x = building width, b = available dimension parameter.

export function quadraticArea(x: number, b: number): number {
  return -x * x + b * x;
}

// Vertex x-coordinate: x_v = -b / (2a) with a = -1  =>  x_v = b / 2
export function calculateOptimalWidth(b: number): number {
  return b / 2;
}

// Maximum area = A(x_v)
export function calculateMaximumArea(b: number): number {
  const xOpt = calculateOptimalWidth(b);
  return quadraticArea(xOpt, b);
}

// Discriminant of -x^2 + b*x = 0  =>  roots at x=0 and x=b
export function quadraticRoots(b: number): [number, number] {
  return [0, b];
}

// Sample points for the parabola chart.
export function quadraticPoints(b: number, steps = 80): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const max = b; // parabola crosses zero at x=b
  for (let i = 0; i <= steps; i++) {
    const x = (max * i) / steps;
    pts.push({ x, y: quadraticArea(x, b) });
  }
  return pts;
}
