import * as THREE from "three";
import type { GameState } from "./types";
import { getCellAt } from "./map";
type EnemyActions = {
  onPlayerDamaged: () => void;
  onPlayerDefeated: () => void;
};

// Обновляем врагов каждый кадр.
export function updateEnemies(
  camera: THREE.PerspectiveCamera,
  state: GameState,
  delta: number,
  actions: EnemyActions,
): void {
  // Перебираем всех живых врагов.
  for (const enemy of state.enemies) {
    // Уменьшаем оставшееся время до следующей атаки.
    enemy.attackCooldown -= delta;

    // Вычисляем разницу между игроком и врагом по X.
    const dx = camera.position.x - enemy.mesh.position.x;
    // Вычисляем разницу по Z.
    const dz = camera.position.z - enemy.mesh.position.z;
    // Вычисляем горизонтальное расстояние между ними.
    const distance = Math.hypot(dx, dz);

    // Если враг ещё не подошёл достаточно близко.
    if (distance > 1.2) {
      // Вычисляем шаг движения и не даёт врагу пройти сквозь игрока.
      const step = Math.min(1.2 * delta, distance - 1.1);
      // Рассчитываем новую координату врага по X.
      const nextX = enemy.mesh.position.x + (dx / distance) * step;
      // Рассчитываем новую координату врага по Z.
      const nextZ = enemy.mesh.position.z + (dz / distance) * step;

      // Проверяет, не попадёт ли враг в стену при движении по X.
      if (getCellAt(nextX, enemy.mesh.position.z) !== "#") {
        // Перемещает врага по X, если путь свободен.
        enemy.mesh.position.x = nextX;
      }
      // Проверяет, не попадёт ли враг в стену при движении по Z.
      if (getCellAt(enemy.mesh.position.x, nextZ) !== "#") {
        // Перемещает врага по Z, если путь свободен.
        enemy.mesh.position.z = nextZ;
      }
    } else if (enemy.attackCooldown <= 0) {
      // Если враг рядом и готов атаковать.
      // Задаёт секунду до следующей атаки.
      enemy.attackCooldown = 1;
      // Снимает игроку 10 здоровья, но не опускает ниже нуля.
      state.playerHealth = Math.max(0, state.playerHealth - 10);
      // Обновляет здоровье на экране.
      actions.onPlayerDamaged();

      // Проверяет, умер ли игрок.
      if (state.playerHealth === 0) {
        // Завершает игру поражением.
        actions.onPlayerDefeated();
        // Не продолжает обработку других врагов после окончания.
        return;
      }
    }

    // Поворачивает врага лицом к игроку.
    enemy.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
