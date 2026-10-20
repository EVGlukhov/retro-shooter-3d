import type { GameState, GameUI } from "./types";

// Создаём типизированный помощник для поиска HTML-элемента.
function getElement<T extends HTMLElement>(id: string): T {
  const element = document.querySelector(`#${id}`);

  if (!element) {
    throw new Error(`Missing HTML element: #${id}`);
  }

  return element as T;
}

export function getGameUI(): GameUI {
  return {
    health: getElement<HTMLSpanElement>("health"), // Получаем поле HUD, где показывается здоровье.
    ammo: getElement<HTMLSpanElement>("ammo"), // Получаем поле HUD, где показываются патроны.
    objective: getElement<HTMLDivElement>("objective"), // Получаем поле с текущей целью игры.
    overlay: getElement<HTMLElement>("overlay"), // Получаем стартовый экран.
    overlayTitle: getElement<HTMLHeadingElement>("overlay-title"), // Получаем заголовок стартового экрана.
    overlayText: getElement<HTMLParagraphElement>("overlay-text"), // Получаем описание на стартовом экране.
    startButton: getElement<HTMLButtonElement>("start-button"), // Получаем кнопку старта или перезапуска.
  };
}

export function updateHud(state: GameState, ui: GameUI): void {
  // Показывает здоровье, не позволяя отображать значение ниже нуля.
  ui.health.textContent = String(Math.max(0, state.playerHealth));
  // Показывает количество патронов.
  ui.ammo.textContent = String(state.ammo);

  ui.objective.textContent =
    state.enemies.length > 0 // Проверяет, остались ли враги.
      ? `Enemies remaining: ${state.enemies.length}` // Если остались, показывает их количество.
      : "Enemies defeated - find the purple exit"; // Иначе направляет игрока к выходу.
}
