import "./style.css";
import * as THREE from "three";

const gameElement = document.querySelector<HTMLDivElement>("#game");

if (!gameElement) {
  throw new Error("Could not find the #game element.");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  50,
);
camera.position.set(0, 1.6, 4);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
gameElement.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc4dcff, 0x302010, 2));

const mainLight = new THREE.DirectionalLight(0xffd6a0, 2);
mainLight.position.set(-4, 8, 5);
scene.add(mainLight);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
