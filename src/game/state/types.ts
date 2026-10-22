/**
 * Представляет сущность врага в игровом мире.
 * @property mesh Меш Three.js, визуально отображающий врага.
 * @property health Текущее здоровье врага.
 * @property attackCooldown Время до следующей атаки в секундах.
 * @property verticalVelocity Вертикальная скорость для прыжков и падения.
 * @property alive Флаг, указывающий, жив ли враг.
 */
import * as THREE from "three";

export type Enemy = {
  mesh: THREE.Mesh;
  health: number;
  attackCooldown: number;
  verticalVelocity: number;
  alive: boolean;
};

/**
 * Представляет текущее игровое состояние на уровне сессии.
 * @property walls Массив стен, используемых для проверки коллизий.
 * @property enemies Активные враги на уровне.
 * @property pickups Предметы, доступные для подбора.
 * @property firePits Массив групп эффектов лавы и огня.
 * @property playerHealth Текущее здоровье игрока.
 * @property ammo Количество патронов в магазине.
 * @property gameStarted Флаг, что игра активна и захвачена мышь.
 * @property gameEnded Флаг завершения игровой сессии.
 * @property yaw Угол поворота камеры по горизонтали.
 * @property pitch Угол наклона камеры по вертикали.
 * @property keysDown Набор клавиш, удерживаемых в данный момент.
 * @property exitPosition Позиция выхода на карте.
 * @property verticalVelocity Вертикальная скорость игрока.
 * @property horizontalVelocity Горизонтальная скорость движения игрока.
 */
export type GameState = {
  walls: THREE.Mesh[];
  enemies: Enemy[];
  pickups: THREE.Mesh[];
  firePits: THREE.Group[];
  playerHealth: number;
  ammo: number;
  gameStarted: boolean;
  gameEnded: boolean;
  yaw: number;
  pitch: number;
  keysDown: Set<string>;
  exitPosition: THREE.Vector2;
  verticalVelocity: number;
  horizontalVelocity: THREE.Vector2;
};

/**
 * Описывает структуру элементов HUD и меню.
 * @property health Элемент здоровья в интерфейсе.
 * @property ammo Элемент отображения боезапаса.
 * @property objective Элемент текущей игровой цели.
 * @property overlay Контейнер overlay-экрана.
 * @property overlayTitle Заголовок overlay-экрана.
 * @property overlayText Текст overlay-экрана.
 * @property startButton Кнопка запуска или возобновления игры.
 */
export type GameUI = {
  health: HTMLSpanElement;
  ammo: HTMLSpanElement;
  objective: HTMLDivElement;
  overlay: HTMLElement;
  overlayTitle: HTMLHeadingElement;
  overlayText: HTMLParagraphElement;
  startButton: HTMLButtonElement;
};

/**
 * Представляет игровой мир с триангулируемой сценой, камерой и рендерером.
 * @property scene Сцена Three.js.
 * @property camera Основная камера игрока.
 * @property renderer WebGL-рендерер.
 */
export type GameWorld = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

/**
 * Определяет геометрию прямоугольной платформы в игровом пространстве.
 * @property x Центр платформы по оси X.
 * @property z Центр платформы по оси Z.
 * @property y Высота поверхности платформы.
 * @property width Ширина платформы вдоль оси X.
 * @property depth Глубина платформы вдоль оси Z.
 */
export type Platform = {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
};

/**
 * Определяет прямоугольную зону с лавой и огнём.
 * @property x Центр зоны по оси X.
 * @property z Центр зоны по оси Z.
 * @property width Ширина зоны.
 * @property depth Глубина зоны.
 */
export type FirePitRect = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type HitEffect = {
  mesh: THREE.Mesh;
  life: number;
  active: boolean;
};
