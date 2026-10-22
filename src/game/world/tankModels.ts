import * as THREE from "three";
import { FBXLoader, OBJLoader } from "three/examples/jsm/Addons.js";

// Объявляем допустимые варианты танка.
export type TankVariant = "red" | "blue" | "default";

// Описываем набор файлов одного варианта.
type TankVariantFiles = {
  lower: string; // Храним имя файла нижней части танка.
  upper: string; // Храним имя файла верхней части танка.
  head: string; // Храним имя файла головы танка.
  texture: string; // Храним имя файла текстуры танка.
};

const modelPath = `${import.meta.env.BASE_URL}models/tank-jr/`;

// Создаём соответствие вариантов и файлов.
const tankVariantFiles: Record<TankVariant, TankVariantFiles> = {
  red: {
    lower: "lower.fbx",
    upper: "upper.fbx",
    head: "head.obj",
    texture: "red.png",
  }, // Указываем файлы красного танка.
  blue: {
    lower: "lower_1.fbx",
    upper: "upper_1.fbx",
    head: "head_1.obj",
    texture: "blue.png",
  }, // Указываем файлы синего танка.
  default: {
    lower: "lower_2.fbx",
    upper: "upper_2.fbx",
    head: "head_2.obj",
    texture: "tankjr.png",
  }, // Указываем файлы стандартного танка.
};

// Создаём кэш загружаемых моделей.
const tankModelCache = new Map<TankVariant, Promise<THREE.Group>>();

async function loadTankTemplate(variant: TankVariant): Promise<THREE.Group> {
  // Получаем файлы выбранного варианта.
  const files = tankVariantFiles[variant];

  // Запускаем параллельную загрузку частей и текстуры.
  const [lower, upper, head, texture] = await Promise.all([
    new FBXLoader().loadAsync(`${modelPath}${files.lower}`), // Загружаем нижнюю часть танка.
    new FBXLoader().loadAsync(`${modelPath}${files.upper}`), // Загружаем верхнюю часть танка.
    new OBJLoader().setPath(modelPath).loadAsync(files.head), // Загружаем голову танка.
    new THREE.TextureLoader().loadAsync(`${modelPath}${files.texture}`), // Загружаем текстуру выбранного цвета.
  ]);

  // Устанавливаем цветовое пространство текстуры.
  texture.colorSpace = THREE.SRGBColorSpace;
  // Создаём общую группу танка.
  const model = new THREE.Group();
  // Приводим OBJ-голову к масштабу FBX-частей.
  head.scale.setScalar(100);
  // Выпрямляем наклонённый вперёд верх корпуса вокруг оси глубины модели.
  upper.rotation.x = 0.14;
  // Объединяем все три части танка.
  model.add(lower, upper, head);
  // Проходим по объектам собранной модели.
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // Определяем количество материалов меша.
    const materialCount = Array.isArray(object.material)
      ? object.material.length
      : 1;
    // Создаём материалы с текстурой варианта.
    const materials = Array.from(
      { length: materialCount },
      () =>
        new THREE.MeshStandardMaterial({
          map: texture,
          color: 0xffffff,
          roughness: 0.85,
        }),
    );
    // Назначаем созданный материал или материалы мешу.
    object.material = Array.isArray(object.material) ? materials : materials[0];
    // Получаем атрибут координат вершин модели.
    const positions = object.geometry.getAttribute("position");
    // Пересчитываем границы по вершинам, не учитывая неактивные формы морфинга FBX.
    object.geometry.boundingBox = new THREE.Box3().setFromBufferAttribute(
      positions,
    );
    // Создаём сферу отсечения, охватывающую пересчитанные границы геометрии.
    object.geometry.boundingSphere =
      object.geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  });
  // Вычисляем исходные границы модели.
  const bounds = new THREE.Box3().setFromObject(model);
  // Получаем размеры модели.
  const size = bounds.getSize(new THREE.Vector3());
  if (size.y <= 0)
    throw new Error(`У варианта танка ${variant} некорректная высота.`); // Выдаём ошибку при некорректной высоте.
  // Масштабируем модель до высоты прежнего врага.
  model.scale.setScalar(1.25 / size.y);
  // Пересчитываем границы масштабированной модели.
  bounds.setFromObject(model);
  // Центрируем модель относительно её корневой группы.
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  // Разворачиваем модель до расчёта частей в мировых координатах.
  model.rotation.y = -Math.PI / 2;
  // Обновляем мировые матрицы после масштабирования, центрирования и поворота.
  model.updateMatrixWorld(true);
  // Ищем меш торса по части имени, общей для всех цветовых вариантов.
  let torso: THREE.Object3D | undefined;
  upper.traverse((object) => {
    if (!torso && object.name.toLowerCase().includes("torso")) torso = object;
  });
  // Останавливаем загрузку, если в FBX отсутствует ожидаемый меш торса.
  if (!torso) throw new Error(`В варианте танка ${variant} не найден торс.`);
  // Вычисляем границы торса после масштабирования и центрирования модели.
  const torsoBounds = new THREE.Box3().setFromObject(torso);
  // Вычисляем границы OBJ-головы в тех же мировых координатах.
  const headBounds = new THREE.Box3().setFromObject(head);
  // Получаем размер головы для расчёта небольшого перекрытия с шеей.
  const headSize = headBounds.getSize(new THREE.Vector3());
  // Нацеливаем голову на нижнюю часть передней стороны торса.
  const headTarget = torsoBounds.getCenter(new THREE.Vector3());
  // Опускаем голову к тёмному месту на плечах, ниже спинных шипов.
  headTarget.y = torsoBounds.max.y - headSize.y * 1.1;
  // Переводим целевую точку и центр головы в локальные координаты модели.
  const headTargetLocal = model.worldToLocal(headTarget.clone());
  const headCenterLocal = model.worldToLocal(
    headBounds.getCenter(new THREE.Vector3()),
  );
  // Сдвигаем голову вперёд вдоль локального направления танка.
  headTargetLocal.x += 0.3 / model.scale.x;
  // Рассчитываем смещение головы с учётом всех преобразований модели.
  const headOffset = headTargetLocal.sub(headCenterLocal);
  // Перемещаем голову к шее торса.
  head.position.add(headOffset);
  // Возвращаем собранную модель.
  return model;
}

// Создаём независимую копию шаблона для врага.
function cloneTankTemplate(template: THREE.Group): THREE.Group {
  // Копируем группу и все дочерние объекты.
  const model = template.clone(true);
  // Проходим по объектам копии.
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return; // Пропускаем объекты, которые не являются мешами.
    object.material = Array.isArray(object.material) // Проверяем, использует ли меш несколько материалов.
      ? object.material.map((material) => material.clone()) // Копируем материалы списка независимо.
      : object.material.clone(); // Копируем одиночный материал независимо.
  });
  return model;
}

// Возвращаем отдельную модель выбранного варианта.
export function createTankModel(variant: TankVariant): Promise<THREE.Group> {
  // Проверяем, загружается ли уже шаблон.
  let templatePromise = tankModelCache.get(variant);
  // Создаём загрузку, если шаблона ещё нет в кэше.
  if (!templatePromise) {
    // Загружаем модель и обрабатываем ошибку.
    templatePromise = loadTankTemplate(variant).catch((error: unknown) => {
      tankModelCache.delete(variant); // Удаляем неудачную загрузку, чтобы разрешить повторную попытку.
      throw error; // Передаём ошибку вызывающему коду.
    });
    tankModelCache.set(variant, templatePromise); // Сохраняем Promise для повторного использования.
  }

  return templatePromise.then(cloneTankTemplate); // Возвращаем отдельную копию после загрузки шаблона.
}
