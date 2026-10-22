import * as THREE from "three";
import type { GameState } from "./types";

export function createGameState(): GameState {
  return {
    walls: [],
    enemies: [],
    pickups: [],
    firePits: [],
    playerHealth: 100,
    ammo: 20,
    gameStarted: false,
    gameEnded: false,
    yaw: 0,
    pitch: 0,
    keysDown: new Set<string>(),
    exitPosition: new THREE.Vector2(),
    verticalVelocity: 0,
    horizontalVelocity: new THREE.Vector2(),
  };
}
