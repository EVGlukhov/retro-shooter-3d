import type * as THREE from "three";

// Описываем данные врага.
export type Enemy = {
  mesh: THREE.Mesh; // Хранит 3D-меш врага, который будет нарисован в сцене.
  health: number; // Хранит оставшееся здоровье врага.
  attackCooldown: number; // Хранит время до следующей атаки врага.
  verticalVelocity: number; // Хранит вертикальную скорость врага для прыжков и падений.
  alive: boolean; // Указывает, жив ли враг или мёртв.
};

export type GameState = {
  walls: THREE.Mesh[];
  enemies: Enemy[];
  pickups: THREE.Mesh[];
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

export type GameUI = {
  health: HTMLSpanElement;
  ammo: HTMLSpanElement;
  objective: HTMLDivElement;
  overlay: HTMLElement;
  overlayTitle: HTMLHeadingElement;
  overlayText: HTMLParagraphElement;
  startButton: HTMLButtonElement;
};

export type GameWorld = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

// Описываем прямоугольную площадку в мировых координатах.
export type Platform = {
  x: number; // Задаём координату центра площадки по оси X.
  z: number; // Задаём координату центра площадки по оси Z.
  y: number; // Задаём высоту поверхности платформы.
  width: number; // Задаём ширину площадки вдоль оси X.
  depth: number; // Задаём глубину площадки вдоль оси Z.
};
