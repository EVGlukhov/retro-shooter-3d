import * as THREE from "three";

type RailgunEffects = {
  recoil: number;
  muzzleLife: number;
  beamLife: number;
  beamCore: THREE.Mesh;
  beamGlow: THREE.Mesh;
  muzzleFlash: THREE.Mesh;
  muzzleLight: THREE.PointLight;
};

const effects = new WeakMap<THREE.Group, RailgunEffects>();

function addBox(
  group: THREE.Group,
  size: THREE.Vector3,
  position: THREE.Vector3,
  material: THREE.Material,
): void {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    material,
  );
  mesh.position.copy(position);
  group.add(mesh);
}

export function createRailgun(camera: THREE.Camera): THREE.Group {
  const gun = new THREE.Group();
  gun.name = "player-railgun";
  gun.position.set(0.34, -0.29, -0.65);
  gun.scale.setScalar(0.75);

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x222a35,
    metalness: 0.85,
    roughness: 0.28,
  });
  const lightMetal = new THREE.MeshStandardMaterial({
    color: 0x8f9cac,
    metalness: 0.9,
    roughness: 0.2,
  });
  const energyMaterial = new THREE.MeshStandardMaterial({
    color: 0x38d8ff,
    emissive: 0x00aaff,
    emissiveIntensity: 2.5,
    metalness: 0.35,
    roughness: 0.2,
  });

  addBox(
    gun,
    new THREE.Vector3(0.23, 0.16, 0.68),
    new THREE.Vector3(0, 0, -0.19),
    darkMetal,
  );
  addBox(
    gun,
    new THREE.Vector3(0.18, 0.1, 0.28),
    new THREE.Vector3(0, -0.02, 0.25),
    lightMetal,
  );
  addBox(
    gun,
    new THREE.Vector3(0.12, 0.23, 0.16),
    new THREE.Vector3(0, -0.18, 0.02),
    darkMetal,
  );
  addBox(
    gun,
    new THREE.Vector3(0.08, 0.07, 0.34),
    new THREE.Vector3(0, 0.11, -0.24),
    lightMetal,
  );

  for (const side of [-1, 1]) {
    addBox(
      gun,
      new THREE.Vector3(0.045, 0.055, 0.72),
      new THREE.Vector3(side * 0.105, 0.045, -0.49),
      energyMaterial,
    );
  }

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 0.72, 8),
    lightMetal,
  );
  barrel.rotation.x = -Math.PI / 2;
  barrel.position.set(0, 0.025, -0.49);
  gun.add(barrel);

  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xbaf5ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  muzzleFlash.name = "railgun-muzzle-flash";
  muzzleFlash.position.set(0, 0.025, -0.91);
  muzzleFlash.visible = false;
  gun.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight(0x49dfff, 0, 2);
  muzzleLight.position.copy(muzzleFlash.position);
  gun.add(muzzleLight);

  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xd9fbff }),
  );
  const beamGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 1, 8),
    new THREE.MeshBasicMaterial({
      color: 0x24bfff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  beamCore.visible = false;
  beamGlow.visible = false;

  gun.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.renderOrder = 10;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      material.depthTest = false;
      material.depthWrite = false;
    }
  });
  gun.add(beamCore, beamGlow);
  camera.add(gun);

  effects.set(gun, {
    recoil: 0,
    muzzleLife: 0,
    beamLife: 0,
    beamCore,
    beamGlow,
    muzzleFlash,
    muzzleLight,
  });

  return gun;
}

export function fireRailgun(
  gun: THREE.Group,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.Vector3,
): void {
  const state = effects.get(gun);
  if (!state) return;

  camera.updateWorldMatrix(true, false);
  gun.updateWorldMatrix(true, false);
  const origin = gun.localToWorld(new THREE.Vector3(0, 0.025, -0.91));
  const direction = target.clone().sub(origin);
  const distance = direction.length();
  if (distance === 0) return;
  direction.normalize();

  const midpoint = origin.clone().addScaledVector(direction, distance / 2);
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );

  for (const beam of [state.beamCore, state.beamGlow]) {
    beam.position.copy(midpoint);
    beam.quaternion.copy(rotation);
    beam.scale.y = distance;
    beam.visible = true;
  }

  if (!scene.children.includes(state.beamCore)) scene.add(state.beamCore);
  if (!scene.children.includes(state.beamGlow)) scene.add(state.beamGlow);

  state.recoil = 1;
  state.muzzleLife = 0.09;
  state.beamLife = 0.22;
  state.muzzleFlash.visible = true;
  state.muzzleLight.intensity = 5;
}

export function updateRailgun(gun: THREE.Group, delta: number): void {
  const state = effects.get(gun);
  if (!state) return;

  state.recoil = Math.max(0, state.recoil - delta * 8);
  gun.position.z = -0.65 + state.recoil * 0.08;

  state.muzzleLife = Math.max(0, state.muzzleLife - delta);
  state.muzzleFlash.visible = state.muzzleLife > 0;
  const muzzleMaterial = state.muzzleFlash.material;
  if (muzzleMaterial instanceof THREE.MeshBasicMaterial) {
    muzzleMaterial.opacity = state.muzzleLife / 0.09;
  }
  state.muzzleLight.intensity = (state.muzzleLife / 0.09) * 5;

  state.beamLife = Math.max(0, state.beamLife - delta);
  state.beamCore.visible = state.beamLife > 0;
  state.beamGlow.visible = state.beamLife > 0;
  const glowMaterial = state.beamGlow.material;
  if (glowMaterial instanceof THREE.MeshBasicMaterial) {
    glowMaterial.opacity = (state.beamLife / 0.22) * 0.4;
  }
}
