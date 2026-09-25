import * as THREE from 'three';
import { createBuildingMaterial, createZoneMaterial, MaterialType } from './materials';

export interface FloorData {
  width: number;
  length: number;
  height: number;
  visible: boolean;
  color: number;
}

export interface ZoneDef {
  name: string;
  ratio: { x: number; z: number };
  sizeRatio: { w: number; l: number };
  color: number;
}

export const ZONES: ZoneDef[] = [
  { name: 'Sala', ratio: { x: 0.25, z: 0.25 }, sizeRatio: { w: 0.4, l: 0.4 }, color: 0x4a90d9 },
  { name: 'Cocina', ratio: { x: 0.75, z: 0.25 }, sizeRatio: { w: 0.3, l: 0.3 }, color: 0xe67e22 },
  { name: 'Comedor', ratio: { x: 0.25, z: 0.7 }, sizeRatio: { w: 0.35, l: 0.25 }, color: 0x5cb85c },
  { name: 'Habitación', ratio: { x: 0.75, z: 0.7 }, sizeRatio: { w: 0.4, l: 0.35 }, color: 0x9b59b6 },
  { name: 'Baño', ratio: { x: 0.5, z: 0.5 }, sizeRatio: { w: 0.15, l: 0.15 }, color: 0x1abc9c },
  { name: 'Circulación', ratio: { x: 0.5, z: 0.9 }, sizeRatio: { w: 0.8, l: 0.1 }, color: 0x95a5a6 },
];

export type ViewMode = 'architectural' | 'structural' | 'analysis';

function createGrassTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a7c3a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const shade = Math.random();
    const g = Math.floor(0x3a + shade * 0x4a);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.5)}, ${g}, ${Math.floor(g * 0.3)})`;
    ctx.fillRect(x, y, 2, 3);
  }
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${130 + Math.random() * 40}, ${60 + Math.random() * 30}, 0.4)`;
    ctx.fillRect(x, y, 1, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

function createPathTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#9a958a';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const shade = Math.random() * 0.3 - 0.15;
    const v = Math.floor(0x9a + shade * 0x40);
    ctx.fillStyle = `rgb(${v}, ${v - 5}, ${v - 15})`;
    ctx.fillRect(x, y, 3, 3);
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(60, 55, 50, ${0.3 + Math.random() * 0.3})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(Math.random() * 128, Math.random() * 128);
    ctx.lineTo(Math.random() * 128, Math.random() * 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class Building {
  group: THREE.Group;
  private floors: THREE.Group[] = [];
  private zoneGroups: THREE.Group[] = [];
  private terrain: THREE.Mesh;
  private lotPad: THREE.Mesh;
  private lotLines: THREE.LineSegments;
  private pathMesh: THREE.Mesh;
  private drivewayMesh: THREE.Mesh;
  private vegetationGroup: THREE.Group;
  private signGroup: THREE.Group;
  private materialType: MaterialType = 'concrete';
  private wallThickness = 0.2;
  private exploded = false;
  private wallVisibility = { front: true, back: true, left: true, right: true };
  private selectedFloor = -1;
  private viewMode: ViewMode = 'architectural';
  private activeZones: Set<string> = new Set();
  private floorData: FloorData[] = [];
  private lotWidth = 12;
  private lotLength = 20;
  private roofHeight = 1.2;
  private highlightMeshes: THREE.Mesh[] = [];
  private grassTex: THREE.Texture;
  private pathTex: THREE.Texture;

  constructor() {
    this.group = new THREE.Group();

    this.grassTex = createGrassTexture();
    this.pathTex = createPathTexture();

    // Grass terrain
    const terrainGeo = new THREE.PlaneGeometry(200, 200);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: this.grassTex,
      color: 0x6a9a5a,
      roughness: 0.95,
      metalness: 0,
    });
    this.terrain = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.position.y = -0.02;
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);

    // Lot pad (paved area under building, slightly lighter)
    const padGeo = new THREE.PlaneGeometry(1, 1);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xb0b0a8,
      roughness: 0.9,
      metalness: 0,
    });
    this.lotPad = new THREE.Mesh(padGeo, padMat);
    this.lotPad.rotation.x = -Math.PI / 2;
    this.lotPad.position.y = 0.001;
    this.lotPad.receiveShadow = true;
    this.group.add(this.lotPad);

    // Path mesh (walkway from front of lot to building entrance)
    const pathGeo = new THREE.PlaneGeometry(1, 1);
    const pathMat = new THREE.MeshStandardMaterial({
      map: this.pathTex,
      color: 0xaaaaa0,
      roughness: 0.9,
      metalness: 0,
    });
    this.pathMesh = new THREE.Mesh(pathGeo, pathMat);
    this.pathMesh.rotation.x = -Math.PI / 2;
    this.pathMesh.position.y = 0.002;
    this.pathMesh.receiveShadow = true;
    this.group.add(this.pathMesh);

    // Driveway mesh
    const drvGeo = new THREE.PlaneGeometry(1, 1);
    const drvMat = new THREE.MeshStandardMaterial({
      color: 0x8a8a82,
      roughness: 0.95,
      metalness: 0,
    });
    this.drivewayMesh = new THREE.Mesh(drvGeo, drvMat);
    this.drivewayMesh.rotation.x = -Math.PI / 2;
    this.drivewayMesh.position.y = 0.003;
    this.drivewayMesh.receiveShadow = true;
    this.group.add(this.drivewayMesh);

    // Vegetation group
    this.vegetationGroup = new THREE.Group();
    this.group.add(this.vegetationGroup);

    // Sign group
    this.signGroup = new THREE.Group();
    this.group.add(this.signGroup);

    // Lot boundary lines
    const lotMat = new THREE.LineBasicMaterial({ color: 0x4a90d9, linewidth: 2 });
    const lotGeo = new THREE.BufferGeometry();
    this.lotLines = new THREE.LineSegments(lotGeo, lotMat);
    this.group.add(this.lotLines);
  }

  setMaterialType(type: MaterialType) {
    this.materialType = type;
    this.rebuild();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.rebuild();
  }

  setExploded(exploded: boolean) {
    this.exploded = exploded;
    this.rebuild();
  }

  setWallVisibility(walls: { front: boolean; back: boolean; left: boolean; right: boolean }) {
    this.wallVisibility = { ...walls };
    this.rebuild();
  }

  setSelectedFloor(index: number) {
    this.selectedFloor = index;
    this.applyFloorHighlight();
  }

  setActiveZones(zones: Set<string>) {
    this.activeZones = new Set(zones);
    this.rebuildZones();
  }

  update(params: {
    lotWidth: number;
    lotLength: number;
    floors: FloorData[];
    wallThickness: number;
    roofHeight: number;
    materialType: MaterialType;
  }) {
    this.lotWidth = params.lotWidth;
    this.lotLength = params.lotLength;
    this.floorData = params.floors.map((f) => ({ ...f }));
    this.wallThickness = params.wallThickness;
    this.roofHeight = params.roofHeight;
    this.materialType = params.materialType;
    this.rebuild();
  }

  getFloorMeshes(): THREE.Mesh[] {
    return this.floors.flatMap((g, i) =>
      g.children.filter((c): c is THREE.Mesh => c.userData.isFloorSlab && this.floorData[i]?.visible)
    );
  }

  private rebuild() {
    // Remove old floors
    this.floors.forEach((f) => {
      this.group.remove(f);
      this.disposeGroup(f);
    });
    this.floors = [];

    this.updateLotLines();
    this.updateLotPad();
    this.updatePaths();
    this.rebuildVegetation();
    this.rebuildSign();

    let currentY = 0;
    const explodeOffset = this.exploded ? 1.5 : 0;

    this.floorData.forEach((floor, i) => {
      if (!floor.visible) {
        currentY += floor.height + explodeOffset;
        return;
      }

      const floorGroup = new THREE.Group();
      floorGroup.userData.floorIndex = i;

      const w = floor.width;
      const l = floor.length;
      const h = floor.height;
      const t = this.wallThickness;

      // Floor slab
      const slabGeo = new THREE.BoxGeometry(w, 0.15, l);
      const slabMat = new THREE.MeshStandardMaterial({
        color: 0x6a6e78,
        roughness: 0.8,
        metalness: 0.1,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = currentY + 0.075;
      slab.castShadow = true;
      slab.receiveShadow = true;
      slab.userData.isFloorSlab = true;
      slab.userData.floorIndex = i;
      floorGroup.add(slab);

      // Walls
      const wallMat = this.getWallMaterial();
      const wv = this.wallVisibility;

      if (wv.front) {
        const fbWallGeo = new THREE.BoxGeometry(w, h, t);
        const frontWall = new THREE.Mesh(fbWallGeo, wallMat.clone());
        frontWall.position.set(0, currentY + h / 2 + 0.15, l / 2 - t / 2);
        frontWall.castShadow = true;
        frontWall.receiveShadow = true;
        frontWall.userData.floorIndex = i;
        floorGroup.add(frontWall);
      }

      if (wv.back) {
        const fbWallGeo = new THREE.BoxGeometry(w, h, t);
        const backWall = new THREE.Mesh(fbWallGeo, wallMat.clone());
        backWall.position.set(0, currentY + h / 2 + 0.15, -l / 2 + t / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        backWall.userData.floorIndex = i;
        floorGroup.add(backWall);
      }

      if (wv.left) {
        const lrWallGeo = new THREE.BoxGeometry(t, h, l - 2 * t);
        const leftWall = new THREE.Mesh(lrWallGeo, wallMat.clone());
        leftWall.position.set(-w / 2 + t / 2, currentY + h / 2 + 0.15, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        leftWall.userData.floorIndex = i;
        floorGroup.add(leftWall);
      }

      if (wv.right) {
        const lrWallGeo = new THREE.BoxGeometry(t, h, l - 2 * t);
        const rightWall = new THREE.Mesh(lrWallGeo, wallMat.clone());
        rightWall.position.set(w / 2 - t / 2, currentY + h / 2 + 0.15, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        rightWall.userData.floorIndex = i;
        floorGroup.add(rightWall);
      }

      // Windows on front wall
      if (this.viewMode !== 'structural' && wv.front) {
        const winCount = Math.max(2, Math.floor(w / 3));
        const winW = (w - t * (winCount + 1)) / winCount;
        const winH = h * 0.45;
        const winY = currentY + h * 0.55 + 0.15;
        const winMat = new THREE.MeshPhysicalMaterial({
          color: 0x9ecce8,
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          transmission: 0.5,
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
        });
        for (let j = 0; j < winCount; j++) {
          const winGeo = new THREE.BoxGeometry(winW * 0.8, winH, 0.06);
          const win = new THREE.Mesh(winGeo, winMat);
          const xPos = -w / 2 + t + winW / 2 + j * (winW + t);
          win.position.set(xPos, winY, l / 2 + 0.01);
          win.castShadow = false;
          floorGroup.add(win);

          // Window frame
          const frameGeo = new THREE.BoxGeometry(winW * 0.85, winH * 1.05, 0.04);
          const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3 });
          const frame = new THREE.Mesh(frameGeo, frameMat);
          frame.position.set(xPos, winY, l / 2 + 0.005);
          frame.castShadow = true;
          floorGroup.add(frame);
        }
      }

      // Windows on side walls (upper floors only for contemporary look)
      if (this.viewMode !== 'structural' && wv.right && i > 0) {
        const sideWinCount = Math.max(1, Math.floor(l / 4));
        const sideWinW = (l - t * (sideWinCount + 1)) / sideWinCount;
        const sideWinH = h * 0.4;
        const sideWinY = currentY + h * 0.55 + 0.15;
        const sideWinMat = new THREE.MeshPhysicalMaterial({
          color: 0x9ecce8,
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4,
          transmission: 0.5,
          clearcoat: 0.8,
        });
        for (let j = 0; j < sideWinCount; j++) {
          const winGeo = new THREE.BoxGeometry(0.06, sideWinH, sideWinW * 0.8);
          const win = new THREE.Mesh(winGeo, sideWinMat);
          const zPos = -l / 2 + t + sideWinW / 2 + j * (sideWinW + t);
          win.position.set(w / 2 + 0.01, sideWinY, zPos);
          floorGroup.add(win);
        }
      }

      // Door on first floor
      if (i === 0 && this.viewMode !== 'structural' && wv.front) {
        const doorGeo = new THREE.BoxGeometry(1.1, h * 0.7, 0.08);
        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x3a2a1a,
          roughness: 0.6,
          metalness: 0.1,
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, currentY + h * 0.35 + 0.15, l / 2 + 0.02);
        door.castShadow = true;
        floorGroup.add(door);

        // Door frame
        const frameGeo = new THREE.BoxGeometry(1.25, h * 0.75, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.3 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, currentY + h * 0.375 + 0.15, l / 2 + 0.005);
        frame.castShadow = true;
        floorGroup.add(frame);

        // Steps
        const stepGeo = new THREE.BoxGeometry(1.6, 0.1, 0.4);
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x9a958a, roughness: 0.9 });
        const step = new THREE.Mesh(stepGeo, stepMat);
        step.position.set(0, 0.05, l / 2 + 0.25);
        step.castShadow = true;
        step.receiveShadow = true;
        floorGroup.add(step);
      }

      // Balcony on upper floors (front side)
      if (i > 0 && this.viewMode !== 'structural' && wv.front) {
        const balW = w * 0.4;
        const balGeo = new THREE.BoxGeometry(balW, 0.1, 0.8);
        const balMat = new THREE.MeshStandardMaterial({ color: 0x555a66, roughness: 0.7, metalness: 0.2 });
        const balcony = new THREE.Mesh(balGeo, balMat);
        balcony.position.set(0, currentY + 0.15, l / 2 + 0.45);
        balcony.castShadow = true;
        balcony.receiveShadow = true;
        floorGroup.add(balcony);

        // Balcony railing
        const railH = 0.9;
        const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
        const railTopGeo = new THREE.BoxGeometry(balW, 0.04, 0.04);
        const railTop = new THREE.Mesh(railTopGeo, railMat);
        railTop.position.set(0, currentY + 0.15 + railH, l / 2 + 0.85);
        railTop.castShadow = true;
        floorGroup.add(railTop);

        // Railing posts
        const postCount = Math.floor(balW / 0.15);
        for (let p = 0; p <= postCount; p++) {
          const postGeo = new THREE.BoxGeometry(0.02, railH, 0.02);
          const post = new THREE.Mesh(postGeo, railMat);
          const px = -balW / 2 + (balW * p) / postCount;
          post.position.set(px, currentY + 0.15 + railH / 2, l / 2 + 0.85);
          post.castShadow = true;
          floorGroup.add(post);
        }

        // Side railings
        for (const side of [-1, 1]) {
          const sideRailGeo = new THREE.BoxGeometry(0.04, railH, 0.8);
          const sideRail = new THREE.Mesh(sideRailGeo, railMat);
          sideRail.position.set(side * balW / 2, currentY + 0.15 + railH / 2, l / 2 + 0.45);
          sideRail.castShadow = true;
          floorGroup.add(sideRail);
        }
      }

      // Roof overhang / eave on top floor
      if (i === this.floorData.filter(f => f.visible).length - 1 && this.viewMode !== 'structural') {
        const eaveGeo = new THREE.BoxGeometry(w + 0.6, 0.08, l + 0.6);
        const eaveMat = new THREE.MeshStandardMaterial({ color: 0x4a4e58, roughness: 0.7, metalness: 0.1 });
        const eave = new THREE.Mesh(eaveGeo, eaveMat);
        eave.position.y = currentY + h + 0.19;
        eave.castShadow = true;
        eave.receiveShadow = true;
        floorGroup.add(eave);
      }

      // Floor color band
      if (this.viewMode === 'analysis' || this.viewMode === 'architectural') {
        const bandGeo = new THREE.BoxGeometry(w + 0.05, 0.1, l + 0.05);
        const bandMat = new THREE.MeshStandardMaterial({
          color: floor.color,
          roughness: 0.6,
          metalness: 0.1,
          emissive: floor.color,
          emissiveIntensity: 0.1,
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = currentY + h + 0.15;
        floorGroup.add(band);
      }

      this.group.add(floorGroup);
      this.floors.push(floorGroup);

      currentY += h + explodeOffset;
    });

    // Roof
    if (this.floorData.length > 0 && this.floorData.some((f) => f.visible)) {
      const lastVisible = [...this.floorData].reverse().find((f) => f.visible);
      if (lastVisible) {
        const lastW = lastVisible.width;
        const lastL = lastVisible.length;
        const roofGeo = new THREE.BoxGeometry(lastW + 0.3, this.roofHeight, lastL + 0.3);
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x4a4e58,
          roughness: 0.75,
          metalness: 0.1,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = currentY + this.roofHeight / 2 + 0.23;
        roof.castShadow = true;
        roof.receiveShadow = true;
        roof.userData.isRoof = true;
        this.group.add(roof);
        roof.userData.roofMesh = true;
      }
    }

    // Clean old roofs
    const roofs = this.group.children.filter((c) => c.userData.roofMesh);
    if (roofs.length > 1) {
      roofs.slice(0, -1).forEach((r) => {
        this.group.remove(r);
        this.disposeObj(r as THREE.Mesh);
      });
    }

    this.rebuildZones();
    this.applyFloorHighlight();
  }

  private updateLotPad() {
    const padW = this.lotWidth + 1;
    const padL = this.lotLength + 1;
    this.lotPad.scale.set(padW, padL, 1);
    this.lotPad.geometry.dispose();
    this.lotPad.geometry = new THREE.PlaneGeometry(padW, padL);
  }

  private updatePaths() {
    // Walkway: from lot front edge to building entrance (front = +Z)
    const bldL = this.floorData[0]?.length ?? 14;
    const pathW = 1.5;
    const pathLen = (this.lotLength / 2) - (bldL / 2) + 2;
    if (pathLen > 0.5) {
      this.pathMesh.geometry.dispose();
      this.pathMesh.geometry = new THREE.PlaneGeometry(pathW, pathLen);
      this.pathMesh.position.set(0, 0.002, bldL / 2 + pathLen / 2 - 0.5);
    }

    // Driveway: from left side of lot to building
    const drvW = 2.5;
    const drvLen = this.lotWidth / 2 + 3;
    this.drivewayMesh.geometry.dispose();
    this.drivewayMesh.geometry = new THREE.PlaneGeometry(drvLen, drvW);
    this.drivewayMesh.position.set(this.lotWidth / 2 - drvLen / 2 + 1, 0.003, -this.lotLength / 2 + 2);
  }

  private rebuildVegetation() {
    this.vegetationGroup.traverse((obj) => this.disposeObj(obj as THREE.Mesh));
    this.vegetationGroup.clear();

    const hw = this.lotWidth / 2;
    const hl = this.lotLength / 2;
    const margin = 2.5;

    // Trees around the lot perimeter (avoiding front entrance area)
    const treePositions: { x: number; z: number; scale: number }[] = [
      { x: hw + margin, z: hl + margin, scale: 1.0 },
      { x: -hw - margin, z: hl + margin * 0.5, scale: 0.9 },
      { x: hw + margin, z: -hl - margin, scale: 1.1 },
      { x: -hw - margin, z: -hl - margin, scale: 0.85 },
      { x: hw + margin, z: 0, scale: 0.95 },
      { x: -hw - margin * 1.5, z: 0, scale: 1.0 },
      { x: 0, z: -hl - margin * 1.5, scale: 0.9 },
    ];

    for (const pos of treePositions) {
      this.createTree(pos.x, pos.z, pos.scale);
    }

    // Shrubs scattered around
    const shrubPositions: { x: number; z: number }[] = [
      { x: hw + 1.2, z: hl + 0.5 },
      { x: hw + 1.2, z: 3 },
      { x: -hw - 1.2, z: -2 },
      { x: -hw - 1.2, z: hl - 1 },
      { x: hw + 1.2, z: -hl + 1 },
      { x: -hw - 1.2, z: -hl + 2 },
      { x: 3, z: -hl - 1.2 },
      { x: -3, z: -hl - 1.2 },
    ];

    for (const pos of shrubPositions) {
      this.createShrub(pos.x, pos.z);
    }

    // Garden beds near front corners
    this.createGardenBed(hw - 1.5, hl + 0.8, 2, 0.6);
    this.createGardenBed(-hw + 1.5, hl + 0.8, 2, 0.6);
  }

  private createTree(x: number, z: number, scale: number) {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 1.5 * scale, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.9, metalness: 0 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Foliage — layered cones for a fuller look
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.85, metalness: 0 });
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 1.8 * scale, 8), foliageMat);
    f1.position.y = 1.8 * scale;
    f1.castShadow = true;
    f1.receiveShadow = true;
    tree.add(f1);

    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 1.5 * scale, 8), foliageMat.clone());
    f2.position.y = 2.5 * scale;
    f2.castShadow = true;
    tree.add(f2);

    const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.6 * scale, 1.2 * scale, 8), foliageMat.clone());
    f3.position.y = 3.2 * scale;
    f3.castShadow = true;
    tree.add(f3);

    tree.position.set(x, 0, z);
    this.vegetationGroup.add(tree);
  }

  private createShrub(x: number, z: number) {
    const shrubGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9, metalness: 0 });
    const shrub = new THREE.Mesh(shrubGeo, shrubMat);
    shrub.position.set(x, 0.35, z);
    shrub.scale.set(1, 0.6, 1);
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    this.vegetationGroup.add(shrub);

    // Second blob for variety
    const shrub2 = new THREE.Mesh(shrubGeo, shrubMat.clone());
    shrub2.position.set(x + 0.3, 0.3, z + 0.15);
    shrub2.scale.set(0.8, 0.5, 0.8);
    shrub2.castShadow = true;
    this.vegetationGroup.add(shrub2);
  }

  private createGardenBed(x: number, z: number, w: number, l: number) {
    const bedGeo = new THREE.BoxGeometry(w, 0.1, l);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 1, metalness: 0 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(x, 0.05, z);
    bed.receiveShadow = true;
    this.vegetationGroup.add(bed);

    // Small flowers
    for (let i = 0; i < 4; i++) {
      const flowerGeo = new THREE.SphereGeometry(0.08, 6, 4);
      const colors = [0xe74c3c, 0xf1c40f, 0x9b59b6, 0xe67e22];
      const flowerMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(
        x + (Math.random() - 0.5) * w * 0.7,
        0.15,
        z + (Math.random() - 0.5) * l * 0.7
      );
      flower.castShadow = true;
      this.vegetationGroup.add(flower);
    }
  }

  private rebuildSign() {
    this.signGroup.traverse((obj) => this.disposeObj(obj as THREE.Mesh));
    this.signGroup.clear();

    const bldL = this.floorData[0]?.length ?? 14;
    const signX = 1.8;
    const signZ = bldL / 2 + 1.5;

    // Post
    const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.6, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.4 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(signX, 0.8, signZ);
    post.castShadow = true;
    this.signGroup.add(post);

    // Sign board texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2c3e50');
    grad.addColorStop(1, '#1a2a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 488, 232);

    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 464, 208);

    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillStyle = '#f0e6d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('casaSHASA', 256, 128);

    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = '#c9a84c';
    ctx.fillText('Diseño Arquitectónico', 256, 200);

    const signTex = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.BoxGeometry(2.2, 1.1, 0.08);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.5,
      metalness: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(signX, 1.7, signZ);
    sign.castShadow = true;
    sign.receiveShadow = true;
    this.signGroup.add(sign);

    // Small decorative cap on post
    const capGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.3, metalness: 0.7 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(signX, 2.3, signZ);
    cap.castShadow = true;
    this.signGroup.add(cap);
  }

  private rebuildZones() {
    this.zoneGroups.forEach((zg) => {
      this.group.remove(zg);
      this.disposeGroup(zg);
    });
    this.zoneGroups = [];

    if (this.activeZones.size === 0) return;

    let currentY = 0;
    const explodeOffset = this.exploded ? 1.5 : 0;

    this.floorData.forEach((floor, i) => {
      if (!floor.visible) {
        currentY += floor.height + explodeOffset;
        return;
      }

      const zg = new THREE.Group();
      zg.userData.zoneGroup = true;

      ZONES.forEach((zone) => {
        if (!this.activeZones.has(zone.name)) return;
        const zw = floor.width * zone.sizeRatio.w;
        const zl = floor.length * zone.sizeRatio.l;
        const zx = (zone.ratio.x - 0.5) * floor.width;
        const zz = (zone.ratio.z - 0.5) * floor.length;
        const zoneGeo = new THREE.BoxGeometry(zw, floor.height * 0.85, zl);
        const zMat = createZoneMaterial(zone.color, 0.35);
        const zMesh = new THREE.Mesh(zoneGeo, zMat);
        zMesh.position.set(zx, currentY + floor.height / 2 + 0.15, zz);
        zMesh.userData.zoneName = zone.name;
        zMesh.userData.floorIndex = i;
        zg.add(zMesh);
      });

      this.group.add(zg);
      this.zoneGroups.push(zg);
      currentY += floor.height + explodeOffset;
    });
  }

  private updateLotLines() {
    const hw = this.lotWidth / 2;
    const hl = this.lotLength / 2;
    const points = [
      new THREE.Vector3(-hw, 0.01, -hl), new THREE.Vector3(hw, 0.01, -hl),
      new THREE.Vector3(hw, 0.01, -hl), new THREE.Vector3(hw, 0.01, hl),
      new THREE.Vector3(hw, 0.01, hl), new THREE.Vector3(-hw, 0.01, hl),
      new THREE.Vector3(-hw, 0.01, hl), new THREE.Vector3(-hw, 0.01, -hl),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.lotLines.geometry.dispose();
    this.lotLines.geometry = geo;
  }

  private getWallMaterial(): THREE.MeshStandardMaterial {
    if (this.viewMode === 'structural') {
      return new THREE.MeshStandardMaterial({
        color: 0x444a55,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0.3,
        wireframe: false,
      });
    }
    return createBuildingMaterial(this.materialType);
  }

  private applyFloorHighlight() {
    this.highlightMeshes.forEach((m) => {
      this.group.remove(m);
      this.disposeObj(m);
    });
    this.highlightMeshes = [];

    if (this.selectedFloor < 0 || this.selectedFloor >= this.floors.length) return;

    const floor = this.floorData[this.selectedFloor];
    if (!floor || !floor.visible) return;

    const w = floor.width;
    const l = floor.length;
    const h = floor.height;

    let y = 0;
    for (let i = 0; i < this.selectedFloor; i++) {
      if (this.floorData[i].visible) y += this.floorData[i].height + (this.exploded ? 1.5 : 0);
    }

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.1, h, l + 0.1));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc44, linewidth: 3 });
    const highlight = new THREE.LineSegments(edges, lineMat);
    highlight.position.y = y + h / 2 + 0.15;
    this.group.add(highlight);
    this.highlightMeshes.push(highlight as unknown as THREE.Mesh);
  }

  private disposeGroup(group: THREE.Group) {
    group.traverse((obj) => {
      this.disposeObj(obj as THREE.Mesh);
    });
  }

  private disposeObj(obj: THREE.Mesh) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  }

  dispose() {
    this.floors.forEach((f) => this.disposeGroup(f));
    this.zoneGroups.forEach((zg) => this.disposeGroup(zg));
    this.vegetationGroup.traverse((obj) => this.disposeObj(obj as THREE.Mesh));
    this.signGroup.traverse((obj) => this.disposeObj(obj as THREE.Mesh));
    this.highlightMeshes.forEach((m) => this.disposeObj(m));
    this.grassTex.dispose();
    this.pathTex.dispose();
    this.group.clear();
  }
}
