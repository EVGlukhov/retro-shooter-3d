import { shoot } from "./combot";
import { updateEnemies } from "./enemies";
import { updateFirePits } from "./fire";
import { getGameUI, updateHud } from "./hud";
import { setupInput } from "./input";
import { buildLevel, createGameState } from "./level";
import { updatePickups } from "./pickups";
import { updatePlayer } from "./player";
import { createWorld } from "./world";
import * as THREE from "three";

export function startGame(gameElement: HTMLElement): void {
  const ui = getGameUI();
  let world = createWorld(gameElement);
  let state = createGameState();

  buildLevel(world.scene, world.camera, state);
  updateHud(state, ui);

  function resetLevel(): void {
    // Очищаем сцену от старого уровня.
    const objectsToRemove: THREE.Object3D[] = [];

    world.scene.traverse((child) => {
      if (
        child !== world.camera &&
        !(child instanceof THREE.Light) &&
        !(child instanceof THREE.Camera)
      ) {
        objectsToRemove.push(child);
      }
    });

    for (const child of objectsToRemove) {
      world.scene.remove(child);
    }

    // Сбрасываем состояние.
    const freshState = createGameState();

    // перезаписываем поля объекта state
    Object.assign(state, freshState);

    // Сбрасываем камеру.
    world.camera.position.set(0, 1.3, 0);
    world.camera.rotation.set(0, 0, 0);

    // 4. сбрасываем специальные значения
    state.yaw = 0;
    state.pitch = 0;
    state.verticalVelocity = 0;
    state.horizontalVelocity.set(0, 0);
    state.keysDown.clear();

    ui.overlayTitle.textContent = "Retro Shooter";
    ui.overlayText.textContent = "WASD to move, mouse to look, click to shoot.";
    ui.startButton.textContent = "Start game";

    // Пересоздаём уровень.
    buildLevel(world.scene, world.camera, state);
    // Сбрасываем HUD.
    updateHud(state, ui);

    // Сбрасываем overlay.
    state.gameEnded = false;
    state.gameStarted = false;
    ui.overlay.classList.add("hidden");
  }

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
    resetLevel,
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
    updatePlayer(world.camera, state, delta, {
      onFell: () => {
        // Устанавливаем здоровье в ноль при падении в яму.
        state.playerHealth = 0;
        // Обновляем отображение здоровья.
        updateHud(state, ui);
        // Показываем экран поражения.
        finishGame(false);
      },
    });
    updateFirePits(state, now);
    // Обновляет движение и атаки врагов.
    updateEnemies(world.camera, state, delta, {
      onPlayerDamaged: () => updateHud(state, ui),
      onPlayerDefeated: () => finishGame(false),
      onEnemyDied: () => updateHud(state, ui),
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
