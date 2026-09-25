import { formatNumber, formatCOP } from '@/utils/format';

interface MathDashboardProps {
  // Decimals
  buildingWidth: number;
  buildingLength: number;
  floorHeight: number;
  areaPerFloor: number;
  volumePerFloor: number;
  // Linear
  costPerM2: number;
  fixedCosts: number;
  totalArea: number;
  totalCost: number;
  // Quadratic
  quadB: number;
  optimalWidth: number;
  maxArea: number;
  currentQuadArea: number;
  // Geometry
  lotWidth: number;
  lotLength: number;
  lotArea: number;
  perimeter: number;
  totalHeight: number;
  totalVolume: number;
  numFloors: number;
}

export function MathDashboard(props: MathDashboardProps) {
  return (
    <div className="math-dashboard">
      {/* 1. Decimals */}
      <div className="math-section">
        <h4>1. Operaciones con Números Decimales</h4>
        <div className="math-block">
          <div className="math-formula">A = ancho × largo</div>
          <div className="math-substitution">
            A = {formatNumber(props.buildingWidth, 2)} × {formatNumber(props.buildingLength, 2)}
          </div>
          <div className="math-result">
            A = <strong>{formatNumber(props.areaPerFloor, 2)} m²</strong>
          </div>
        </div>
        <div className="math-block">
          <div className="math-formula">V = A × h</div>
          <div className="math-substitution">
            V = {formatNumber(props.areaPerFloor, 2)} × {formatNumber(props.floorHeight, 2)}
          </div>
          <div className="math-result">
            V = <strong>{formatNumber(props.volumePerFloor, 2)} m³</strong>
          </div>
        </div>
        <div className="math-explanation">
          Se utilizan números decimales en todas las dimensiones, alturas, espesores,
          áreas y volúmenes. Los cálculos mantienen precisión y solo se redondean al mostrar.
        </div>
      </div>

      {/* 2. Linear equation */}
      <div className="math-section">
        <h4>2. Ecuación Lineal — Cálculo de Costos (COP)</h4>
        <div className="math-block">
          <div className="math-formula">C(A) = A · valor_m² + costos_fijos</div>
          <div className="math-substitution">
            C(A) = A · {formatNumber(props.costPerM2, 0)} + {formatNumber(props.fixedCosts, 0)}
          </div>
          <div className="math-substitution">
            C({formatNumber(props.totalArea, 2)}) = {formatNumber(props.totalArea, 2)} × {formatNumber(props.costPerM2, 0)} + {formatNumber(props.fixedCosts, 0)}
          </div>
          <div className="math-result">
            C = <strong>{formatCOP(props.totalCost)}</strong>
          </div>
        </div>
        <div className="math-explanation">
          La función de costo es una ecuación lineal de la forma y = mx + b, donde la
          pendiente m es el valor por m² (en COP) y el intercepto b son los costos fijos (en COP).
        </div>
      </div>

      {/* 3. Quadratic equation */}
      <div className="math-section">
        <h4>3. Ecuación Cuadrática — Optimización del Área</h4>
        <div className="math-block">
          <div className="math-formula">A(x) = -x² + b·x</div>
          <div className="math-substitution">
            A(x) = -x² + {formatNumber(props.quadB, 2)}·x
          </div>
          <div className="math-block-nested">
            <div className="math-formula">Vértice: x_v = -b / (2a)</div>
            <div className="math-substitution">
              a = -1, b = {formatNumber(props.quadB, 2)}
            </div>
            <div className="math-substitution">
              x_v = -({formatNumber(props.quadB, 2)}) / (2 × -1) = {formatNumber(props.quadB, 2)} / 2
            </div>
            <div className="math-result">
              x óptimo = <strong>{formatNumber(props.optimalWidth, 2)} m</strong>
            </div>
            <div className="math-result">
              A máxima = <strong>{formatNumber(props.maxArea, 2)} m²</strong>
            </div>
          </div>
          <div className="math-substitution">
            Para el ancho actual: A({formatNumber(props.buildingWidth, 2)}) = <strong>{formatNumber(props.currentQuadArea, 2)} m²</strong>
          </div>
        </div>
        <div className="math-explanation">
          La parábola tiene concavidad hacia abajo (a &lt; 0), por lo que el vértice
          representa el máximo. El ancho óptimo maximiza el área construida.
        </div>
      </div>

      {/* 4. Analytic geometry */}
      <div className="math-section">
        <h4>4. Geometría Analítica</h4>
        <div className="math-block">
          <div className="math-formula">Lote: {formatNumber(props.lotWidth, 2)} × {formatNumber(props.lotLength, 2)} m</div>
          <div className="math-substitution">
            Área del lote = {formatNumber(props.lotWidth, 2)} × {formatNumber(props.lotLength, 2)} = <strong>{formatNumber(props.lotArea, 2)} m²</strong>
          </div>
          <div className="math-substitution">
            Perímetro = 2({formatNumber(props.lotWidth, 2)} + {formatNumber(props.lotLength, 2)}) = <strong>{formatNumber(props.perimeter, 2)} m</strong>
          </div>
          <div className="math-substitution">
            Altura total ({props.numFloors} pisos) = <strong>{formatNumber(props.totalHeight, 2)} m</strong>
          </div>
          <div className="math-substitution">
            Volumen total = <strong>{formatNumber(props.totalVolume, 2)} m³</strong>
          </div>
        </div>
        <div className="math-explanation">
          El sistema de coordenadas ubica el lote centrado en el origen. Los ejes X y Z
          definen el plano del terreno; el eje Y representa la altura. Active "Mostrar ejes"
          para visualizar el sistema coordenado en el modelo 3D.
        </div>
      </div>
    </div>
  );
}
