import { Game } from "./Game";

export function bootstrap(): Game {
  const gameElement = document.querySelector<HTMLDivElement>("#game");

  if (!gameElement) {
    throw new Error("Missing HTML element: #game");
  }

  return new Game(gameElement);
}
