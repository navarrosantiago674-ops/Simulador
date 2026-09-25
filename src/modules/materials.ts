import * as THREE from 'three';

export type MaterialType = 'concrete' | 'brick' | 'glass' | 'wood';

export interface MaterialDef {
  name: string;
  color: number;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  defaultCostPerM2: number;
}

export const MATERIALS: Record<MaterialType, MaterialDef> = {
  concrete: {
    name: 'Concreto',
    color: 0xb8b5ad,
    roughness: 0.85,
    metalness: 0.05,
    opacity: 1,
    transparent: false,
    defaultCostPerM2: 1200000,
  },
  brick: {
    name: 'Ladrillo',
    color: 0xa0522d,
    roughness: 0.9,
    metalness: 0.02,
    opacity: 1,
    transparent: false,
    defaultCostPerM2: 1050000,
  },
  glass: {
    name: 'Vidrio',
    color: 0x6db3d8,
    roughness: 0.1,
    metalness: 0.1,
    opacity: 0.45,
    transparent: true,
    defaultCostPerM2: 1650000,
  },
  wood: {
    name: 'Madera',
    color: 0x8b6914,
    roughness: 0.75,
    metalness: 0.0,
    opacity: 1,
    transparent: false,
    defaultCostPerM2: 1350000,
  },
};

export function createBuildingMaterial(type: MaterialType): THREE.MeshStandardMaterial {
  const def = MATERIALS[type];
  if (type === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      transparent: true,
      opacity: def.opacity,
      transmission: 0.6,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.4,
    }) as unknown as THREE.MeshStandardMaterial;
  }
  return new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: def.roughness,
    metalness: def.metalness,
    transparent: def.transparent,
    opacity: def.opacity,
  });
}

export function createFloorMaterial(floorIndex: number): THREE.MeshStandardMaterial {
  const colors = [0x4a90d9, 0x5cb85c, 0xe67e22, 0x9b59b6, 0x1abc9c];
  return new THREE.MeshStandardMaterial({
    color: colors[floorIndex % colors.length],
    roughness: 0.7,
    metalness: 0.1,
  });
}

export function createZoneMaterial(zoneColor: number, opacity = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: zoneColor,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity,
  });
}
