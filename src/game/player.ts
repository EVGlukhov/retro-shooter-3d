import { getCellAt, getPlatformHeightAt } from "./map";
import * as THREE from "three";
import type { GameState } from "./types";

// Задаём радиус игрока для проверки столкновения со стенами.
const PLAYER_RADIUS = 0.2; // Увеличение значения отодвинет игрока от стен.

// Задаём высоту камеры игрока, когда он стоит на полу.
const GROUND_Y = 1.3; // Это значение совпадает с высотой старта игрока в уровне.

// Задаём начальную скорость прыжка вверх.
const JUMP_SPEED = 7; // Увеличение значения сделает прыжок выше.

// Задаём силу гравитации, которая тянет игрока вниз.
const GRAVITY = 20; // Увеличение значения ускорит падение.

// Задаём обычную скорость движения по земле.
const MAX_GROUND_SPEED = 4; // Это также желаемая скорость набора в выбранном направлении в воздухе.

// Задаём силу управления направлением в воздухе.
const AIR_ACCELERATION = 8; // Увеличение значения позволит быстрее набирать скорость при стрейфе.

// Задаём силу замедления игрока на земле без нажатых клавиш движения.
const GROUND_FRICTION = 10; // Увеличение значения быстрее остановит игрока.

// Завершаем игру, если игрок упал ниже этой высоты.
const FALL_DEATH_Y = -12;
const FALL_DROP_TO_DIE = 2;

const jumpSound = new Audio("/sounds/jump.mp3");
jumpSound.volume = 0.5;

type PlayerActions = {
  onFell: () => void;
};

/**
 * Проверяет, может ли игрок занять указанную позицию без попадания в стену.
 * @param x Координата X проверяемой позиции.
 * @param z Координата Z проверяемой позиции.
 * @returns true, если позиция свободна, иначе false.
 */
function canStandAt(x: number, z: number): boolean {
  // Создаём список смещений углов вокруг центра игрока.
  const corners: [number, number][] = [
    [-PLAYER_RADIUS, -PLAYER_RADIUS], // Левый ближний угол условной рамки игрока.
    [-PLAYER_RADIUS, PLAYER_RADIUS], // Левый дальний угол.
    [PLAYER_RADIUS, -PLAYER_RADIUS], // Правый ближний угол.
    [PLAYER_RADIUS, PLAYER_RADIUS], // Правый дальний угол.
  ];

  // Проверяем каждый угол.
  return corners.every(([offsetX, offsetZ]) => {
    // Получаем клетку карты под текущим углом.
    const cell = getCellAt(x + offsetX, z + offsetZ);
    // Запрещаем позицию, если угол попал в стену.
    return cell !== "#";
  });
}

/**
 * Обновляет состояние игрока за один кадр: движение, прыжок, гравитацию и смерть при падении.
 * @param camera Камера игрока, которая хранит его мировую позицию.
 * @param state Текущее состояние игры.
 * @param delta Время с предыдущего кадра.
 * @param actions Колбэки для событий падения.
 */
export function updatePlayer(
  camera: THREE.PerspectiveCamera,
  state: GameState,
  delta: number,
  actions: PlayerActions,
): void {
  // Не перемещаем игрока во время меню или после завершения.
  if (!state.gameStarted || state.gameEnded) return;

  const userData = camera.userData as { fallStartY?: number };

  // Проверяем, стоял ли игрок на платформе в начале кадра.
  const wasOnPlatformBeforeMove =
    getPlatformHeightAt(camera.position.x, camera.position.z) !== undefined;

  // Ищем пол под текущей позицией игрока.
  const platformHeight = getPlatformHeightAt(
    camera.position.x,
    camera.position.z,
  );
  // Вычисляем высоту камеры стоящего игрока.
  const groundCameraY =
    platformHeight === undefined ? undefined : platformHeight + GROUND_Y;

  // Считаем игрока стоящим, если под ним есть платформа и он падает на неё.
  let onGround =
    groundCameraY !== undefined &&
    camera.position.y <= groundCameraY &&
    state.verticalVelocity <= 0;

  // Если игрок приземлился, ставим его точно на платформу.
  if (onGround && groundCameraY !== undefined) {
    camera.position.y = groundCameraY;
    state.verticalVelocity = 0;

    // Начинаем прыжок, если пробел удерживается.
    if (state.keysDown.has("Space")) {
      state.verticalVelocity = JUMP_SPEED;
      onGround = false;

      jumpSound.currentTime = 0;
      jumpSound.play().catch(() => {});
    }
  }

  // Рассчитываем направление вперёд с учётом поворота.
  const forward = new THREE.Vector2(-Math.sin(state.yaw), -Math.cos(state.yaw));
  // Рассчитываем направление вправо.
  const right = new THREE.Vector2(Math.cos(state.yaw), -Math.sin(state.yaw));

  // Создаём пустой вектор желаемого движения от клавиш.
  const wishDirection = new THREE.Vector2();

  // Добавляем движение вперёд при зажатой W.
  if (state.keysDown.has("KeyE")) wishDirection.add(forward);
  // Добавляем движение назад при зажатой S.
  if (state.keysDown.has("KeyD")) wishDirection.sub(forward);
  // Добавляем движение вправо при зажатой D.
  if (state.keysDown.has("KeyF")) wishDirection.add(right);
  // Добавляем движение влево при зажатой A.
  if (state.keysDown.has("KeyS")) wishDirection.sub(right);

  // Рассчитываем скорость, если нажата хотя бы одна клавиша движения.
  if (wishDirection.lengthSq() > 0) {
    wishDirection.normalize(); // Нормализуем направление, чтобы диагональ не давала бесплатное ускорение.

    // Применяем обычное движение, когда игрок стоит на земле.
    if (onGround) {
      // Устанавливаем скорость в направлении нажатых клавиш.
      state.horizontalVelocity
        .copy(wishDirection)
        .multiplyScalar(MAX_GROUND_SPEED);
    } else {
      // Измеряем текущую скорость в желаемом направлении.
      const currentSpeedInWishDirection =
        state.horizontalVelocity.dot(wishDirection);
      // Вычисляем, сколько скорости ещё можно добавить в этом направлении.
      const speedToAdd = MAX_GROUND_SPEED - currentSpeedInWishDirection;

      // Добавляем ускорение, только если игрок ещё не достиг желаемой скорости по этому направлению.
      if (speedToAdd > 0) {
        // Ограничиваем ускорение временем кадра и оставшейся скоростью.
        const acceleration = Math.min(AIR_ACCELERATION * delta, speedToAdd);
        // Добавляем ускорение, сохраняя уже набранную скорость.
        state.horizontalVelocity.addScaledVector(wishDirection, acceleration);
      }
    }
  } else if (onGround) {
    // Замедляем игрока только на земле и только без клавиш движения.
    const speed = state.horizontalVelocity.length();
    // Вычисляем потерю скорости за этот кадр.
    const drop = speed * GROUND_FRICTION * delta;
    // Не позволяем скорости стать отрицательной.
    const newSpeed = Math.max(0, speed - drop);

    // Проверяем, есть ли скорость, которую нужно уменьшить.
    if (speed > 0) {
      // Снижаем скорость, сохраняя направление движения.
      state.horizontalVelocity.multiplyScalar(newSpeed / speed);
    }
  }

  // Рассчитываем перемещение по мировой оси X за кадр.
  const moveX = state.horizontalVelocity.x * delta;
  // Рассчитываем перемещение по мировой оси Z за кадр.
  const moveZ = state.horizontalVelocity.y * delta;
  // Вычисляем желаемую позицию по оси X.
  const nextX = camera.position.x + moveX;
  // Вычисляем желаемую позицию по оси Z.
  const nextZ = camera.position.z + moveZ;

  // Проверяем, свободен ли путь по оси X.
  if (canStandAt(nextX, camera.position.z)) {
    // Применяем движение по X, если там нет стены.
    camera.position.x = nextX;
  } else {
    // Убираем скорость в заблокированном направлении X.
    state.horizontalVelocity.x = 0;
  }

  // Проверяем, свободен ли путь по оси Z.
  if (canStandAt(camera.position.x, nextZ)) {
    // Применяем движение по Z, если там нет стены.
    camera.position.z = nextZ;
  } else {
    // Убираем скорость в заблокированном направлении Z.
    state.horizontalVelocity.y = 0;
  }

  // Применяем гравитацию каждый кадр.
  state.verticalVelocity -= GRAVITY * delta;
  // Перемещаем игрока вверх или вниз.
  camera.position.y += state.verticalVelocity * delta;

  // Проверяем, есть ли платформа под игроком после перемещения.
  const landingHeight = getPlatformHeightAt(
    camera.position.x,
    camera.position.z,
  );

  // Если игрок только что ушёл с платформы — начинаем отслеживать падение.
  if (wasOnPlatformBeforeMove && landingHeight === undefined) {
    if (userData.fallStartY === undefined) {
      userData.fallStartY = camera.position.y;
    }
  } else if (landingHeight !== undefined) {
    // Если снова на платформе — сбрасываем отслеживание.
    userData.fallStartY = undefined;
  }

  if (userData.fallStartY !== undefined) {
    const fallDepth = camera.position.y - userData.fallStartY;

    // Здесь убиваем только после реального падения.
    if (fallDepth < -FALL_DROP_TO_DIE || camera.position.y < FALL_DEATH_Y) {
      actions.onFell();
      return;
    }
  }

  // Если платформа есть, "схлопываем" игрока обратно на неё.
  // Этот блок запускается только если под игроком реально есть платформа.
  if (landingHeight !== undefined && state.verticalVelocity <= 0) {
    // Вычисляем высоту камеры над площадкой.
    const landingCameraY = landingHeight + GROUND_Y;
    // Проверяем, достиг ли игрок уровня площадки.
    if (camera.position.y <= landingCameraY) {
      // Устанавливаем игрока на поверхность платформы.
      camera.position.y = landingCameraY;
      // Останавливаем падение.
      state.verticalVelocity = 0;
      userData.fallStartY = undefined;
    }
  }

  // Если платформы под игроком нет, значит он падает в яму/пропасть.
  // И только когда он упал слишком низко — умирает.
  if (camera.position.y < FALL_DEATH_Y) {
    // Просим основной модуль завершить игру поражением.
    actions.onFell();
    // Прекращаем обновление игрока в этом кадре.
    return;
  }
}
