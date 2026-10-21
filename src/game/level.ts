import * as THREE from "three";
import { cellToWorld, MAP, MAP_HEIGHT, MAP_WIDTH, PLATFORMS } from "./map";
import { PALETTE } from "./palette";
import type { Enemy, GameState } from "./types";

export function createGameState(): GameState {
  return {
    walls: [],
    enemies: [],
    pickups: [],
    playerHealth: 100,
    ammo: 20,
    gameStarted: false,
    gameEnded: false,
    yaw: 0,
    pitch: 0,
    keysDown: new Set<string>(),
    exitPosition: new THREE.Vector2(),
    verticalVelocity: 0,
    horizontalVelocity: new THREE.Vector2(),
  };
}

// Проходим по карте и создаёт соответствующие объекты.
export function buildLevel(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  state: GameState,
): void {
  for (const platform of PLATFORMS) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(platform.width, platform.depth), // Создаёт геометрию пола размером с карту.
      new THREE.MeshStandardMaterial({
        color: PALETTE.world.floor,
        roughness: 0.9, // Делаем поверхность матовой.
      }), // Создаёт матовый серый материал пола.
    );

    // Поворачиваем плоскость из вертикального положения в горизонтальное.
    floor.rotation.x = -Math.PI / 2;
    // Размещаем плоскость на высоте поверхности платформы.
    floor.position.set(platform.x, platform.y, platform.z);
    // Добавляем пол в сцену.
    scene.add(floor);
  }

  for (let row = 0; row < MAP.length; row++) {
    for (let column = 0; column < MAP[row].length; column++) {
      const cell = MAP[row][column];
      const position = cellToWorld(column, row);

      if (cell === "#") {
        addWall(scene, state, position);
      } else if (cell === "E") {
        addEnemy(scene, state, position);
      } else if (cell === "A") {
        addAmmoPickup(scene, state, position);
      } else if (cell === "X") {
        addExit(scene, state, position);
      } else if (cell === "P") {
        camera.position.set(position.x, 1.3, position.z);
      }
    }
  }
}

function addWall(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
): void {
  // Создаём общий материал для стен.
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.world.wall, // Задаём серо-фиолетовый цвет.
    roughness: 0.9, // Делает поверхность почти матовой.
  });

  // Объединяем геометрию стены и её материал в один объект.
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 3, 1), // Создаёт куб шириной 1, высотой 3 и глубиной 1.
    wallMaterial, // Использует общий материал стен.
  );

  // Ставим центр трёхметровой стены на высоту 1.5.
  wall.position.set(position.x, 1.5, position.z);
  // Добавляем стену в сцену.
  scene.add(wall);
  // Сохраняем стену в массив для дальнейшей проверки попаданий.
  state.walls.push(wall);
}

// Создаёт простого врага в клетке карты.
function addEnemy(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
): void {
  // Создаём визуальное тело врага.
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 1.25, 0.65), // Используем прямоугольный параллелепипед как временную модель врага.
    new THREE.MeshStandardMaterial({
      // Создаём материал врага.
      color: PALETTE.enemy.body, // Задаём красный цвет тела.
      emissive: PALETTE.enemy.glow, // Добавляем слабое красное свечение.
    }),
  );

  // Ставим центр модели на половине её высоты.
  mesh.position.set(position.x, 0.625, position.z);

  // Создаём игровые характеристики врага.
  const enemy: Enemy = {
    mesh, // Сохраняем его визуальный меш.
    health: 2, // Задаём два попадания до уничтожения.
    attackCooldown: 0, // Позволяем врагу атаковать сразу, когда он доберётся до игрока.
  };

  // Связываем меш с игровыми данными, чтобы найти их после попадания луча.
  mesh.userData["enemy"] = enemy;
  // Добавляем врага в сцену.
  scene.add(mesh);
  // Добавляем врага в список активных врагов.
  state.enemies.push(enemy);
}

// Создаёт коробку с патронами.
function addAmmoPickup(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
): void {
  // Создаёт меш предмета.
  const pickup = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35), // Использует маленький куб.
    new THREE.MeshStandardMaterial({
      color: PALETTE.ammo.body,
      emissive: PALETTE.ammo.glow,
    }), // Красит куб в светящийся зелёный цвет.
  );

  // Размещает предмет немного над полом.
  pickup.position.set(position.x, 0.6, position.z);
  // Добавляет его в сцену.
  scene.add(pickup);
  // Сохраняет его для проверки сбора.
  state.pickups.push(pickup);
}
// Создаём видимую фиолетовую дверь.
function addExit(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
) {
  // Создаём меш двери.
  const exit = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.4, 0.2), // Задаёт ширину, высоту и толщину двери.
    new THREE.MeshStandardMaterial({
      color: PALETTE.exit.body,
      emissive: PALETTE.exit.glow,
    }), // Делает дверь фиолетовой и слегка светящейся.
  );

  // Ставим дверь так, чтобы низ находился у пола.
  exit.position.set(position.x, 1.2, position.z);
  // Сохраняем его координаты для проверки победы.
  state.exitPosition.set(position.x, position.z);
  // Добавляем дверь в сцену.
  scene.add(exit);
}
