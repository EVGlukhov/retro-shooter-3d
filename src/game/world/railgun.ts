import * as THREE from "three";

/** Хранит состояние отдачи, вспышки и луча для одной модели рельсотрона. */
type RailgunEffects = {
  recoil: number; // Текущая сила отдачи оружия.
  muzzleLife: number; // Оставшееся время свечения у дула.
  beamLife: number; // Оставшееся время отображения луча.
  beamCore: THREE.Mesh; // Тонкая яркая сердцевина луча.
  beamGlow: THREE.Mesh; // Широкое полупрозрачное свечение луча.
  muzzleFlash: THREE.Mesh; // Краткая вспышка у дула оружия.
  muzzleLight: THREE.PointLight; // Свет от вспышки выстрела.
};

// Связываем созданное оружие с его эффектами, не добавляя их в игровое состояние.
const effects = new WeakMap<THREE.Group, RailgunEffects>();

/**
 * Добавляет прямоугольную деталь корпуса в группу оружия.
 * @param group Группа рельсотрона, куда добавляется деталь.
 * @param size Размер детали по трём осям.
 * @param position Положение детали в локальных координатах оружия.
 * @param material Материал поверхности детали.
 */
function addBox(
  group: THREE.Group, // Группа рельсотрона, куда добавляется деталь.
  size: THREE.Vector3, // Размер детали по трём осям.
  position: THREE.Vector3, // Положение детали относительно оружия.
  material: THREE.Material, // Материал поверхности детали.
): void {
  const mesh = new THREE.Mesh( // Создаём сетку детали с заданной геометрией и материалом.
    new THREE.BoxGeometry(size.x, size.y, size.z), // Формируем прямоугольную геометрию.
    material, // Назначаем материал поверхности.
  );
  mesh.position.copy(position); // Устанавливаем локальное положение детали.
  group.add(mesh); // Прикрепляем деталь к оружию.
}

/**
 * Создаёт модель рельсотрона и прикрепляет её к камере от первого лица.
 * @param camera Камера игрока, к которой будет прикреплено оружие.
 * @returns Группа объектов, образующая модель рельсотрона.
 */
export function createRailgun(camera: THREE.Camera): THREE.Group {
  const gun = new THREE.Group(); // Создаём общую группу модели оружия.
  gun.name = "player-railgun"; // Даём группе понятное имя для отладки.
  gun.position.set(0.34, -0.29, -0.65); // Размещаем оружие справа и ниже центра камеры.
  gun.scale.setScalar(0.75); // Уменьшаем оружие до подходящего размера на экране.

  const darkMetal = new THREE.MeshStandardMaterial({ // Создаём тёмный металлический материал.
    color: 0x222a35, // Задаём базовый цвет тёмных деталей.
    metalness: 0.85, // Придаём поверхности выраженные металлические свойства.
    roughness: 0.28, // Делаем металлические блики достаточно чёткими.
  });
  const lightMetal = new THREE.MeshStandardMaterial({ // Создаём светлый металлический материал.
    color: 0x8f9cac, // Задаём серебристо-серый оттенок.
    metalness: 0.9, // Усиливаем металлическое отражение.
    roughness: 0.2, // Делаем поверхность более гладкой.
  });
  const energyMaterial = new THREE.MeshStandardMaterial({ // Создаём материал светящихся рельсов.
    color: 0x38d8ff, // Окрашиваем рельсы в голубой цвет.
    emissive: 0x00aaff, // Добавляем собственное голубое свечение.
    emissiveIntensity: 2.5, // Усиливаем заметность энергетических деталей.
    metalness: 0.35, // Сохраняем часть металлического блеска.
    roughness: 0.2, // Делаем энергетическую поверхность гладкой.
  });

  addBox( // Добавляем основной вытянутый корпус рельсотрона.
    gun, // Помещаем деталь в группу оружия.
    new THREE.Vector3(0.23, 0.16, 0.68), // Задаём размеры корпуса.
    new THREE.Vector3(0, 0, -0.19), // Сдвигаем корпус вперёд от камеры.
    darkMetal, // Используем тёмный металлический материал.
  );
  addBox( // Добавляем заднюю светлую часть корпуса.
    gun, // Помещаем деталь в группу оружия.
    new THREE.Vector3(0.18, 0.1, 0.28), // Задаём размеры задней детали.
    new THREE.Vector3(0, -0.02, 0.25), // Размещаем деталь за основным корпусом.
    lightMetal, // Используем светлый металл для контраста.
  );
  addBox( // Создаём рукоятку оружия.
    gun, // Помещаем рукоятку в группу оружия.
    new THREE.Vector3(0.12, 0.23, 0.16), // Задаём узкий вертикальный размер рукоятки.
    new THREE.Vector3(0, -0.18, 0.02), // Опускаем рукоятку относительно корпуса.
    darkMetal, // Окрашиваем рукоятку в тёмный цвет.
  );
  addBox( // Добавляем светлую верхнюю планку корпуса.
    gun, // Помещаем планку в группу оружия.
    new THREE.Vector3(0.08, 0.07, 0.34), // Задаём компактные размеры планки.
    new THREE.Vector3(0, 0.11, -0.24), // Размещаем планку сверху и ближе к дулу.
    lightMetal, // Используем светлый металл.
  );

  for (const side of [-1, 1]) { // Размещаем энергетические рельсы симметрично по сторонам.
    addBox( // Создаём одну светящуюся направляющую.
      gun, // Прикрепляем направляющую к оружию.
      new THREE.Vector3(0.045, 0.055, 0.72), // Задаём длинную и узкую форму рельса.
      new THREE.Vector3(side * 0.105, 0.045, -0.49), // Сдвигаем рельс влево или вправо и вперёд.
      energyMaterial, // Используем светящийся энергетический материал.
    );
  }

  const barrel = new THREE.Mesh( // Создаём центральный цилиндрический ствол.
    new THREE.CylinderGeometry(0.035, 0.05, 0.72, 8), // Задаём сужающийся восьмигранный ствол.
    lightMetal, // Назначаем стволу светлый металлический материал.
  );
  barrel.rotation.x = -Math.PI / 2; // Поворачиваем цилиндр вдоль направления выстрела.
  barrel.position.set(0, 0.025, -0.49); // Ставим ствол по центру между рельсами.
  gun.add(barrel); // Прикрепляем ствол к корпусу.

  const muzzleFlash = new THREE.Mesh( // Создаём сферу вспышки у дула.
    new THREE.SphereGeometry(0.09, 8, 8), // Используем малополигональную геометрию вспышки.
    new THREE.MeshBasicMaterial({ // Создаём материал вспышки без влияния освещения.
      color: 0xbaf5ff, // Задаём почти белый голубой цвет.
      transparent: true, // Разрешаем плавное затухание прозрачности.
      opacity: 0, // Изначально скрываем вспышку.
      depthWrite: false, // Не записываем вспышку в буфер глубины.
    }),
  );
  muzzleFlash.name = "railgun-muzzle-flash"; // Даём вспышке имя для отладки.
  muzzleFlash.position.set(0, 0.025, -0.91); // Устанавливаем вспышку непосредственно у дула.
  muzzleFlash.visible = false; // Не показываем вспышку до выстрела.
  gun.add(muzzleFlash); // Прикрепляем вспышку к оружию.

  const muzzleLight = new THREE.PointLight(0x49dfff, 0, 2); // Создаём голубой свет от выстрела.
  muzzleLight.position.copy(muzzleFlash.position); // Размещаем свет рядом со вспышкой.
  gun.add(muzzleLight); // Прикрепляем источник света к оружию.

  const beamCore = new THREE.Mesh( // Создаём тонкую яркую сердцевину выстрела.
    new THREE.CylinderGeometry(0.025, 0.025, 1, 8), // Задаём узкий цилиндр вдоль оси Y.
    new THREE.MeshBasicMaterial({ color: 0xd9fbff }), // Используем почти белый голубой материал.
  );
  const beamGlow = new THREE.Mesh( // Создаём широкую оболочку свечения луча.
    new THREE.CylinderGeometry(0.075, 0.075, 1, 8), // Задаём цилиндр свечения большего радиуса.
    new THREE.MeshBasicMaterial({ // Создаём материал с прозрачностью.
      color: 0x24bfff, // Окрашиваем свечение в насыщенный голубой.
      transparent: true, // Разрешаем смешивание с изображением сцены.
      opacity: 0.4, // Устанавливаем начальную полупрозрачность.
      depthWrite: false, // Не меняем буфер глубины свечением.
    }),
  );
  beamCore.visible = false; // Скрываем сердцевину до выстрела.
  beamGlow.visible = false; // Скрываем свечение до выстрела.

  gun.traverse((object) => { // Настраиваем прорисовку деталей оружия поверх сцены.
    if (!(object instanceof THREE.Mesh)) return; // Пропускаем объекты, не являющиеся сетками.
    object.renderOrder = 10; // Повышаем порядок отображения оружия.
    const materials = Array.isArray(object.material) // Проверяем, использует ли сетка несколько материалов.
      ? object.material // Получаем массив материалов сетки.
      : [object.material]; // Оборачиваем одиночный материал в массив.
    for (const material of materials) { // Перебираем все материалы текущей сетки.
      material.depthTest = false; // Не скрываем оружие геометрией игрового мира.
      material.depthWrite = false; // Не записываем оружие в буфер глубины сцены.
    }
  });
  gun.add(beamCore, beamGlow); // Добавляем модели оружия объекты луча.
  camera.add(gun); // Прикрепляем оружие к камере игрока.

  effects.set(gun, { // Сохраняем исходное состояние эффектов рельсотрона.
    recoil: 0, // Начинаем без отдачи.
    muzzleLife: 0, // Начинаем без вспышки у дула.
    beamLife: 0, // Начинаем без активного луча.
    beamCore, // Сохраняем сердцевину луча.
    beamGlow, // Сохраняем внешнее свечение луча.
    muzzleFlash, // Сохраняем модель вспышки.
    muzzleLight, // Сохраняем источник света выстрела.
  });

  return gun; // Возвращаем готовую модель оружия.
}

/**
 * Показывает лучевой выстрел от дула к заданной точке мира.
 * @param gun Группа рельсотрона, производящего выстрел.
 * @param scene Сцена, где отображается летящий луч.
 * @param camera Камера, относительно которой закреплено оружие.
 * @param target Точка прицеливания в мировых координатах.
 * @returns Ничего не возвращает, если эффекты оружия не найдены или цель совпала с дулом.
 */
export function fireRailgun(
  gun: THREE.Group, // Группа рельсотрона, производящего выстрел.
  scene: THREE.Scene, // Сцена для отображения луча.
  camera: THREE.Camera, // Камера, к которой прикреплено оружие.
  target: THREE.Vector3, // Точка прицеливания в мировых координатах.
): void {
  const state = effects.get(gun); // Получаем эффекты конкретного экземпляра оружия.
  if (!state) return; // Прерываем функцию, если оружие не было создано этим модулем.

  camera.updateWorldMatrix(true, false); // Обновляем матрицу камеры перед вычислением мировых координат.
  gun.updateWorldMatrix(true, false); // Обновляем матрицу оружия для определения положения дула.
  const origin = gun.localToWorld(new THREE.Vector3(0, 0.025, -0.91)); // Находим положение дула в мировом пространстве.
  const direction = target.clone().sub(origin); // Вычисляем направление от дула к цели.
  const distance = direction.length(); // Получаем длину луча до точки прицеливания.
  if (distance === 0) return; // Не создаём луч нулевой длины.
  direction.normalize(); // Нормализуем направление луча.

  const midpoint = origin.clone().addScaledVector(direction, distance / 2); // Вычисляем центр луча.
  const rotation = new THREE.Quaternion().setFromUnitVectors( // Находим поворот цилиндра вдоль направления выстрела.
    new THREE.Vector3(0, 1, 0), // Указываем исходную ось цилиндра.
    direction, // Указываем направление выстрела.
  );

  for (const beam of [state.beamCore, state.beamGlow]) { // Настраиваем сердцевину и оболочку луча одинаково.
    beam.position.copy(midpoint); // Переносим луч в вычисленный центр отрезка.
    beam.quaternion.copy(rotation); // Направляем цилиндр вдоль выстрела.
    beam.scale.y = distance; // Растягиваем цилиндр до точки попадания.
    beam.visible = true; // Показываем луч после выстрела.
  }

  if (!scene.children.includes(state.beamCore)) scene.add(state.beamCore); // Добавляем сердцевину в сцену при первом выстреле.
  if (!scene.children.includes(state.beamGlow)) scene.add(state.beamGlow); // Добавляем свечение в сцену при первом выстреле.

  state.recoil = 1; // Запускаем отдачу оружия.
  state.muzzleLife = 0.09; // Задаём длительность вспышки у дула.
  state.beamLife = 0.22; // Задаём длительность видимости луча.
  state.muzzleFlash.visible = true; // Показываем вспышку при выстреле.
  state.muzzleLight.intensity = 5; // Кратко усиливаем свет у дула.
}

/**
 * Обновляет отдачу оружия и затухание вспышки и луча.
 * @param gun Группа рельсотрона, визуальные эффекты которого обновляются.
 * @param delta Время с предыдущего кадра в секундах.
 * @returns Ничего не возвращает, если для оружия не было создано состояние эффектов.
 */
export function updateRailgun(gun: THREE.Group, delta: number): void {
  const state = effects.get(gun); // Получаем эффекты обновляемого экземпляра оружия.
  if (!state) return; // Выходим, если передана неизвестная группа оружия.

  state.recoil = Math.max(0, state.recoil - delta * 8); // Плавно уменьшаем силу отдачи.
  gun.position.z = -0.65 + state.recoil * 0.08; // Возвращаем оружие к исходному положению.

  state.muzzleLife = Math.max(0, state.muzzleLife - delta); // Уменьшаем оставшееся время вспышки.
  state.muzzleFlash.visible = state.muzzleLife > 0; // Скрываем вспышку после завершения её времени.
  const muzzleMaterial = state.muzzleFlash.material; // Получаем материал вспышки для изменения прозрачности.
  if (muzzleMaterial instanceof THREE.MeshBasicMaterial) { // Убеждаемся, что материал поддерживает прозрачность.
    muzzleMaterial.opacity = state.muzzleLife / 0.09; // Постепенно делаем вспышку прозрачной.
  }
  state.muzzleLight.intensity = (state.muzzleLife / 0.09) * 5; // Плавно гасим свет выстрела.

  state.beamLife = Math.max(0, state.beamLife - delta); // Уменьшаем оставшееся время видимости луча.
  state.beamCore.visible = state.beamLife > 0; // Скрываем сердцевину после затухания выстрела.
  state.beamGlow.visible = state.beamLife > 0; // Скрываем свечение после затухания выстрела.
  const glowMaterial = state.beamGlow.material; // Получаем материал оболочки луча.
  if (glowMaterial instanceof THREE.MeshBasicMaterial) { // Проверяем, что материал поддерживает прозрачность.
    glowMaterial.opacity = (state.beamLife / 0.22) * 0.4; // Плавно уменьшаем яркость свечения.
  }
}
