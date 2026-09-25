// Linear equation: C(A) = A * costPerM2 + fixedCosts
// Used for the cost estimation model.

export function linearCost(area: number, costPerM2: number, fixedCosts: number): number {
  return area * costPerM2 + fixedCosts;
}

// Returns a human-readable string of the equation with current values.
export function linearEquationString(costPerM2: number, fixedCosts: number): string {
  return `C(A) = ${costPerM2}·A + ${fixedCosts}`;
}

// Generate sample points for the cost-vs-area chart.
export function linearCostPoints(
  costPerM2: number,
  fixedCosts: number,
  minArea: number,
  maxArea: number,
  steps = 50
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = minArea + ((maxArea - minArea) * i) / steps;
    pts.push({ x: a, y: linearCost(a, costPerM2, fixedCosts) });
  }
  return pts;
}
