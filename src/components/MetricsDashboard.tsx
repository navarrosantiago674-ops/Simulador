import { formatNumber, formatCOP, formatPercent } from '@/utils/format';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: string;
  accent?: string;
}

export function MetricCard({ label, value, unit, icon, accent }: MetricCardProps) {
  return (
    <div className="metric-card" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  );
}

interface MetricsDashboardProps {
  totalArea: number;
  totalVolume: number;
  totalHeight: number;
  totalCost: number;
  optimalArea: number;
  optimalWidth: number;
  lotArea: number;
  utilizationIndex: number;
  perimeter: number;
}

export function MetricsDashboard({
  totalArea,
  totalVolume,
  totalHeight,
  totalCost,
  optimalArea,
  optimalWidth,
  lotArea,
  utilizationIndex,
  perimeter,
}: MetricsDashboardProps) {
  return (
    <div className="metrics-grid">
      <MetricCard label="ÁREA TOTAL" value={formatNumber(totalArea, 2)} unit="m²" icon="▣" accent="#4a90d9" />
      <MetricCard label="VOLUMEN TOTAL" value={formatNumber(totalVolume, 2)} unit="m³" icon="◫" accent="#5cb85c" />
      <MetricCard label="ALTURA TOTAL" value={formatNumber(totalHeight, 2)} unit="m" icon="↕" accent="#e67e22" />
      <MetricCard label="COSTO ESTIMADO" value={formatCOP(totalCost)} icon="$" accent="#9b59b6" />
      <MetricCard label="ÁREA ÓPTIMA" value={formatNumber(optimalArea, 2)} unit="m²" icon="★" accent="#1abc9c" />
      <MetricCard label="ANCHO ÓPTIMO" value={formatNumber(optimalWidth, 2)} unit="m" icon="◆" accent="#f1c40f" />
      <MetricCard label="ÁREA DEL LOTE" value={formatNumber(lotArea, 2)} unit="m²" icon="▭" accent="#95a5a6" />
      <MetricCard label="PERÍMETRO" value={formatNumber(perimeter, 2)} unit="m" icon="⟐" accent="#7f8c8d" />
      <div className="metric-card utilization-card">
        <div className="metric-icon">%</div>
        <div className="metric-label">ÍNDICE DE APROVECHAMIENTO</div>
        <div className="metric-value">
          {formatPercent(utilizationIndex)}
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(utilizationIndex, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
