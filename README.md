# ARQ-SIM 3D — Simulador Paramétrico de Diseño Arquitectónico

Aplicación web interactiva que integra álgebra, geometría analítica y visualización 3D para el diseño arquitectónico paramétrico. El usuario modifica las dimensiones de una edificación y observa en tiempo real los cambios en el modelo 3D, las áreas, los volúmenes, los costos y las ecuaciones matemáticas.

**Proyecto Final — Diseño Computacional y Simulación Arquitectónica**
**Álgebra y Geometría Analítica — 2026-II**
**Línea: Diseño Paramétrico y Visualización 3D Interactiva**

---

## Características

- Modelo 3D paramétrico construido con Three.js (OrbitControls, zoom, rotación, pan).
- Vistas predefinidas: Perspectiva, Frontal, Lateral, Superior + Reiniciar vista.
- Control por pisos (1–5): ancho, largo, altura, visibilidad y resaltado por piso.
- Zonas arquitectónicas: Sala, Cocina, Comedor, Habitación, Baño, Circulación.
- Materiales: Concreto, Ladrillo, Vidrio, Madera.
- Modos de vista: Arquitectónica, Estructural, Análisis.
- Exploded view (separar pisos).
- Dashboard de métricas en tiempo real: área, volumen, altura, costo, área óptima, índice de aprovechamiento.
- Panel matemático con fórmulas, sustituciones y resultados.
- Gráficas: Costo vs Área (lineal) y Área vs Ancho (cuadrática).
- Modo presentación, exportación de reporte, botón de reset.
- Diseño responsive (escritorio, tablet, móvil).

## Matemáticas implementadas

### Números decimales
Todas las dimensiones, alturas, espesores, áreas y volúmenes usan números decimales con precisión completa. El formato se aplica solo al mostrar.

### Ecuación lineal — Costo
```
C(A) = A × valor_m² + costos_fijos
```

### Ecuación cuadrática — Optimización del área
```
A(x) = -x² + b·x
Vértice: x_v = -b / (2a)   (con a = -1 → x_v = b/2)
A_max = A(x_v)
```

### Geometría analítica
- Coordenadas del lote centradas en el origen (planos XZ, altura Y).
- Área, perímetro, volumen y altura total calculados en tiempo real.
- Visualización opcional de ejes X, Y, Z.

## Librerías utilizadas

- **React 18** + **TypeScript** — UI
- **Three.js** — Renderizado 3D
- **Chart.js** — Gráficas de ecuaciones
- **Vite** — Bundler y servidor de desarrollo
- **Tailwind CSS** — Estilos base
- **Lucide React** — Iconos

## Instalación

```bash
npm install
```

## Ejecución (desarrollo)

```bash
npm run dev
```

## Construcción

```bash
npm run build
```

Los archivos compilados quedan en `dist/`.

## Despliegue en GitHub Pages

1. Compilar el proyecto:
   ```bash
   npm run build
   ```
2. El archivo `vite.config.ts` incluye `base: './'` para compatibilidad con GitHub Pages.
3. Subir el contenido de `dist/` a la rama `gh-pages`:
   ```bash
   npm run build
   npx gh-pages -d dist
   ```
   O manualmente: copiar `dist/` al repositorio y publicar en GitHub Pages.

## Estructura del proyecto

```
src/
  components/     Componentes UI (controles, métricas, dashboard matemático, modal)
  modules/        Lógica Three.js (escena, edificio, materiales, gráficas)
  utils/          Funciones matemáticas (cálculos, lineal, cuadrática, formato)
  App.tsx         Componente principal con estado global
  index.css       Estilos
  main.tsx        Punto de entrada
```
