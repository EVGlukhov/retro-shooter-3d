import * as THREE from "three";
import type { GameState, GameUI, GameWorld } from "./types";

type InputActions = {
  shoot: () => void;
  resetLevel: () => void;
};

export function setupInput(
  world: GameWorld,
  state: GameState,
  ui: GameUI,
  actions: InputActions,
): void {
  const { camera, renderer } = world;

  // Реагируем на клик по кнопке запуска.
  ui.startButton.addEventListener("click", function () {
    if (state.gameEnded) {
      actions.resetLevel();
      requestAnimationFrame(() => {
        renderer.domElement.requestPointerLock();
      });
      return;
    }

    // Захватываем мышь, чтобы движение мыши управляло обзором.
    if (!state.gameStarted) {
      renderer.domElement.requestPointerLock();
    }
  });

  // Срабатывает, когда браузер захватывает или освобождает указатель.
  document.addEventListener("pointerlockchange", () => {
    // Определяем, захвачена ли мышь игровым canvas.
    const isLocked = document.pointerLockElement === renderer.domElement;

    state.gameStarted = isLocked;

    if (!isLocked && !state.gameEnded) {
      ui.overlayTitle.textContent = "Paused";
      ui.overlayText.textContent = "Press Continue to resume the game.";
      ui.startButton.textContent = "Continue game";
      ui.overlay.classList.remove("hidden");
    }

    if (isLocked) {
      ui.overlay.classList.add("hidden");
    }
  });

  // Получаем движения мыши.
  document.addEventListener("mousemove", (event: MouseEvent) => {
    // Не вращаем камеру, если игра не активна.
    if (!state.gameStarted) return;

    // Задаём чувствительность мыши.
    const sensitivity = 0.005;
    // Изменяем угол взгляда влево/вправо.
    state.yaw -= event.movementX * sensitivity;
    // Изменяем угол взгляда вверх/вниз.
    state.pitch -= event.movementY * sensitivity;

    // Не позволяем смотреть точно вверх или вниз до переворота.
    const maxPitch = Math.PI / 2 - 0.05;
    // Ограничиваем pitch допустимым диапазоном.
    state.pitch = THREE.MathUtils.clamp(state.pitch, -maxPitch, maxPitch);

    // Применяем горизонтальный поворот камеры.
    camera.rotation.y = state.yaw;
    // Применяем вертикальный наклон камеры.
    camera.rotation.x = state.pitch;
  });

  // Получаем нажатие клавиши.
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    // Запоминаем код нажатой клавиши, например KeyW.
    state.keysDown.add(event.code);
  });

  // Получаем отпускание клавиши.
  window.addEventListener("keyup", (event: KeyboardEvent) => {
    // Удаляем код клавиши из списка нажатых.
    state.keysDown.delete(event.code);
  });

  // Срабатываем, если окно игры теряет фокус.
  window.addEventListener("blur", () => {
    // Сбрасываем нажатые клавиши, чтобы движение не зависло.
    state.keysDown.clear();
  });

  // Обрабатываем нажатие кнопки мыши на игровом canvas.
  renderer.domElement.addEventListener("mousedown", (event: MouseEvent) => {
    // При нажатии левой кнопки вызываем выстрел.
    if (event.button === 0) actions.shoot();
  });
}
