import * as THREE from "three";
import type { GameWorld } from "../state/types";
import { PALETTE } from "../config/palette";

/**
 * Создаёт сцену, камеру и рендерер для игрового мира.
 * @param gameElement Контейнер DOM, в который будет добавлен canvas Three.js.
 * @returns Объект игрового мира с сценой, камерой и рендерером.
 */
export function createWorld(gameElement: HTMLElement): GameWorld {
  // Создаём контейнер, в котором будут находиться 3D-объекты.
  const scene = new THREE.Scene();
  // Задаём цвет фона за пределами объектов.
  scene.background = new THREE.Color(PALETTE.world.background);
  // Добавляем туман: он постепенно скрывает объекты от 8 до 25 единиц.
  scene.fog = new THREE.Fog(PALETTE.world.fog, 8, 25);

  // Создаём перспективную камеру, похожую на человеческое зрение.
  const camera = new THREE.PerspectiveCamera(
    75, // Задаём вертикальный угол обзора в градусах.
    window.innerWidth / window.innerHeight, // Вычисляем отношение ширины экрана к высоте.
    0.1, // Задаём ближайшую видимую дистанцию.
    50, // Задаём максимальную видимую дистанцию камеры.
  );
  // Ставим камеру на высоту глаз игрока и немного впереди центра мира.
  camera.position.set(0, 1.6, 4);
  // Задаём порядок вращения, удобный для обзора от первого лица.
  camera.rotation.order = "YXZ";
  // Добавляем камеру в сцену.
  scene.add(camera);

  // Создаём WebGL-рендерер с сглаживанием краёв.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // Устанавливаем размер canvas по размеру окна.
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Ограничиваем плотность пикселей, чтобы снизить нагрузку.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  // Настраиваем цветовое пространство для корректного отображения цвета.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Добавляем созданный Three.js canvas внутрь #game.
  gameElement.appendChild(renderer.domElement);

  // Создаём мягкий свет сверху и отражённый свет снизу.
  const hemisphereLight = new THREE.HemisphereLight(
    PALETTE.lighting.sky,
    PALETTE.lighting.ground,
    2,
  );
  // Добавляем свет в сцену.
  scene.add(hemisphereLight);

  // Создаём направленный свет, похожий на солнечный.
  const mainLight = new THREE.DirectionalLight(PALETTE.lighting.key, 2);
  // Задаём положение источника света.
  mainLight.position.set(-4, 8, 5);
  // Добавляем направленный свет в сцену.
  scene.add(mainLight);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}
