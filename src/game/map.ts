import * as THREE from "three";
import type { Platform } from "./types";

export const MAP = [
  "#############", // Верхняя граница карты: # означает стену.
  "#P...A.....E#", // Строка со стартом P, патронами A и врагом E.
  "#...........#", // Пустая проходимая строка между стенами.
  "#...........#", // Еще одна пустая строка
  "#.....H....X#", // Строка с аптечкой H и выходом X
  "#..........E#", // Строка с врагом E
  "#############", // Нижняя граница карты.
] as const;

export const PLATFORMS: Platform[] = [
  { x: -4, z: 0, y: 0, width: 5, depth: 5.5 },
  { x: 3, z: 0, y: 0, width: 5, depth: 5.5 },
];
// Запоминаем ширину карты в клетках.
export const MAP_WIDTH = MAP[0].length;
// Запоминает высоту карты в клетках.
export const MAP_HEIGHT = MAP.length;

// Проверяем, что каждая строка имеет одинаковую длину.
if (MAP.some((row) => row.length !== MAP_WIDTH)) {
  throw new Error("Every map row must have the same width.");
}

/************************************************************
 *    Перевод координат карты в координаты Three.js
 ************************************************************/
// Переводит координаты клетки в мировые координаты.
export function cellToWorld(column: number, row: number): THREE.Vector3 {
  // Создаёт вектор положения в трёхмерном пространстве.
  return new THREE.Vector3(
    column - MAP_WIDTH / 2 + 0.5, // Центрирует карту относительно мирового нуля по X.
    0, // Возвращает базовую высоту пола по Y.
    row - MAP_HEIGHT / 2 + 0.5, // Центрирует карту по Z; строка карты становится координатой Z.
  );
}

// Возвращает символ карты в заданной мировой позиции.
export function getCellAt(x: number, z: number): string {
  // Преобразуем мировую координату X в номер столбца.
  const column = Math.floor(x + MAP_WIDTH / 2);
  // Преобразуем мировую координату Z в номер строки.
  const row = Math.floor(z + MAP_HEIGHT / 2);

  // Проверяем, не вышли ли координаты за карту.
  if (row < 0 || row >= MAP_HEIGHT || column < 0 || column >= MAP_WIDTH) {
    return "#"; // Считает область за картой стеной, чтобы игрок не вышел наружу.
  }

  // Возвращаем символ клетки, например #, ., P или E.
  return MAP[row][column];
}

// Ищем высоту платформы под переданной точкой.
export function getPlatformHeightAt(x: number, z: number): number | undefined {
  // Ищем площадку, чьи границы содержат эту точку.
  const platform = PLATFORMS.find((candidate) => {
    const insideX = Math.abs(x - candidate.x) <= candidate.width / 2; // Проверяем, находится ли точка в пределах ширины.
    const insideZ = Math.abs(z - candidate.z) <= candidate.depth / 2;
    return insideX && insideZ; // Проверяем, находится ли точка в пределах глубины.
  });
  // Возвращаем высоту платформы или undefined над ямой.
  return platform?.y;
}
