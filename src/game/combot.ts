import * as THREE from "three";
import type { Enemy, GameState, GameUI, GameWorld } from "./types";
import { updateHud } from "./hud";
import { PALETTE } from "./palette";

// Создаёт невидимый луч для поиска объекта под прицелом.
const raycaster = new THREE.Raycaster();
// Ограничивает максимальную дальность выстрела.
raycaster.far = 25;

/**
 * Создаёт короткий визуальный эффект попадания в стену или врага.
 * @param world Игровой мир, в котором отображается эффект.
 * @param point Мировая точка попадания луча.
 */
function spawnHitEffect(world: GameWorld, point: THREE.Vector3): void {
  // Создаём эффект вспышки на месте попадания.
  const effect = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({
      color: PALETTE.ui.accent,
      transparent: true,
      opacity: 0.95,
    }),
  );

  effect.position.copy(point);
  world.scene.add(effect);

  setTimeout(() => {
    world.scene.remove(effect);
    effect.geometry.dispose();
    effect.material.dispose();
  }, 80);
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
  const hit = raycaster.intersectObjects(targets, false)[0];

  if (!hit) return;

  // Вспышка на месте попадания.
  spawnHitEffect(world, hit.point);

  // Пытаемся получить данные врага с попавшего под луч объекта.
  const enemy = hit?.object.userData["enemy"] as Enemy | undefined;

  // Если луч не попал во врага, заканчиваем обработку.
  if (!enemy) return;

  // Эффект при попадании по врагу.
  const enemyMaterial = enemy.mesh.material as THREE.MeshStandardMaterial;
  const originalColor = enemyMaterial.color.clone();

  enemyMaterial.emissive = new THREE.Color(PALETTE.ui.accent);
  enemyMaterial.color = new THREE.Color(PALETTE.ui.accent);

  setTimeout(() => {
    enemyMaterial.emissive = new THREE.Color(PALETTE.enemy.glow);
    enemyMaterial.color.copy(originalColor);
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
