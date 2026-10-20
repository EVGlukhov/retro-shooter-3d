import { shoot } from "./combot";
import { updateEnemies } from "./enemies";
import { getGameUI, updateHud } from "./hud";
import { setupInput } from "./input";
import { buildLevel, createGameState } from "./level";
import { updatePickups } from "./pickups";
import { updatePlayer } from "./player";
import { createWorld } from "./world";

export function startGame(gameElement: HTMLElement): void {
  const ui = getGameUI();
  const world = createWorld(gameElement);
  const state = createGameState();

  buildLevel(world.scene, world.camera, state);
  updateHud(state, ui);

  function finishGame(won: boolean): void {
    // Не позволяем повторно завершить уже законченную игру.
    if (state.gameEnded) return;
    // Переводим игровой процесс в состояние завершения.
    state.gameEnded = true;
    // Останавливаем управление игроком.
    state.gameStarted = false;

    // Освобождаем указатель мыши.
    document.exitPointerLock();
    // Выбираем заголовок в зависимости от результата.
    ui.overlayTitle.textContent = won ? "You win!" : "Game over";
    // Показываем итоговое сообщение.
    ui.overlayText.textContent = won
      ? "You defeated the enemies and found the exit."
      : "Your health reached zero.";
    // Меняем текст кнопки на перезапуск.
    ui.startButton.textContent = "Play again";
    // Показываем экран завершения.
    ui.overlay.classList.remove("hidden");
  }

  setupInput(world, state, ui, {
    shoot: () => shoot(world, state, ui),
  });

  // Проверяет, добрался ли игрок до выхода после победы над врагами.
  function checkExit(): void {
    // Выход недоступен, пока игра не активна или враги живы.
    if (state.gameEnded || !state.gameStarted || state.enemies.length > 0)
      return;

    // Вычисляет расстояние до выхода в горизонтальной плоскости.
    const distance = Math.hypot(
      world.camera.position.x - state.exitPosition.x, // Разница координат X игрока и выхода.
      world.camera.position.z - state.exitPosition.y, // Разница координат Z игрока и выхода.
    );

    // Проверяет, подошёл ли игрок достаточно близко к двери.
    if (distance < 0.7) {
      // Завершает игру победой.
      finishGame(true);
    }
  }

  let previousTime = performance.now();

  function animate(now: number): void {
    // Просит браузер вызвать эту функцию перед следующим кадром.
    requestAnimationFrame(animate);

    // Переводит время между кадрами в секунды и ограничивает скачок.
    const delta = Math.min((now - previousTime) / 1000, 0.05);
    // Запоминает время текущего кадра для следующего вызова.
    previousTime = now;
    // Обновляет позицию игрока.
    updatePlayer(world.camera, state, delta);
    // Обновляет движение и атаки врагов.
    updateEnemies(world.camera, state, delta, {
      onPlayerDamaged: () => updateHud(state, ui),
      onPlayerDefeated: () => finishGame(false),
    });
    // Вращает предметы и проверяет их сбор.
    updatePickups(world, state, delta, {
      onCollected: () => updateHud(state, ui),
    });
    // Проверяет условие победы.
    checkExit();
    // Рисует текущую сцену с точки зрения камеры.
    world.renderer.render(world.scene, world.camera);
  }

  requestAnimationFrame(animate);
}
