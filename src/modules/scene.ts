import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ViewMode = 'perspective' | 'front' | 'side' | 'top';

export interface SunParams {
  timeOfDay: number; // 0-24 hours
  intensity: number; // 0-2
  azimuth: number; // degrees 0-360
  shadows: boolean;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  axesHelper: THREE.AxesHelper;
  gridHelper: THREE.GridHelper;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;

  private container: HTMLElement;
  private initialCamPos: THREE.Vector3;
  private initialCamTarget: THREE.Vector3;
  private animationMixers: THREE.AnimationMixer[] = [];
  private clock = new THREE.Clock();
  private onResize: () => void;
  private animateId: number | null = null;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh;
  private sunMesh: THREE.Mesh;

  private sunParams: SunParams = {
    timeOfDay: 12,
    intensity: 1.0,
    azimuth: 135,
    shadows: true,
  };

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.scene = new THREE.Scene();

    // Sky gradient dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2a6cb8) },
        bottomColor: { value: new THREE.Color(0xc8d8e8) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    this.scene.fog = new THREE.Fog(0xc8d8e8, 80, 300);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.initialCamPos = new THREE.Vector3(22, 16, 26);
    this.initialCamTarget = new THREE.Vector3(0, 4, 0);
    this.camera.position.copy(this.initialCamPos);
    this.camera.lookAt(this.initialCamTarget);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(this.initialCamTarget);
    this.controls.maxDistance = 120;
    this.controls.minDistance = 5;
    this.controls.maxPolarAngle = Math.PI * 0.48;

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere light for natural ambient
    this.hemiLight = new THREE.HemisphereLight(0x88bbe0, 0x4a6b3a, 0.5);
    this.scene.add(this.hemiLight);

    // Visible sun sphere
    const sunGeo = new THREE.SphereGeometry(2, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff5d0, fog: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Grid (subtle, for architectural reference)
    this.gridHelper = new THREE.GridHelper(80, 40, 0x4a6b8a, 0x3a4b5a);
    (this.gridHelper.material as THREE.Material).opacity = 0.15;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.gridHelper.position.y = 0.005;
    this.scene.add(this.gridHelper);

    // Axes
    this.axesHelper = new THREE.AxesHelper(15);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);

    this.updateSunPosition();

    this.animate();
  }

  setAxesVisible(visible: boolean) {
    this.axesHelper.visible = visible;
  }

  setSunParams(params: Partial<SunParams>) {
    this.sunParams = { ...this.sunParams, ...params };
    this.updateSunPosition();
  }

  private updateSunPosition() {
    const { timeOfDay, intensity, azimuth, shadows } = this.sunParams;

    // Time 6 = sunrise (east), 12 = noon (top), 18 = sunset (west)
    const t = ((timeOfDay - 6) / 12) * Math.PI; // 0 at 6h, PI at 18h
    const clampedT = Math.max(0, Math.min(Math.PI, t));

    const elevation = Math.sin(clampedT) * 50 + 2;
    const azimuthRad = (azimuth * Math.PI) / 180;
    const radius = Math.cos(clampedT) * 40;

    const x = Math.cos(azimuthRad) * radius;
    const z = Math.sin(azimuthRad) * radius;
    const y = elevation;

    this.sunLight.position.set(x, y, z);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();

    // Intensity based on time: dim at dawn/dusk, full at noon
    const dayFactor = Math.max(0.05, Math.sin(clampedT));
    this.sunLight.intensity = intensity * dayFactor;
    this.sunLight.castShadow = shadows;

    // Color shift: warm at dawn/dusk, white at noon
    const warmth = 1 - dayFactor;
    const r = 1.0;
    const g = 1.0 - warmth * 0.2;
    const b = 1.0 - warmth * 0.5;
    this.sunLight.color.setRGB(r, g, b);

    // Ambient and hemi also dim
    this.ambientLight.intensity = 0.35 * dayFactor + 0.08;
    this.hemiLight.intensity = 0.5 * dayFactor + 0.05;

    // Sky colors shift
    const skyTop = new THREE.Color();
    skyTop.setRGB(
      0.16 + dayFactor * 0.1,
      0.42 + dayFactor * 0.08,
      0.72 + dayFactor * 0.06
    );
    const skyBottom = new THREE.Color();
    skyBottom.setRGB(
      0.78 + warmth * 0.12,
      0.84 + warmth * 0.02,
      0.88 - warmth * 0.15
    );
    (this.skyMesh.material as THREE.ShaderMaterial).uniforms.topColor.value = skyTop;
    (this.skyMesh.material as THREE.ShaderMaterial).uniforms.bottomColor.value = skyBottom;

    // Fog color matches sky bottom
    this.scene.fog = new THREE.Fog(skyBottom, 80, 300);

    // Sun sphere position and visibility
    this.sunMesh.position.set(x, y, z);
    this.sunMesh.visible = elevation > 1;
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setRGB(r, g, b);
  }

  setView(mode: ViewMode) {
    const target = this.controls.target.clone();
    const dist = this.camera.position.distanceTo(target);
    switch (mode) {
      case 'perspective':
        this.camera.position.set(22, 16, 26);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y + 2, target.z + dist);
        break;
      case 'side':
        this.camera.position.set(target.x + dist, target.y + 2, target.z);
        break;
      case 'top':
        this.camera.position.set(target.x, target.y + dist + 10, target.z + 0.01);
        break;
    }
    this.camera.lookAt(target);
    this.controls.update();
  }

  resetView() {
    this.camera.position.copy(this.initialCamPos);
    this.controls.target.copy(this.initialCamTarget);
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  getPointerCoords(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return this.pointer;
  }

  raycast(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, false);
  }

  private animate = () => {
    this.animateId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.animationMixers.forEach((m) => m.update(delta));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.animateId !== null) cancelAnimationFrame(this.animateId);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
