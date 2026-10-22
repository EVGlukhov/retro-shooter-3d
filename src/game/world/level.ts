import * as THREE from "three";
import { cellToWorld, MAP, PLATFORMS } from "./map";
import { PALETTE } from "../config/palette";
import type { Enemy, GameState } from "../state/types";
import { addLavaPit } from "../systems/fire";

import { createTankModel, type TankVariant } from "./tankModels";

const assetBaseUrl = import.meta.env.BASE_URL;

const brickTextures = new THREE.TextureLoader().load(
  `${assetBaseUrl}textures/brick.png`,
);
brickTextures.wrapS = THREE.RepeatWrapping;
brickTextures.wrapT = THREE.RepeatWrapping;
brickTextures.repeat.set(3, 3);

const floorTextures = new THREE.TextureLoader().load(
  `${assetBaseUrl}textures/floor.jpg`,
);
floorTextures.wrapS = THREE.RepeatWrapping;
floorTextures.wrapT = THREE.RepeatWrapping;
floorTextures.repeat.set(50, 50);

/**
 * Строит уровень: стены, врагов, предметы, выход и лавовые зоны.
 * @param scene Сцена, в которую добавляются объекты уровня.
 * @param camera Камера игрока, которая получает стартовую позицию.
 * @param state Текущее состояние игры.
 */
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
        map: floorTextures,
        metalness: 0.05,
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
      } else if (cell === "L") {
        addLavaPit(scene, state, position, 1, 2);
      } else if (cell === "A") {
        addAmmoPickup(scene, state, position);
      } else if (cell === "X") {
        addExit(scene, state, position);
      } else if (cell === "P") {
        camera.position.set(position.x, 1.3, position.z);
        camera.rotation.y = Math.PI;
        state.yaw = Math.PI;
      }
    }
  }
}

/**
 * Добавляет стену в сцену и сохраняет её в игровом состоянии.
 * @param scene Сцена, куда добавляется стена.
 * @param state Текущее состояние игры.
 * @param position Позиция стены в мировом пространстве.
 */
function addWall(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
): void {
  // Создаём общий материал для стен.
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.world.wall, // Задаём серо-фиолетовый цвет.
    roughness: 0.9, // Делает поверхность почти матовой.
    map: brickTextures,
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

/**
 * Создаёт врага в указанной клетке карты.
 * @param scene Сцена, в которую добавляется враг.
 * @param state Текущее состояние игры.
 * @param position Позиция создания врага.
 */
function addEnemy(
  scene: THREE.Scene,
  state: GameState,
  position: THREE.Vector3,
): void {
  const variants: TankVariant[] = ["red", "blue", "default"]; // Создаём список доступных вариантов танка.
  const variant = variants[Math.floor(Math.random() * variants.length)]; // Случайно выбираем вариант танка.
  // Создаём корневую группу врага.
  const mesh = new THREE.Group();
  // Создаём временный куб на время загрузки модели.
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 1.25, 0.65), // Используем прямоугольный параллелепипед как временную модель врага.
    new THREE.MeshStandardMaterial({
      // Создаём материал врага.
      color: PALETTE.enemy.body, // Задаём красный цвет тела.
      emissive: PALETTE.enemy.glow, // Добавляем слабое красное свечение.
    }),
  );

  // Размещаем корень врага на высоте его центра.
  mesh.position.set(position.x, 0.625, position.z);
  // Добавляем временный куб в группу врага.
  mesh.add(placeholder);

  // Создаём игровые характеристики врага.
  const enemy: Enemy = {
    mesh, // Сохраняем его визуальный меш.
    health: 2, // Задаём два попадания до уничтожения.
    attackCooldown: 0, // Позволяем врагу атаковать сразу, когда он доберётся до игрока.
    shootCooldown: 1 + Math.random() * 2,
    jumpCooldown: 1 + Math.random() * 2,
    verticalVelocity: 0, // Изначально враг не двигается по вертикали.
    alive: true, // Враг жив при создании.
  };

  // Связываем меш с игровыми данными, чтобы найти их после попадания луча.
  mesh.userData["enemy"] = enemy;
  // Добавляем врага в сцену.
  scene.add(mesh);
  // Добавляем врага в список активных врагов.
  state.enemies.push(enemy);

  void createTankModel(variant)
    .then((model) => {
      // Пропускаем врага, если его уже удалили.
      if (!state.enemies.includes(enemy)) return;
      // Удаляем временный куб.
      mesh.remove(placeholder);
      // Добавляем модель танка в группу врага.
      mesh.add(model);
    })
    .catch((error: unknown) => {
      // Выводим сообщение об ошибке в консоль.
      console.error(`Не удалось загрузить вариант танка ${variant}.`, error);
    });
}

/**
 * Создаёт предмет с боеприпасами в клетке карты.
 * @param scene Сцена, в которую добавляется предмет.
 * @param state Текущее состояние игры.
 * @param position Позиция предмета.
 */
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
/**
 * Создаёт выход из уровня и сохраняет его координаты для проверки победы.
 * @param scene Сцена, в которую добавляется выход.
 * @param state Текущее состояние игры.
 * @param position Позиция выхода.
 */
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
