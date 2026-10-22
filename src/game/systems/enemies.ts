import * as THREE from "three";
import type { GameState } from "../state/types";
import { getCellAt, getPlatformHeightAt } from "../world/map";

type EnemyActions = {
  onPlayerDamaged(): void;
  onPlayerDefeated(): void;
  onEnemyDied(): void;
};

/**
 * Обновляет поведение врагов каждый кадр: движение, атаки, падение и проверку смерти.
 * @param camera Камера игрока, от которой считается позиция цели.
 * @param state Текущее состояние игры.
 * @param delta Время с предыдущего кадра в секундах.
 * @param actions Колбэки для событий врагов.
 */
export function updateEnemies(
  camera: THREE.PerspectiveCamera,
  state: GameState,
  delta: number,
  actions: EnemyActions,
): void {
  // Нужно идти по копии массива, потому что некоторых врагов можно удалить.
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue; // Пропускаем мёртвых врагов.

    // Уменьшаем оставшееся время до следующей атаки.
    enemy.attackCooldown -= delta;

    const platformHeight = getPlatformHeightAt(
      enemy.mesh.position.x,
      enemy.mesh.position.z,
    );

    // Если платформы нет — враг падает.
    if (platformHeight === undefined) {
      // Увеличиваем вертикальную скорость врага из-за гравитации.
      enemy.verticalVelocity -= 9.81 * delta;
      // Перемещаем врага вниз.
      enemy.mesh.position.y += enemy.verticalVelocity * delta;

      if (enemy.mesh.position.y <= -5) {
        enemy.alive = false; // Враг мёртв, если упал слишком низко.

        enemy.mesh.parent?.remove(enemy.mesh); // Убираем меш врага из сцены.
        state.enemies = state.enemies.filter((e) => e !== enemy); // Убираем врага из массива.

        // Обновляем HUD после удаления врага
        actions.onEnemyDied();

        continue; // Переходим к следующему врагу.
      }

      continue; // Пропускаем остальную обработку, пока враг падает.
    }

    const groundY = platformHeight + 0.625; // Высота земли для врага (половина его высоты).
    // Если враг ниже земли, ставим его на землю и сбрасываем вертикальную скорость.
    if (enemy.mesh.position.y < groundY) {
      enemy.mesh.position.y = groundY;
      enemy.verticalVelocity = 0;
    }

    // Вычисляем разницу между игроком и врагом по X.
    const dx = camera.position.x - enemy.mesh.position.x;
    // Вычисляем разницу по Y
    const dy = camera.position.y - enemy.mesh.position.y;
    // Вычисляем разницу по Z.
    const dz = camera.position.z - enemy.mesh.position.z;
    // Вычисляем горизонтальное расстояние между ними.
    const distance = Math.hypot(dx, dy, dz);

    // Если враг ещё не подошёл достаточно близко.
    if (distance > 1.2) {
      // Вычисляем шаг движения и не даёт врагу пройти сквозь игрока.
      const step = Math.min(1.2 * delta, distance - 1.1);
      // Рассчитываем новую координату врага по X.
      const nextX = enemy.mesh.position.x + (dx / distance) * step;
      // Рассчитываем новую координату врага по Y.
      const nextY = enemy.mesh.position.y + (dy / distance) * step;
      // Рассчитываем новую координату врага по Z.
      const nextZ = enemy.mesh.position.z + (dz / distance) * step;

      // Если под новым местом есть платформа — выравниваем по ней.
      const nextPlatformHeight = getPlatformHeightAt(nextX, nextZ);
      if (nextPlatformHeight !== undefined) {
        enemy.mesh.position.y = nextPlatformHeight + 0.625;
      } else {
        enemy.mesh.position.y = nextY;
      }

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

    // Задаём минимальное расстояние между врагами.
    const minimumEnemySpacing = 1.2;

    // Раздвигаем врагов, если их модели пересекаются.
    for (const other of state.enemies) {
      // Пропускаем самого себя и погибших врагов.
      if (other === enemy || !other.alive) continue;

      // Вычисляем смещение до другого врага по горизонтали.
      let offsetX = enemy.mesh.position.x - other.mesh.position.x;
      let offsetZ = enemy.mesh.position.z - other.mesh.position.z;
      let spacing = Math.hypot(offsetX, offsetZ);

      // Разводим врагов в разные стороны, если они стоят в одной точке.
      if (spacing === 0) {
        const direction =
          state.enemies.indexOf(enemy) < state.enemies.indexOf(other) ? -1 : 1;
        offsetX = direction;
        offsetZ = 0;
        spacing = 1;
      }

      // Не меняем положение, если враги уже разнесены.
      if (spacing >= minimumEnemySpacing) continue;

      // Вычисляем, насколько нужно отодвинуть этого врага.
      const pushDistance = minimumEnemySpacing - spacing;
      const pushedX =
        enemy.mesh.position.x + (offsetX / spacing) * pushDistance;
      const pushedZ =
        enemy.mesh.position.z + (offsetZ / spacing) * pushDistance;

      // Не двигаем врага сквозь стену по X.
      if (getCellAt(pushedX, enemy.mesh.position.z) !== "#") {
        enemy.mesh.position.x = pushedX;
      }

      // Не двигаем врага сквозь стену по Z.
      if (getCellAt(enemy.mesh.position.x, pushedZ) !== "#") {
        enemy.mesh.position.z = pushedZ;
      }
    }

    // Поворачивает врага лицом к игроку.
    enemy.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
