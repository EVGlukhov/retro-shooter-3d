import type { GameState, GameWorld } from "../state/types";

type PickupActions = {
  onCollected: () => void;
};

/**
 * Обновляет предметы-подборки: вращение, проверку дистанции и сбор игроком.
 * @param world Игровой мир с камерой и сценой.
 * @param state Текущее состояние игры.
 * @param delta Время с предыдущего кадра в секундах.
 * @param actions Колбэк при подборе предмета.
 */
export function updatePickups(
  world: GameWorld,
  state: GameState,
  delta: number,
  actions: PickupActions,
): void {
  // Перебираем массив с конца, чтобы безопасно удалять предметы.
  for (let index = state.pickups.length - 1; index >= 0; index -= 1) {
    // Получаем текущий предмет.
    const pickup = state.pickups[index];
    // Медленно вращаем предмет вокруг вертикальной оси.
    pickup.rotation.y += delta * 1.5;

    // Вычисляем расстояние от предмета до игрока.
    const distance = pickup.position.distanceTo(world.camera.position);

    // Оставляем предмет на месте, если игрок ещё далеко.
    if (distance > 0.8) continue;

    // При подборе добавляем десять патронов.
    state.ammo += 10;
    // Удаляем визуальный предмет из сцены.
    world.scene.remove(pickup);
    // Удаляем предмет из списка активных.
    state.pickups.splice(index, 1);
    // Обновляем HUD с новым количеством патронов.
    actions.onCollected();
  }
}
