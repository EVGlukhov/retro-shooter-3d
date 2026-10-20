import { getCellAt } from "./map";
import * as THREE from "three";
import type { GameState } from "./types";

const PLAYER_SPEED = 4;
// Приблизительный радиус игрока для столкновений.
const PLAYER_RADIUS = 0.2;

// Проверяем, может ли игрок занять позицию.
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

// Обновляем позицию игрока за один кадр.
export function updatePlayer(
  camera: THREE.PerspectiveCamera,
  state: GameState,
  delta: number,
): void {
  // Не перемещаем игрока во время меню или после завершения.
  if (!state.gameStarted || state.gameEnded) return;

  // Рассчитываем направление вперёд с учётом поворота.
  const forward = new THREE.Vector3(
    -Math.sin(state.yaw),
    0,
    -Math.cos(state.yaw),
  );
  // Рассчитываем направление вправо.
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  // Создаём пустой вектор движения на этот кадр.
  const movement = new THREE.Vector3();

  // Добавляем движение вперёд при зажатой W.
  if (state.keysDown.has("KeyE")) movement.add(forward);
  // Добавляем движение назад при зажатой S.
  if (state.keysDown.has("KeyD")) movement.sub(forward);
  // Добавляем движение вправо при зажатой D.
  if (state.keysDown.has("KeyF")) movement.add(right);
  // Добавляем движение влево при зажатой A.
  if (state.keysDown.has("KeyS")) movement.sub(right);

  // Выходим, если игрок не нажал клавиши движения.
  if (movement.lengthSq() === 0) return;

  // Нормализуем диагональ и учитывает время кадра.
  movement.normalize().multiplyScalar(PLAYER_SPEED * delta);
  // Вычисляем желаемую позицию по оси X.
  const nextX = camera.position.x + movement.x;
  // Вычисляем желаемую позицию по оси Z.
  const nextZ = camera.position.z + movement.z;

  // Отдельно проверяем перемещение по X.
  if (canStandAt(nextX, camera.position.z)) {
    // Применяем движение по X, если там нет стены.
    camera.position.x = nextX;
  }

  // Отдельно проверяем перемещение по Z с учётом уже обновлённого X.
  if (canStandAt(camera.position.x, nextZ)) {
    // Применяем движение по Z, если там нет стены.
    camera.position.z = nextZ;
  }
}
