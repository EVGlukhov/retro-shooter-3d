import { startGame } from "./game/game";
import "./style.css";

/**
 * Контейнер DOM, в который будет вставлен canvas игры.
 */
const gameElement = document.querySelector<HTMLDivElement>("#game");

if (!gameElement) {
  throw new Error("Missing HTML element: #game");
}

startGame(gameElement);
