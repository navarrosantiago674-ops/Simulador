// Core architectural calculation functions.
// All functions use raw float values — formatting is applied only at display time.

export function calculateArea(width: number, length: number): number {
  return width * length;
}

export function calculateVolume(area: number, height: number): number {
  return area * height;
}

export function calculateTotalVolume(floorAreas: number[], floorHeights: number[]): number {
  let total = 0;
  for (let i = 0; i < floorAreas.length; i++) {
    total += floorAreas[i] * (floorHeights[i] ?? 0);
  }
  return total;
}

export function calculateLotArea(width: number, length: number): number {
  return width * length;
}

export function calculatePerimeter(width: number, length: number): number {
  return 2 * (width + length);
}

export function calculateTotalHeight(floorHeights: number[], roofHeight: number): number {
  return floorHeights.reduce((sum, h) => sum + h, 0) + roofHeight;
}

export function calculateUtilizationIndex(buildingArea: number, lotArea: number): number {
  if (lotArea <= 0) return 0;
  return (buildingArea / lotArea) * 100;
}

export interface CostParams {
  costPerM2: number;
  fixedCosts: number;
}

export function calculateCost(area: number, costPerM2: number, fixedCosts: number): number {
  return area * costPerM2 + fixedCosts;
}

// Lot corner coordinates in the XY plane (origin at lot center).
export function getLotCorners(width: number, length: number): { x: number; y: number }[] {
  const hw = width / 2;
  const hl = length / 2;
  return [
    { x: -hw, y: -hl },
    { x: hw, y: -hl },
    { x: hw, y: hl },
    { x: -hw, y: hl },
  ];
}
