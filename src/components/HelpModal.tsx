import { useEffect, useRef } from 'react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>¿Cómo funciona el simulador?</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>
            <strong>ARQ-SIM 3D</strong> es un simulador paramétrico de diseño arquitectónico que
            integra el álgebra y la geometría analítica con la visualización tridimensional.
            Permite modificar las dimensiones de una edificación y observar inmediatamente los
            cambios en el modelo 3D, las áreas, los volúmenes y los costos.
          </p>

          <h3>Ecuación Lineal</h3>
          <p>
            Una ecuación lineal tiene la forma <code>y = mx + b</code>. En el simulador se utiliza
            para calcular el costo estimado de la construcción:
            <code>C(A) = A × valor_m² + costos_fijos</code>, donde <em>A</em> es el área
            construida, <em>valor_m²</em> es el costo por metro cuadrado y <em>costos_fijos</em>
            son gastos independientes del área.
          </p>

          <h3>Ecuación Cuadrática</h3>
          <p>
            Una ecuación cuadrática tiene la forma <code>y = ax² + bx + c</code> y su gráfica es
            una parábola. El simulador usa <code>A(x) = -x² + bx</code> para encontrar el ancho
            óptimo que maximiza el área. Cuando <em>a</em> es negativo, la parábola se abre hacia
            abajo y el vértice es el punto máximo. El vértice se calcula con
            <code>x_v = -b / (2a)</code>.
          </p>

          <h3>Cálculo de Área y Volumen</h3>
          <p>
            El área de cada piso se calcula como <code>A = ancho × largo</code>. El volumen de
            cada piso es <code>V = A × altura</code>. El volumen total es la suma de los
            volúmenes de todos los pisos. Todos los cálculos usan números decimales para
            reflejar dimensiones reales.
          </p>

          <h3>Geometría Analítica</h3>
          <p>
            El modelo 3D utiliza un sistema de coordenadas cartesiano: los ejes X y Z definen el
            plano del terreno y el eje Y representa la altura. Puede activar "Mostrar ejes"
            para visualizar este sistema en la escena 3D.
          </p>

          <h3>Relación matemática-arquitectura</h3>
          <p>
            Las matemáticas permiten cuantificar y optimizar el diseño: el área determina el
            espacio útil, el volumen influye en el confort térmico, la ecuación lineal modela
            los costos, y la cuadrática encuentra la configuración óptima. El simulador
            demuestra que estas herramientas algebraicas son fundamentales en el proceso
            de diseño arquitectónico computacional.
          </p>
        </div>
      </div>
    </div>
  );
}
