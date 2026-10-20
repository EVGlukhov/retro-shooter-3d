import type * as THREE from "three";

// Описываем данные врага.
export type Enemy = {
  mesh: THREE.Mesh; // Хранит 3D-меш врага, который будет нарисован в сцене.
  health: number; // Хранит оставшееся здоровье врага.
  attackCooldown: number; // Хранит время до следующей атаки врага.
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
