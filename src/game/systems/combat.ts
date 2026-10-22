import * as THREE from "three";
import type {
  Enemy,
  GameState,
  GameUI,
  GameWorld,
  HitEffect,
} from "../state/types";
import { updateHud } from "../ui/hud";
import { PALETTE } from "../config/palette";
import { fireRailgun } from "../world/railgun";

// Создаёт невидимый луч для поиска объекта под прицелом.
const raycaster = new THREE.Raycaster();
// Ограничивает максимальную дальность выстрела.
raycaster.far = 25;

const hitEffects: HitEffect[] = [];

function getHitEffect(): HitEffect {
  let effect = hitEffects.find((item) => !item.active);

  if (!effect) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({
        color: PALETTE.ui.accent,
        transparent: true,
        opacity: 0.95,
      }),
    );

    effect = { mesh, life: 0, active: false };
    hitEffects.push(effect);
  }

  return effect;
}

/**
 * Создаёт короткий визуальный эффект попадания в стену или врага.
 * @param world Игровой мир, в котором отображается эффект.
 * @param point Мировая точка попадания луча.
 */
function spawnHitEffect(world: GameWorld, point: THREE.Vector3): void {
  // Создаём эффект вспышки на месте попадания.
  const effect = getHitEffect();

  effect.mesh.position.copy(point);
  effect.mesh.visible = true;
  effect.life = 0.08;
  effect.active = true;

  if (!world.scene.children.includes(effect.mesh)) {
    world.scene.add(effect.mesh);
  }
}

export function updateHitEffects(delta: number): void {
  for (const effect of hitEffects) {
    if (!effect.active) continue;

    effect.life -= delta;
    if (effect.life <= 0) {
      effect.active = false;
      effect.mesh.visible = false;
      continue;
    }

    const material = effect.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, effect.life / 0.08);
  }
}

/**
 * Обрабатывает один выстрел игрока, проверяет попадание и уменьшает здоровье врага.
 * @param world Игровой мир, в котором происходит выстрел.
 * @param state Текущее состояние игры.
 * @param ui Элементы интерфейса пользователя.
 */
export function shoot(world: GameWorld, state: GameState, ui: GameUI): void {
  // Не стреляем, если игра не идёт.
  if (!state.gameStarted || state.gameEnded) return;

  // Проверяем наличие патронов.
  if (state.ammo <= 0) {
    // Показываем подсказку при пустом магазине.
    ui.objective.textContent = "Out of ammo - find the green pickup";
    // Завершаем выстрел без дальнейших действий.
    return;
  }

  // Тратим один патрон.
  state.ammo -= 1;
  // Обновляем отображение количества патронов.
  updateHud(state, ui);

  // Направляет луч из центра камеры — туда, где расположен прицел.
  raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);

  // Создаём список объектов, которые могут остановить луч.
  const targets: THREE.Object3D[] = [
    ...state.walls, // Добавляем все стены: они блокируют выстрелы сквозь себя.
    ...state.enemies.map((enemy) => enemy.mesh), // Добавляем меши врагов как возможные цели.
  ];

  // Находим ближайшее пересечение луча с целью.
  const hit = raycaster.intersectObjects(targets, true)[0];

  const aimPoint =
    hit?.point ??
    world.camera
      .getWorldDirection(new THREE.Vector3())
      .multiplyScalar(raycaster.far)
      .add(world.camera.position);
  fireRailgun(world.railgun, world.scene, world.camera, aimPoint);

  if (!hit) return;

  // Вспышка на месте попадания.
  spawnHitEffect(world, hit.point);

  // Начинаем поиск с меша, в который попал луч.
  let hitObject: THREE.Object3D | null = hit.object;
  // Создаём переменную для найденного врага.
  let enemy: Enemy | undefined;

  // Ищем данные врага в объекте и его родителях.
  while (hitObject && !enemy) {
    // Проверяем текущий объект на данные врага.
    enemy = hitObject.userData["enemy"] as Enemy | undefined;
    // Переходим к родительскому объекту.
    hitObject = hitObject.parent;
  }

  // Заканчиваем обработку, если луч попал не во врага.
  if (!enemy) return;

  // Создаём список исходных цветов материалов.
  const flashedMaterials: {
    material: THREE.MeshStandardMaterial;
    color: THREE.Color;
    emissive: THREE.Color;
  }[] = [];

  // Проходим по всем объектам модели врага.
  enemy.mesh.traverse((object) => {
    // Пропускаем объекты, которые не являются мешами.
    if (!(object instanceof THREE.Mesh)) return;
    // Получаем материалы текущего меша.
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    // Перебираем материалы меша.
    for (const material of materials) {
      // Пропускаем материалы другого типа.
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      // Сохраняем исходные цвета материала.
      flashedMaterials.push({
        material,
        color: material.color.clone(),
        emissive: material.emissive.clone(),
      });
      // Подсвечиваем материал цветом попадания.
      material.color.set(PALETTE.ui.accent);
      // Подсвечиваем свечение материала.
      material.emissive.set(PALETTE.ui.accent);
    }
  });
  // Запускаем восстановление цветов после вспышки.
  setTimeout(() => {
    // Перебираем подсвеченные материалы.
    for (const entry of flashedMaterials) {
      entry.material.color.copy(entry.color); // Восстанавливаем исходный цвет материала.
      entry.material.emissive.copy(entry.emissive); // Восстанавливаем исходное свечение материала.
    }
  }, 90);

  // Снимаем врагу одно очко здоровья.
  enemy.health -= 1;

  // Проверяем, уничтожен ли враг.
  if (enemy.health <= 0) {
    // Убираем меш врага из сцены.
    world.scene.remove(enemy.mesh);
    // Удаляем врага из списка активных.
    state.enemies.splice(state.enemies.indexOf(enemy), 1);
    // Обновляем цель и число оставшихся врагов.
    updateHud(state, ui);
  }
}
