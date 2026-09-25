import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager, ViewMode as SceneView, SunParams } from '@/modules/scene';
import { Building, FloorData, ZONES, ViewMode as BuildingView } from '@/modules/building';
import { ChartManager } from '@/modules/charts';
import { MaterialType, MATERIALS } from '@/modules/materials';
import {
  calculateArea,
  calculateVolume,
  calculateTotalVolume,
  calculateLotArea,
  calculatePerimeter,
  calculateTotalHeight,
  calculateUtilizationIndex,
  calculateCost,
  getLotCorners,
} from '@/utils/calculations';
import { linearCost, linearCostPoints, linearEquationString } from '@/utils/linear';
import {
  quadraticArea,
  calculateOptimalWidth,
  calculateMaximumArea,
  quadraticPoints,
} from '@/utils/quadratic';
import { formatNumber, formatCOP, clamp } from '@/utils/format';
import { SliderControl, Toggle, Collapsible } from '@/components/Controls';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { MathDashboard } from '@/components/MathDashboard';
import { HelpModal } from '@/components/HelpModal';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Box,
  Layers,
  Grid3x3,
  Eye,
  EyeOff,
  Download,
  HelpCircle,
  Presentation,
  Home,
  Ruler,
  DollarSign,
  TrendingUp,
  Square,
  Boxes,
  Palette,
  Spline,
  Shapes,
  BrickWall,
  Sun,
  Cloud,
  Sunrise,
} from 'lucide-react';

const FLOOR_COLORS = [0x4a90d9, 0x5cb85c, 0xe67e22, 0x9b59b6, 0x1abc9c];

const DEFAULT_PARAMS = {
  lotWidth: 12,
  lotLength: 20,
  buildingWidth: 9,
  buildingLength: 14,
  floorHeight: 2.85,
  numFloors: 2,
  wallThickness: 0.2,
  roofHeight: 1.2,
  costPerM2: 1200000,
  fixedCosts: 5000000,
  quadB: 20,
  materialType: 'concrete' as MaterialType,
};

type TabType = 'metrics' | 'math' | 'charts';
type ViewMode = 'perspective' | 'front' | 'side' | 'top';

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneMgrRef = useRef<SceneManager | null>(null);
  const buildingRef = useRef<Building | null>(null);
  const chartMgrRef = useRef<ChartManager | null>(null);
  const costCanvasRef = useRef<HTMLCanvasElement>(null);
  const parabolaCanvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredFloorRef = useRef<HTMLDivElement>(null);

  // Parameters
  const [lotWidth, setLotWidth] = useState(DEFAULT_PARAMS.lotWidth);
  const [lotLength, setLotLength] = useState(DEFAULT_PARAMS.lotLength);
  const [buildingWidth, setBuildingWidth] = useState(DEFAULT_PARAMS.buildingWidth);
  const [buildingLength, setBuildingLength] = useState(DEFAULT_PARAMS.buildingLength);
  const [floorHeight, setFloorHeight] = useState(DEFAULT_PARAMS.floorHeight);
  const [numFloors, setNumFloors] = useState(DEFAULT_PARAMS.numFloors);
  const [wallThickness, setWallThickness] = useState(DEFAULT_PARAMS.wallThickness);
  const [roofHeight, setRoofHeight] = useState(DEFAULT_PARAMS.roofHeight);
  const [costPerM2, setCostPerM2] = useState(DEFAULT_PARAMS.costPerM2);
  const [fixedCosts, setFixedCosts] = useState(DEFAULT_PARAMS.fixedCosts);
  const [quadB, setQuadB] = useState(DEFAULT_PARAMS.quadB);
  const [materialType, setMaterialType] = useState<MaterialType>(DEFAULT_PARAMS.materialType);
  const [materialPrices, setMaterialPrices] = useState<Record<MaterialType, number>>({
    concrete: MATERIALS.concrete.defaultCostPerM2,
    brick: MATERIALS.brick.defaultCostPerM2,
    glass: MATERIALS.glass.defaultCostPerM2,
    wood: MATERIALS.wood.defaultCostPerM2,
  });

  // Floor data
  const [floors, setFloors] = useState<FloorData[]>(() => {
    const arr: FloorData[] = [];
    for (let i = 0; i < 5; i++) {
      arr.push({
        width: DEFAULT_PARAMS.buildingWidth,
        length: DEFAULT_PARAMS.buildingLength,
        height: DEFAULT_PARAMS.floorHeight,
        visible: i < DEFAULT_PARAMS.numFloors,
        color: FLOOR_COLORS[i],
      });
    }
    return arr;
  });
  const [selectedFloor, setSelectedFloor] = useState(0);

  // UI state
  const [showAxes, setShowAxes] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [wallVisibility, setWallVisibility] = useState({
    front: true,
    back: true,
    left: true,
    right: true,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('perspective');
  const [buildingViewMode, setBuildingViewMode] = useState<BuildingView>('architectural');
  const [activeZones, setActiveZones] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [helpOpen, setHelpOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [validationMsg, setValidationMsg] = useState<string>('');
  const [hoverInfo, setHoverInfo] = useState<{ floor: number; area: number; height: number } | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [sunTime, setSunTime] = useState(12);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  const [sunAzimuth, setSunAzimuth] = useState(135);
  const [sunShadows, setSunShadows] = useState(true);

  // Init scene
  useEffect(() => {
    if (!viewportRef.current) return;
    const sm = new SceneManager(viewportRef.current);
    sceneMgrRef.current = sm;
    const bld = new Building();
    buildingRef.current = bld;
    sm.scene.add(bld.group);

    // Pointer events for hover/click
    const canvas = sm.renderer.domElement;
    const onMove = (e: MouseEvent) => {
      sm.getPointerCoords(e);
      const meshes = bld.getFloorMeshes();
      const hits = sm.raycast(meshes);
      if (hits.length > 0) {
        const fi = hits[0].object.userData.floorIndex as number;
        if (fi !== undefined) {
          const f = floors[fi];
          if (f) {
            setHoverInfo({
              floor: fi,
              area: calculateArea(f.width, f.length),
              height: f.height,
            });
            setHoverPos({ x: e.clientX, y: e.clientY });
            return;
          }
        }
      }
      setHoverInfo(null);
    };
    const onClick = (e: MouseEvent) => {
      sm.getPointerCoords(e);
      const meshes = bld.getFloorMeshes();
      const hits = sm.raycast(meshes);
      if (hits.length > 0) {
        const fi = hits[0].object.userData.floorIndex as number;
        if (fi !== undefined) setSelectedFloor(fi);
      }
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
      sm.dispose();
      bld.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init charts
  useEffect(() => {
    if (!costCanvasRef.current || !parabolaCanvasRef.current) return;
    const cm = new ChartManager(costCanvasRef.current, parabolaCanvasRef.current);
    chartMgrRef.current = cm;
    return () => {
      cm.dispose();
      chartMgrRef.current = null;
    };
  }, [activeTab]);

  // Resize viewport when tab changes (right panel content height may shift)
  useEffect(() => {
    const id = requestAnimationFrame(() => sceneMgrRef.current?.resize());
    return () => cancelAnimationFrame(id);
  }, [activeTab, rightPanelOpen, sidebarOpen, presentationMode]);

  // Update building when params change
  useEffect(() => {
    if (!buildingRef.current) return;
    const visibleFloors = floors.slice(0, numFloors).map((f, i) => ({
      ...f,
      visible: true,
    }));
    buildingRef.current.update({
      lotWidth,
      lotLength,
      floors: visibleFloors,
      wallThickness,
      roofHeight,
      materialType,
    });
  }, [lotWidth, lotLength, floors, numFloors, wallThickness, roofHeight, materialType]);

  // Update axes
  useEffect(() => {
    sceneMgrRef.current?.setAxesVisible(showAxes);
  }, [showAxes]);

  // Update exploded
  useEffect(() => {
    buildingRef.current?.setExploded(exploded);
  }, [exploded]);

  // Update walls visibility
  useEffect(() => {
    buildingRef.current?.setWallVisibility(wallVisibility);
  }, [wallVisibility]);

  // Update selected floor
  useEffect(() => {
    buildingRef.current?.setSelectedFloor(selectedFloor);
  }, [selectedFloor, exploded, floors, numFloors]);

  // Update zones
  useEffect(() => {
    buildingRef.current?.setActiveZones(activeZones);
  }, [activeZones, floors, numFloors, exploded]);

  // Update material
  useEffect(() => {
    buildingRef.current?.setMaterialType(materialType);
  }, [materialType]);

  // Update building view mode
  useEffect(() => {
    buildingRef.current?.setViewMode(buildingViewMode);
  }, [buildingViewMode]);

  // Update sun/ambient params
  useEffect(() => {
    sceneMgrRef.current?.setSunParams({
      timeOfDay: sunTime,
      intensity: sunIntensity,
      azimuth: sunAzimuth,
      shadows: sunShadows,
    } as SunParams);
  }, [sunTime, sunIntensity, sunAzimuth, sunShadows]);

  // Validation
  useEffect(() => {
    if (buildingWidth > lotWidth) {
      setValidationMsg('El ancho construido no puede superar el ancho disponible del lote.');
    } else if (buildingLength > lotLength) {
      setValidationMsg('El largo construido no puede superar el largo disponible del lote.');
    } else if (buildingWidth <= 0 || buildingLength <= 0) {
      setValidationMsg('Las dimensiones deben ser mayores a cero.');
    } else {
      setValidationMsg('');
    }
  }, [buildingWidth, buildingLength, lotWidth, lotLength]);

  // === Calculations ===
  const visibleFloors = floors.slice(0, numFloors);
  const areaPerFloor = visibleFloors.map((f) => calculateArea(f.width, f.length));
  const volumePerFloor = visibleFloors.map((f, i) => calculateVolume(areaPerFloor[i], f.height));
  const totalArea = areaPerFloor.reduce((s, a) => s + a, 0);
  const totalVolume = calculateTotalVolume(areaPerFloor, visibleFloors.map((f) => f.height));
  const lotArea = calculateLotArea(lotWidth, lotLength);
  const perimeter = calculatePerimeter(lotWidth, lotLength);
  const totalHeight = calculateTotalHeight(visibleFloors.map((f) => f.height), roofHeight);
  const totalCost = calculateCost(totalArea, costPerM2, fixedCosts);
  const utilizationIndex = calculateUtilizationIndex(totalArea, lotArea);
  const optimalWidth = calculateOptimalWidth(quadB);
  const maxArea = calculateMaximumArea(quadB);
  const currentQuadArea = quadraticArea(buildingWidth, quadB);
  const lotCorners = getLotCorners(lotWidth, lotLength);

  // Update charts
  useEffect(() => {
    if (!chartMgrRef.current) return;
    const minA = 0;
    const maxA = Math.max(totalArea * 2, lotArea * 2, 500);
    const linePts = linearCostPoints(costPerM2, fixedCosts, minA, maxA);
    chartMgrRef.current.updateCostChart(linePts, totalArea, totalCost);

    const parabolaPts = quadraticPoints(quadB);
    chartMgrRef.current.updateParabolaChart(
      parabolaPts,
      { x: optimalWidth, y: maxArea },
      { x: buildingWidth, y: currentQuadArea }
    );
  }, [costPerM2, fixedCosts, totalArea, totalCost, quadB, optimalWidth, maxArea, buildingWidth, currentQuadArea, lotArea]);

  // View change
  const handleViewChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    sceneMgrRef.current?.setView(v as SceneView);
  }, []);

  const handleResetView = useCallback(() => {
    setViewMode('perspective');
    sceneMgrRef.current?.resetView();
  }, []);

  // Reset simulation
  const handleReset = useCallback(() => {
    setLotWidth(DEFAULT_PARAMS.lotWidth);
    setLotLength(DEFAULT_PARAMS.lotLength);
    setBuildingWidth(DEFAULT_PARAMS.buildingWidth);
    setBuildingLength(DEFAULT_PARAMS.buildingLength);
    setFloorHeight(DEFAULT_PARAMS.floorHeight);
    setNumFloors(DEFAULT_PARAMS.numFloors);
    setWallThickness(DEFAULT_PARAMS.wallThickness);
    setRoofHeight(DEFAULT_PARAMS.roofHeight);
    setCostPerM2(DEFAULT_PARAMS.costPerM2);
    setFixedCosts(DEFAULT_PARAMS.fixedCosts);
    setQuadB(DEFAULT_PARAMS.quadB);
    setMaterialType(DEFAULT_PARAMS.materialType);
    setMaterialPrices({
      concrete: MATERIALS.concrete.defaultCostPerM2,
      brick: MATERIALS.brick.defaultCostPerM2,
      glass: MATERIALS.glass.defaultCostPerM2,
      wood: MATERIALS.wood.defaultCostPerM2,
    });
    setSelectedFloor(0);
    setShowAxes(false);
    setExploded(false);
    setWallVisibility({ front: true, back: true, left: true, right: true });
    setActiveZones(new Set());
    setBuildingViewMode('architectural');
    setFloors(() => {
      const arr: FloorData[] = [];
      for (let i = 0; i < 5; i++) {
        arr.push({
          width: DEFAULT_PARAMS.buildingWidth,
          length: DEFAULT_PARAMS.buildingLength,
          height: DEFAULT_PARAMS.floorHeight,
          visible: i < DEFAULT_PARAMS.numFloors,
          color: FLOOR_COLORS[i],
        });
      }
      return arr;
    });
    sceneMgrRef.current?.resetView();
    setViewMode('perspective');
    setSunTime(12);
    setSunIntensity(1.0);
    setSunAzimuth(135);
    setSunShadows(true);
  }, []);

  // Export report
  const handleExport = useCallback(() => {
    const eq = linearEquationString(costPerM2, fixedCosts);
    const report = [
      '═══════════════════════════════════════════════',
      '  ARQ-SIM 3D — REPORTE DE SIMULACIÓN',
      '  Simulador Paramétrico de Diseño Arquitectónico',
      '  Álgebra y Geometría Analítica — 2026-II',
      '═══════════════════════════════════════════════',
      '',
      '--- DIMENSIONES DEL LOTE ---',
      `Ancho del lote:        ${formatNumber(lotWidth, 2)} m`,
      `Largo del lote:        ${formatNumber(lotLength, 2)} m`,
      `Área del lote:         ${formatNumber(lotArea, 2)} m²`,
      `Perímetro del lote:    ${formatNumber(perimeter, 2)} m`,
      '',
      '--- DIMENSIONES DEL EDIFICIO ---',
      `Ancho construido:      ${formatNumber(buildingWidth, 2)} m`,
      `Largo construido:      ${formatNumber(buildingLength, 2)} m`,
      `Altura de entrepiso:   ${formatNumber(floorHeight, 2)} m`,
      `Número de pisos:       ${numFloors}`,
      `Espesor de muros:      ${formatNumber(wallThickness, 2)} m`,
      `Altura de cubierta:    ${formatNumber(roofHeight, 2)} m`,
      '',
      '--- ÁREAS Y VOLUMEN ---',
      ...visibleFloors.map((f, i) =>
        `Piso ${i + 1}:  Área = ${formatNumber(areaPerFloor[i], 2)} m²  |  Volumen = ${formatNumber(volumePerFloor[i], 2)} m³`
      ),
      `Área total construida: ${formatNumber(totalArea, 2)} m²`,
      `Volumen total:         ${formatNumber(totalVolume, 2)} m³`,
      `Altura total:          ${formatNumber(totalHeight, 2)} m`,
      '',
      '--- COSTOS (ECUACIÓN LINEAL) ---',
      `Ecuación:              ${eq}`,
      `Valor por m²:          ${formatNumber(costPerM2, 0)} COP/m²`,
      `Costos fijos:          ${formatNumber(fixedCosts, 0)} COP`,
      `Costo estimado total:  ${formatNumber(totalCost, 0)} COP`,
      '',
      '--- OPTIMIZACIÓN (ECUACIÓN CUADRÁTICA) ---',
      `Ecuación:              A(x) = -x² + ${formatNumber(quadB, 2)}·x`,
      `Ancho óptimo:          ${formatNumber(optimalWidth, 2)} m`,
      `Área máxima:           ${formatNumber(maxArea, 2)} m²`,
      `Área actual (cuad.):   ${formatNumber(currentQuadArea, 2)} m²`,
      '',
      '--- GEOMETRÍA ANALÍTICA ---',
      `Coordenadas del lote (centrado en origen):`,
      ...lotCorners.map((c, i) => `  V${i + 1}: (${formatNumber(c.x, 2)}, ${formatNumber(c.y, 2)})`),
      `Índice de aprovechamiento: ${formatNumber(utilizationIndex, 2)} %`,
      '',
      '--- MATERIAL ---',
      `Material: ${MATERIALS[materialType].name}`,
      '',
      '═══════════════════════════════════════════════',
      '  Generado por ARQ-SIM 3D',
      '═══════════════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARQ-SIM-3D-reporte.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [
    lotWidth, lotLength, lotArea, perimeter, buildingWidth, buildingLength,
    floorHeight, numFloors, wallThickness, roofHeight, areaPerFloor, volumePerFloor,
    totalArea, totalVolume, totalHeight, costPerM2, fixedCosts, totalCost,
    quadB, optimalWidth, maxArea, currentQuadArea, lotCorners, utilizationIndex,
    materialType, visibleFloors,
  ]);

  const handleMaterialChange = (mt: MaterialType) => {
    setMaterialType(mt);
    setCostPerM2(materialPrices[mt]);
  };

  const handleCostPerM2Change = (v: number) => {
    setCostPerM2(v);
    setMaterialPrices((prev) => ({ ...prev, [materialType]: v }));
  };

  // Update floor data when global building dims change
  const updateAllFloorsWidth = (w: number) => {
    setBuildingWidth(w);
    setFloors((prev) => prev.map((f, i) => i < numFloors ? { ...f, width: w } : f));
  };
  const updateAllFloorsLength = (l: number) => {
    setBuildingLength(l);
    setFloors((prev) => prev.map((f, i) => i < numFloors ? { ...f, length: l } : f));
  };
  const updateAllFloorsHeight = (h: number) => {
    setFloorHeight(h);
    setFloors((prev) => prev.map((f, i) => i < numFloors ? { ...f, height: h } : f));
  };

  // Per-floor editing
  const updateFloor = (idx: number, key: keyof FloorData, value: any) => {
    setFloors((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };

  // Toggle zone
  const toggleZone = (zoneName: string) => {
    setActiveZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneName)) next.delete(zoneName);
      else next.add(zoneName);
      return next;
    });
  };

  const selectedFloorData = floors[selectedFloor];
  const selectedFloorArea = selectedFloorData ? calculateArea(selectedFloorData.width, selectedFloorData.length) : 0;
  const selectedFloorVolume = selectedFloorData ? calculateVolume(selectedFloorArea, selectedFloorData.height) : 0;

  return (
    <div className={`app ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Mostrar/Ocultar controles"
          >
            <Box size={18} />
          </button>
          <div className="project-title">
            <span className="title-main">ARQ-SIM 3D</span>
            <span className="title-sub">Simulador Paramétrico de Diseño Arquitectónico</span>
          </div>
        </div>
        <div className="topbar-center">
          <div className="view-buttons">
            {(['perspective', 'front', 'side', 'top'] as ViewMode[]).map((v) => (
              <button
                key={v}
                className={`btn-view ${viewMode === v ? 'active' : ''}`}
                onClick={() => handleViewChange(v)}
              >
                {v === 'perspective' ? 'Perspectiva' : v === 'front' ? 'Frontal' : v === 'side' ? 'Lateral' : 'Superior'}
              </button>
            ))}
            <button className="btn-view" onClick={handleResetView} title="Reiniciar vista">
              <RotateCcw size={14} /> Reiniciar
            </button>
          </div>
        </div>
        <div className="topbar-right">
          <button
            className={`btn-icon ${exploded ? 'active' : ''}`}
            onClick={() => setExploded(!exploded)}
            title="Exploder pisos"
          >
            <Layers size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setHelpOpen(true)}
            title="¿Cómo funciona?"
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={handleExport}
            title="Exportar reporte"
          >
            <Download size={18} />
          </button>
          <button
            className={`btn-icon ${presentationMode ? 'active' : ''}`}
            onClick={() => setPresentationMode(!presentationMode)}
            title="Modo presentación"
          >
            <Presentation size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={handleReset}
            title="Restablecer simulación"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="main-layout">
        {/* Left sidebar */}
        {sidebarOpen && !presentationMode && (
          <aside className="sidebar-left">
            <Collapsible title="LOTE" icon={<Home size={14} />}>
              <SliderControl
                label="Ancho del lote"
                value={lotWidth}
                min={5}
                max={30}
                step={0.5}
                unit=" m"
                onChange={setLotWidth}
              />
              <SliderControl
                label="Largo del lote"
                value={lotLength}
                min={5}
                max={40}
                step={0.5}
                unit=" m"
                onChange={setLotLength}
              />
            </Collapsible>

            <Collapsible title="EDIFICACIÓN" icon={<Box size={14} />}>
              <SliderControl
                label="Ancho construido"
                value={buildingWidth}
                min={3}
                max={lotWidth}
                step={0.1}
                unit=" m"
                onChange={updateAllFloorsWidth}
              />
              <SliderControl
                label="Largo construido"
                value={buildingLength}
                min={3}
                max={lotLength}
                step={0.1}
                unit=" m"
                onChange={updateAllFloorsLength}
              />
              <SliderControl
                label="Altura de entrepiso"
                value={floorHeight}
                min={2}
                max={4}
                step={0.05}
                unit=" m"
                onChange={updateAllFloorsHeight}
              />
              <SliderControl
                label="Número de pisos"
                value={numFloors}
                min={1}
                max={5}
                step={1}
                decimals={0}
                onChange={(v) => setNumFloors(Math.round(v))}
              />
              <SliderControl
                label="Espesor de muros"
                value={wallThickness}
                min={0.1}
                max={0.5}
                step={0.01}
                unit=" m"
                onChange={setWallThickness}
              />
              <SliderControl
                label="Altura de cubierta"
                value={roofHeight}
                min={0.5}
                max={3}
                step={0.1}
                unit=" m"
                onChange={setRoofHeight}
              />
            </Collapsible>

            <Collapsible title="CONTROL POR PISOS" icon={<Layers size={14} />}>
              <div className="floor-selector">
                {Array.from({ length: numFloors }, (_, i) => (
                  <button
                    key={i}
                    className={`floor-btn ${selectedFloor === i ? 'active' : ''}`}
                    onClick={() => setSelectedFloor(i)}
                  >
                    Piso {i + 1}
                  </button>
                ))}
              </div>
              {selectedFloorData && selectedFloor < numFloors && (
                <div className="floor-edit">
                  <div className="floor-edit-title">Editando Piso {selectedFloor + 1}</div>
                  <SliderControl
                    label="Ancho"
                    value={selectedFloorData.width}
                    min={3}
                    max={lotWidth}
                    step={0.1}
                    unit=" m"
                    onChange={(v) => updateFloor(selectedFloor, 'width', v)}
                  />
                  <SliderControl
                    label="Largo"
                    value={selectedFloorData.length}
                    min={3}
                    max={lotLength}
                    step={0.1}
                    unit=" m"
                    onChange={(v) => updateFloor(selectedFloor, 'length', v)}
                  />
                  <SliderControl
                    label="Altura"
                    value={selectedFloorData.height}
                    min={2}
                    max={4}
                    step={0.05}
                    unit=" m"
                    onChange={(v) => updateFloor(selectedFloor, 'height', v)}
                  />
                  <div className="floor-info">
                    <div>Área: <strong>{formatNumber(selectedFloorArea, 2)} m²</strong></div>
                    <div>Volumen: <strong>{formatNumber(selectedFloorVolume, 2)} m³</strong></div>
                  </div>
                </div>
              )}
            </Collapsible>

            <Collapsible title="ZONAS" icon={<Grid3x3 size={14} />} defaultOpen={false}>
              <div className="zones-list">
                {ZONES.map((zone) => (
                  <div
                    key={zone.name}
                    className={`zone-item ${activeZones.has(zone.name) ? 'active' : ''}`}
                    onClick={() => toggleZone(zone.name)}
                  >
                    <span className="zone-color" style={{ background: `#${zone.color.toString(16).padStart(6, '0')}` }} />
                    <span>{zone.name}</span>
                    {activeZones.has(zone.name) ? <Eye size={14} /> : <EyeOff size={14} />}
                  </div>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="MATERIALES" icon={<Palette size={14} />} defaultOpen={false}>
              <div className="materials-list">
                {(Object.keys(MATERIALS) as MaterialType[]).map((mt) => (
                  <button
                    key={mt}
                    className={`material-btn ${materialType === mt ? 'active' : ''}`}
                    onClick={() => handleMaterialChange(mt)}
                  >
                    <span
                      className="material-swatch"
                      style={{
                        background: `#${MATERIALS[mt].color.toString(16).padStart(6, '0')}`,
                        opacity: MATERIALS[mt].opacity,
                      }}
                    />
                    {MATERIALS[mt].name}
                  </button>
                ))}
              </div>
              <div className="material-price-display">
                <div className="material-price-label">
                  <DollarSign size={12} />
                  Precio por m² — {MATERIALS[materialType].name}
                </div>
                <div className="material-price-value">{formatCOP(materialPrices[materialType])}</div>
              </div>
              <SliderControl
                label="Editar precio por m²"
                value={costPerM2}
                min={500000}
                max={5000000}
                step={50000}
                decimals={0}
                onChange={handleCostPerM2Change}
                icon={<DollarSign size={14} />}
              />
            </Collapsible>

            <Collapsible title="ILUMINACIÓN Y AMBIENTE" icon={<Sun size={14} />} defaultOpen={false}>
              <SliderControl
                label="Hora del día"
                value={sunTime}
                min={5}
                max={19}
                step={0.5}
                decimals={1}
                unit=" h"
                onChange={setSunTime}
                icon={<Sunrise size={14} />}
              />
              <SliderControl
                label="Intensidad solar"
                value={sunIntensity}
                min={0.1}
                max={2}
                step={0.05}
                decimals={2}
                onChange={setSunIntensity}
                icon={<Sun size={14} />}
              />
              <SliderControl
                label="Orientación solar"
                value={sunAzimuth}
                min={0}
                max={360}
                step={5}
                decimals={0}
                unit="°"
                onChange={setSunAzimuth}
                icon={<Sun size={14} />}
              />
              <Toggle
                label="Sombras"
                checked={sunShadows}
                onChange={setSunShadows}
                icon={<Cloud size={14} />}
              />
            </Collapsible>

            <Collapsible title="VISTAS" icon={<Shapes size={14} />} defaultOpen={false}>
              <div className="view-modes">
                {([
                  ['architectural', 'Arquitectónica'],
                  ['structural', 'Estructural'],
                  ['analysis', 'Análisis'],
                ] as [BuildingView, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    className={`btn-view ${buildingViewMode === mode ? 'active' : ''}`}
                    onClick={() => setBuildingViewMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="OPCIONES" icon={<Grid3x3 size={14} />} defaultOpen={false}>
              <Toggle
                label="Mostrar ejes"
                checked={showAxes}
                onChange={setShowAxes}
                icon={<Ruler size={14} />}
              />
              <Toggle
                label="Exploder pisos"
                checked={exploded}
                onChange={setExploded}
                icon={<Layers size={14} />}
              />
              <div className="wall-toggles">
                <span className="wall-toggles-label">Paredes</span>
                <Toggle
                  label="Frontal"
                  checked={wallVisibility.front}
                  onChange={(v) => setWallVisibility((p) => ({ ...p, front: v }))}
                  icon={<BrickWall size={14} />}
                />
                <Toggle
                  label="Trasera"
                  checked={wallVisibility.back}
                  onChange={(v) => setWallVisibility((p) => ({ ...p, back: v }))}
                  icon={<BrickWall size={14} />}
                />
                <Toggle
                  label="Izquierda"
                  checked={wallVisibility.left}
                  onChange={(v) => setWallVisibility((p) => ({ ...p, left: v }))}
                  icon={<BrickWall size={14} />}
                />
                <Toggle
                  label="Derecha"
                  checked={wallVisibility.right}
                  onChange={(v) => setWallVisibility((p) => ({ ...p, right: v }))}
                  icon={<BrickWall size={14} />}
                />
              </div>
            </Collapsible>
          </aside>
        )}

        {/* Center viewport */}
        <main className="viewport-container">
          <div ref={viewportRef} className="viewport" />

          {/* Floating academic badge */}
          <div className="academic-badge">
            <div className="badge-line">Proyecto Final — Diseño Computacional y Simulación Arquitectónica</div>
            <div className="badge-line">Álgebra y Geometría Analítica — 2026-II</div>
            <div className="badge-line accent">Línea: Diseño Paramétrico y Visualización 3D Interactiva</div>
          </div>

          {/* Hover tooltip */}
          {hoverInfo && (
            <div
              className="hover-tooltip"
              style={{ left: hoverPos.x + 15, top: hoverPos.y + 15 }}
            >
              <div className="tooltip-title">Piso {hoverInfo.floor + 1}</div>
              <div>Área: {formatNumber(hoverInfo.area, 2)} m²</div>
              <div>Altura: {formatNumber(hoverInfo.height, 2)} m</div>
            </div>
          )}

          {/* Validation message */}
          {validationMsg && (
            <div className="validation-msg">
              {validationMsg}
            </div>
          )}

          {/* Presentation metrics overlay */}
          {presentationMode && (
            <div className="presentation-metrics">
              <div className="pres-metric"><span>Área</span><strong>{formatNumber(totalArea, 2)} m²</strong></div>
              <div className="pres-metric"><span>Volumen</span><strong>{formatNumber(totalVolume, 2)} m³</strong></div>
              <div className="pres-metric"><span>Altura</span><strong>{formatNumber(totalHeight, 2)} m</strong></div>
              <div className="pres-metric"><span>Costo</span><strong>{formatCOP(totalCost)}</strong></div>
              <div className="pres-metric"><span>Aprov.</span><strong>{formatNumber(utilizationIndex, 2)}%</strong></div>
            </div>
          )}
        </main>

        {/* Right panel */}
        {rightPanelOpen && !presentationMode && (
          <aside className="sidebar-right">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
                onClick={() => setActiveTab('metrics')}
              >
                <Square size={12} /> Métricas
              </button>
              <button
                className={`tab ${activeTab === 'math' ? 'active' : ''}`}
                onClick={() => setActiveTab('math')}
              >
                <Spline size={12} /> Matemáticas
              </button>
              <button
                className={`tab ${activeTab === 'charts' ? 'active' : ''}`}
                onClick={() => setActiveTab('charts')}
              >
                <TrendingUp size={12} /> Gráficas
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'metrics' && (
                <MetricsDashboard
                  totalArea={totalArea}
                  totalVolume={totalVolume}
                  totalHeight={totalHeight}
                  totalCost={totalCost}
                  optimalArea={maxArea}
                  optimalWidth={optimalWidth}
                  lotArea={lotArea}
                  utilizationIndex={utilizationIndex}
                  perimeter={perimeter}
                />
              )}

              {activeTab === 'math' && (
                <MathDashboard
                  buildingWidth={buildingWidth}
                  buildingLength={buildingLength}
                  floorHeight={floorHeight}
                  areaPerFloor={areaPerFloor[0] ?? 0}
                  volumePerFloor={volumePerFloor[0] ?? 0}
                  costPerM2={costPerM2}
                  fixedCosts={fixedCosts}
                  totalArea={totalArea}
                  totalCost={totalCost}
                  quadB={quadB}
                  optimalWidth={optimalWidth}
                  maxArea={maxArea}
                  currentQuadArea={currentQuadArea}
                  lotWidth={lotWidth}
                  lotLength={lotLength}
                  lotArea={lotArea}
                  perimeter={perimeter}
                  totalHeight={totalHeight}
                  totalVolume={totalVolume}
                  numFloors={numFloors}
                />
              )}

              {activeTab === 'charts' && (
                <div className="charts-panel">
                  <div className="chart-section">
                    <h4>Costo vs Área (Lineal)</h4>
                    <div className="chart-container">
                      <canvas ref={costCanvasRef} />
                    </div>
                  </div>
                  <div className="chart-section">
                    <h4>Área vs Ancho (Cuadrática)</h4>
                    <div className="chart-container">
                      <canvas ref={parabolaCanvasRef} />
                    </div>
                  </div>
                  <div className="chart-controls">
                    <SliderControl
                      label="Valor por m² (COP)"
                      value={costPerM2}
                      min={500000}
                      max={5000000}
                      step={50000}
                      decimals={0}
                      onChange={handleCostPerM2Change}
                      icon={<DollarSign size={14} />}
                    />
                    <SliderControl
                      label="Costos fijos (COP)"
                      value={fixedCosts}
                      min={0}
                      max={50000000}
                      step={500000}
                      decimals={0}
                      onChange={setFixedCosts}
                      icon={<DollarSign size={14} />}
                    />
                    <SliderControl
                      label="Parámetro b (cuadrática)"
                      value={quadB}
                      min={5}
                      max={40}
                      step={0.5}
                      onChange={setQuadB}
                      icon={<TrendingUp size={14} />}
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Mobile toggle for right panel */}
        {!presentationMode && (
          <button
            className="panel-toggle"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title="Mostrar/Ocultar panel"
          >
            {rightPanelOpen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
