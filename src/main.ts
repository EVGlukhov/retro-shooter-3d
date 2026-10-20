import { startGame } from "./game/game";
import "./style.css";

const gameElement = document.querySelector<HTMLDivElement>("#game"); // Получаем контейнер, куда добавится canvas Three.js.

if (!gameElement) {
  throw new Error("Missing HTML element: #game");
}

startGame(gameElement);
