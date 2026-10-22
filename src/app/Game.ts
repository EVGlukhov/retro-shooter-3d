import * as THREE from "three";
import { shoot, updateHitEffects } from "../game/systems/combat";
import { updateEnemies } from "../game/systems/enemies";
import { updateFirePits } from "../game/systems/fire";
import { getGameUI, updateHud } from "../game/ui/hud";
import { setupInput } from "../game/systems/input";
import { buildLevel } from "../game/world/level";
import { createGameState } from "../game/state/state";
import { updatePickups } from "../game/systems/pickups";
import { updatePlayer } from "../game/systems/player";
import { createWorld } from "../game/world/createWorld";

export class Game {
  world;
  state;
  ui;

  constructor(container: HTMLElement) {
    this.ui = getGameUI();
    this.world = createWorld(container);
    this.state = createGameState();

    buildLevel(this.world.scene, this.world.camera, this.state);
    updateHud(this.state, this.ui);

    setupInput(this.world, this.state, this.ui, {
      shoot: () => shoot(this.world, this.state, this.ui),
      resetLevel: () => this.reset(),
    });
  }

  reset() {
    const objectsToRemove: THREE.Object3D[] = [];

    this.world.scene.traverse((child: THREE.Object3D) => {
      if (
        child !== this.world.camera &&
        !(child instanceof THREE.Light) &&
        !(child instanceof THREE.Camera)
      ) {
        objectsToRemove.push(child);
      }
    });

    for (const child of objectsToRemove) {
      this.world.scene.remove(child);
    }

    const freshState = createGameState();
    Object.assign(this.state, freshState);

    this.world.camera.position.set(0, 1.3, 0);
    this.world.camera.rotation.set(0, 0, 0);

    this.state.yaw = 0;
    this.state.pitch = 0;
    this.state.verticalVelocity = 0;
    this.state.horizontalVelocity.set(0, 0);
    this.state.keysDown.clear();

    this.ui.overlayTitle.textContent = "Retro Shooter";
    this.ui.overlayText.textContent =
      "WASD to move, mouse to look, click to shoot.";
    this.ui.startButton.textContent = "Start game";

    buildLevel(this.world.scene, this.world.camera, this.state);
    updateHud(this.state, this.ui);

    this.state.gameEnded = false;
    this.state.gameStarted = false;
    this.ui.overlay.classList.add("hidden");
  }

  finishGame(won: boolean) {
    if (this.state.gameEnded) return;

    this.state.gameEnded = true;
    this.state.gameStarted = false;

    document.exitPointerLock();

    this.ui.overlayTitle.textContent = won ? "You win!" : "Game over";
    this.ui.overlayText.textContent = won
      ? "You defeated the enemies and found the exit."
      : "Your health reached zero.";
    this.ui.startButton.textContent = "Play again";
    this.ui.overlay.classList.remove("hidden");
  }

  checkExit() {
    if (
      this.state.gameEnded ||
      !this.state.gameStarted ||
      this.state.enemies.length > 0
    ) {
      return;
    }

    const distance = Math.hypot(
      this.world.camera.position.x - this.state.exitPosition.x,
      this.world.camera.position.z - this.state.exitPosition.y,
    );

    if (distance < 0.7) {
      this.finishGame(true);
    }
  }

  update(delta: number) {
    updatePlayer(this.world.camera, this.state, delta, {
      onFell: () => {
        this.state.playerHealth = 0;
        updateHud(this.state, this.ui);
        this.finishGame(false);
      },
    });

    updateFirePits(this.state, performance.now());

    updateEnemies(this.world.camera, this.state, delta, {
      onPlayerDamaged: () => updateHud(this.state, this.ui),
      onPlayerDefeated: () => this.finishGame(false),
      onEnemyDied: () => updateHud(this.state, this.ui),
    });

    updatePickups(this.world, this.state, delta, {
      onCollected: () => updateHud(this.state, this.ui),
    });

    this.checkExit();
    updateHitEffects(delta);
    updateHud(this.state, this.ui);
  }

  render() {
    this.world.renderer.render(this.world.scene, this.world.camera);
  }

  start() {
    let previousTime = performance.now();

    const loop = (now: number) => {
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      this.update(delta);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
