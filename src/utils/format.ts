export function formatNumber(value: number, decimals = 2): string {
  if (!isFinite(value) || isNaN(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0 COP';
  return '$' + Math.round(value).toLocaleString('es-CO') + ' COP';
}

export function formatCOP(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '$0 COP';
  return '$' + Math.round(value).toLocaleString('es-CO') + ' COP';
}

export function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '0%';
  return formatNumber(value, 2) + '%';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
