import { PALETTE } from "./palette";
import type { FirePitRect, GameState } from "./types";
import * as THREE from "three";

/**
 * Создаёт список прямоугольных зон с лавой и огнём по исходной арене.
 * @returns Массив областей, где должна быть активирована огненная опасность.
 */
function buildFirePitsFromArena(): FirePitRect[] {
  return [
    { x: -8.2, z: 0, width: 5.4, depth: 5.6 },
    { x: -4.5, z: 0, width: 5.8, depth: 13.5 },
    { x: 4.5, z: 0, width: 5.8, depth: 13.5 },
    { x: 0, z: -4.5, width: 13.5, depth: 5.8 },
    { x: 0, z: 4.5, width: 13.5, depth: 5.8 },
    { x: 0, z: 0, width: 5.8, depth: 5.8 },
    { x: -7.7, z: 0, width: 4.8, depth: 4.8 },
    { x: -7.8, z: -7.0, width: 4.4, depth: 4.4 },
    { x: -7.8, z: 7.0, width: 4.4, depth: 4.4 },
    { x: 7.8, z: -7.0, width: 4.4, depth: 4.4 },
    { x: 7.8, z: 7.0, width: 4.4, depth: 4.4 },
  ];
}

export const FIRE_PITS = buildFirePitsFromArena();

const FLAME_COUNT_PER_LAVA_PIT = 8;
const SMOKE_COUNT_PER_LAVA_PIT = 3;

const fireTexture = new THREE.TextureLoader().load("/textures/fire.png");
fireTexture.colorSpace = THREE.SRGBColorSpace;
fireTexture.needsUpdate = true;

const smokeTexture = new THREE.TextureLoader().load("/textures/smoke.png");
smokeTexture.colorSpace = THREE.SRGBColorSpace;
smokeTexture.needsUpdate = true;

const lavaTexture = new THREE.TextureLoader().load("/textures/lava.jpg");
lavaTexture.wrapS = THREE.RepeatWrapping;
lavaTexture.wrapT = THREE.RepeatWrapping;
lavaTexture.repeat.set(2, 2);

/**
 * Добавляет отдельную лавандую яму с лавовой плитой, огнём и дымом.
 * @param scene Сцена, в которую добавляется эффект.
 * @param state Текущее состояние игры.
 * @param position Центр лавовой ямы в мировых координатах.
 * @param width Ширина лавовой зоны.
 * @param depth Глубина лавовой зоны.
 */
export function addLavaPit(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
  width: number = 1,
  depth: number = 1,
): void {
  const lava = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      map: lavaTexture,
      color: PALETTE.fire.ember,
      emissive: PALETTE.fire.ember,
      emissiveIntensity: 0,
      roughness: 0.45,
      metalness: 0.15,
    }),
  );

  lava.rotation.x = -Math.PI / 2;
  lava.position.set(position.x, 0.04, position.z);
  scene.add(lava);

  const fireGroup = new THREE.Group();

  for (let i = 0; i < FLAME_COUNT_PER_LAVA_PIT; i++) {
    const fire = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fireTexture,
        color: i % 2 === 0 ? PALETTE.fire.orange : PALETTE.fire.ember,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    fire.position.set(
      position.x + (Math.random() - 0.5) * 0.7,
      0.18 + Math.random() * 0.4,
      position.z + (Math.random() - 0.5) * 0.7,
    );

    const scale = 0.4 + Math.random() * 0.4;
    fire.scale.set(scale, scale * 1.8, 1);
    fire.userData = {
      kind: "fire",
      phase: Math.random() * Math.PI * 2,
      baseScale: scale,
    };

    fireGroup.add(fire);
  }

  for (let i = 0; i < SMOKE_COUNT_PER_LAVA_PIT; i++) {
    const smoke = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTexture,
        color: PALETTE.fire.dark,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );

    smoke.position.set(
      position.x + (Math.random() - 0.5) * 0.6,
      0.8 + Math.random() * 0.4,
      position.z + (Math.random() - 0.5) * 0.6,
    );

    smoke.scale.set(0.5 + Math.random() * 0.4, 0.7 + Math.random() * 0.4, 1);
    smoke.userData = { kind: "smoke" };
    fireGroup.add(smoke);
  }

  scene.add(fireGroup);
  state.firePits.push(fireGroup);
}

/**
 * Анимирует огонь, дым и свечение в лавовых ямах.
 * @param state Текущее состояние игры.
 * @param time Текущее время в миллисекундах для анимации.
 */
export function updateFirePits(state: GameState, time: number): void {
  for (const fireGroup of state.firePits) {
    fireGroup.children.forEach((child: THREE.Object3D, index: number) => {
      if (!(child instanceof THREE.Sprite)) return;

      const kind = child.userData.kind as string | undefined;

      if (kind === "smoke") {
        child.material.opacity = 0.04 + Math.sin(time * 0.01 + index) * 0.015;
        child.position.y += Math.sin(time * 0.015 + index) * 0.00025;
        child.position.x += Math.sin(time * 0.01 + index) * 0.0007;
        child.scale.setScalar(1.0 + Math.sin(time * 0.02 + index) * 0.06);
        return;
      }

      const phase = (child.userData.phase as number) ?? 0;
      const motion = Math.sin(time * 0.012 + phase) * 0.05;
      const flicker = 0.26 + Math.sin(time * 0.02 + index + phase) * 0.08;

      child.material.opacity = flicker + motion + 0.06;
      const baseScale = (child.userData.baseScale as number) ?? 1;
      const scale =
        baseScale * (1 + Math.sin(time * 0.015 + index + phase) * 0.1);

      child.scale.set(scale, scale * 1.9, 1);
    });
  }
}
