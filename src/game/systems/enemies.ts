import * as THREE from "three";
import type { EnemyProjectile, GameState } from "../state/types";
import { getCellAt, getPlatformHeightAt } from "../world/map";

const ENEMY_JUMP_SPEED = 5;
const ENEMY_GRAVITY = 20;
const ENEMY_RADIUS = 0.3;
const ENEMY_SHOOT_RANGE = 16;
const ENEMY_PROJECTILE_SPEED = 9;
const ENEMY_PROJECTILE_DAMAGE = 10;
const PLAYER_HIT_RADIUS = 0.35;
const PROJECTILE_RADIUS = 0.09;
const PROJECTILE_STEP = 0.1;

const projectileGeometry = new THREE.SphereGeometry(PROJECTILE_RADIUS, 8, 8);
const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff452e });

function hasLineOfSight(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): boolean {
  const distance = Math.hypot(toX - fromX, toZ - fromZ);
  const samples = Math.ceil(distance / PROJECTILE_STEP);

  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (getCellAt(fromX + (toX - fromX) * t, fromZ + (toZ - fromZ) * t) === "#") {
      return false;
    }
  }

  return true;
}

function removeProjectile(
  state: GameState,
  projectile: EnemyProjectile,
): void {
  const index = state.enemyProjectiles.indexOf(projectile);
  if (index === -1) return;

  projectile.mesh.parent?.remove(projectile.mesh);
  state.enemyProjectiles.splice(index, 1);
}

function spawnEnemyProjectile(
  state: GameState,
  enemy: GameState["enemies"][number],
  target: THREE.Vector3,
): void {
  const origin = enemy.mesh.position.clone();
  origin.y += 0.85;
  const direction = target.clone().sub(origin).normalize();
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  mesh.position.copy(origin);
  enemy.mesh.parent?.add(mesh);
  state.enemyProjectiles.push({
    mesh,
    direction,
    speed: ENEMY_PROJECTILE_SPEED,
    life: ENEMY_SHOOT_RANGE / ENEMY_PROJECTILE_SPEED,
  });
}

function updateEnemyProjectiles(
  camera: THREE.PerspectiveCamera,
  state: GameState,
  delta: number,
  actions: EnemyActions,
): boolean {
  for (const projectile of [...state.enemyProjectiles]) {
    const travelDistance = projectile.speed * delta;
    const steps = Math.max(1, Math.ceil(travelDistance / PROJECTILE_STEP));
    const step = travelDistance / steps;
    let hitWall = false;

    for (let i = 0; i < steps; i++) {
      projectile.mesh.position.addScaledVector(projectile.direction, step);

      if (
        getCellAt(projectile.mesh.position.x, projectile.mesh.position.z) ===
        "#"
      ) {
        hitWall = true;
        break;
      }

      if (
        projectile.mesh.position.distanceTo(camera.position) <=
        PLAYER_HIT_RADIUS
      ) {
        state.playerHealth = Math.max(
          0,
          state.playerHealth - ENEMY_PROJECTILE_DAMAGE,
        );
        actions.onPlayerDamaged();
        removeProjectile(state, projectile);

        if (state.playerHealth === 0) {
          actions.onPlayerDefeated();
          return true;
        }
        break;
      }
    }

    if (hitWall || !state.enemyProjectiles.includes(projectile)) {
      removeProjectile(state, projectile);
      continue;
    }

    projectile.life -= delta;
    if (projectile.life <= 0) removeProjectile(state, projectile);
  }

  return false;
}

function canEnemyStandAt(x: number, z: number): boolean {
  return (
    getCellAt(x - ENEMY_RADIUS, z - ENEMY_RADIUS) !== "#" &&
    getCellAt(x - ENEMY_RADIUS, z + ENEMY_RADIUS) !== "#" &&
    getCellAt(x + ENEMY_RADIUS, z - ENEMY_RADIUS) !== "#" &&
    getCellAt(x + ENEMY_RADIUS, z + ENEMY_RADIUS) !== "#"
  );
}

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
  if (
    state.gameStarted &&
    !state.gameEnded &&
    updateEnemyProjectiles(camera, state, delta, actions)
  ) {
    return;
  }

  // Нужно идти по копии массива, потому что некоторых врагов можно удалить.
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue; // Пропускаем мёртвых врагов.

    // Уменьшаем оставшееся время до следующей атаки.
    enemy.attackCooldown -= delta;
    enemy.shootCooldown -= delta;

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

    const groundY = platformHeight + 0.625;
    const isGrounded =
      enemy.mesh.position.y <= groundY && enemy.verticalVelocity <= 0;

    if (isGrounded) {
      enemy.mesh.position.y = groundY;
      enemy.verticalVelocity = 0;
      enemy.jumpCooldown -= delta;
    } else {
      enemy.verticalVelocity -= ENEMY_GRAVITY * delta;
      enemy.mesh.position.y += enemy.verticalVelocity * delta;

      if (enemy.mesh.position.y <= groundY) {
        enemy.mesh.position.y = groundY;
        enemy.verticalVelocity = 0;
      }
    }

    // Вычисляем разницу между игроком и врагом по X.
    const dx = camera.position.x - enemy.mesh.position.x;
    // Вычисляем разницу по Y
    const dy = camera.position.y - enemy.mesh.position.y;
    // Вычисляем разницу по Z.
    const dz = camera.position.z - enemy.mesh.position.z;
    // Вычисляем горизонтальное расстояние между ними.
    const distance = Math.hypot(dx, dy, dz);

    if (
      state.gameStarted &&
      !state.gameEnded &&
      distance > 1.2 &&
      distance <= ENEMY_SHOOT_RANGE &&
      enemy.shootCooldown <= 0 &&
      hasLineOfSight(
        enemy.mesh.position.x,
        enemy.mesh.position.z,
        camera.position.x,
        camera.position.z,
      )
    ) {
      spawnEnemyProjectile(state, enemy, camera.position);
      enemy.shootCooldown = 1.5 + Math.random();
    }

    // Если враг ещё не подошёл достаточно близко.
    if (distance > 1.2) {
      // Вычисляем шаг движения и не даёт врагу пройти сквозь игрока.
      const step = Math.min(1.2 * delta, distance - 1.1);
      const previousX = enemy.mesh.position.x;
      const previousZ = enemy.mesh.position.z;
      // Рассчитываем новую координату врага по X.
      const nextX = enemy.mesh.position.x + (dx / distance) * step;
      // Рассчитываем новую координату врага по Y.
      const nextY = enemy.mesh.position.y + (dy / distance) * step;
      // Рассчитываем новую координату врага по Z.
      const nextZ = enemy.mesh.position.z + (dz / distance) * step;

      // На земле выравниваем врага по платформе; прыжок сохраняет высоту.
      const nextPlatformHeight = getPlatformHeightAt(nextX, nextZ);
      if (isGrounded && nextPlatformHeight !== undefined) {
        enemy.mesh.position.y = nextPlatformHeight + 0.625;
      } else if (nextPlatformHeight === undefined) {
        enemy.mesh.position.y = nextY;
      }

      // Проверяет, не попадёт ли враг в стену при движении по X.
      if (canEnemyStandAt(nextX, enemy.mesh.position.z)) {
        // Перемещает врага по X, если путь свободен.
        enemy.mesh.position.x = nextX;
      }
      // Проверяет, не попадёт ли враг в стену при движении по Z.
      if (canEnemyStandAt(enemy.mesh.position.x, nextZ)) {
        // Перемещает врага по Z, если путь свободен.
        enemy.mesh.position.z = nextZ;
      }

      const movedDistance = Math.hypot(
        enemy.mesh.position.x - previousX,
        enemy.mesh.position.z - previousZ,
      );
      if (isGrounded && movedDistance > 1e-4 && enemy.jumpCooldown <= 0) {
        enemy.verticalVelocity = ENEMY_JUMP_SPEED;
        enemy.jumpCooldown = 2.5 + Math.random() * 2;
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
      if (canEnemyStandAt(pushedX, enemy.mesh.position.z)) {
        enemy.mesh.position.x = pushedX;
      }

      // Не двигаем врага сквозь стену по Z.
      if (canEnemyStandAt(enemy.mesh.position.x, pushedZ)) {
        enemy.mesh.position.z = pushedZ;
      }
    }

    // Поворачивает врага лицом к игроку.
    enemy.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
