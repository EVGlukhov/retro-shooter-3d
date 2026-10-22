const fightSound = new Audio("/sounds/fight.mp3");
fightSound.volume = 0.5;

const jumpSound = new Audio("/sounds/jump.mp3");
jumpSound.volume = 0.5;

export function playFightSound(): void {
  fightSound.currentTime = 0;
  fightSound.play().catch(() => {
    // ignore browser autoplay restrictions
  });
}

export function playJumpSound(): void {
  jumpSound.currentTime = 0;
  jumpSound.play().catch(() => {
    // ignore browser autoplay restrictions
  });
}
