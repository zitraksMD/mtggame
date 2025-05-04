// CharacterViewer.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const CharacterViewer = ({ modelPath = "/Models/character.glb" }) => {
    const containerRef = useRef();

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
        // --- Оставим позицию камеры как была или чуть ближе/ниже ---
        camera.position.set(0, 15, 15); // <<<--- Попробуй приблизить/опустить камеру

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(250, 250); // <<<--- Убедись, что размер рендерера соответствует контейнеру
        if (containerRef.current) { // Проверка что ref существует
             containerRef.current.innerHTML = ""; // Очистка перед добавлением
             containerRef.current.appendChild(renderer.domElement);
        }

        const controls = new OrbitControls(camera, renderer.domElement);
         // --- Вернем таргет примерно в центр модели или чуть ниже ---
         controls.target.set(0, 0, 0); // <<<--- ЦЕЛЬ В ЦЕНТР PIVOT'а МОДЕЛИ
         controls.update();
         controls.enabled = false; // Отключаем управление

        // --- Освещение ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Intensity 2.0
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 5.0); // <<<--- Intensity 5.0
        directionalLight1.position.set(5, 10, 7); // Позиция основного света
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 5.0); // <<<--- Intensity 5.0
        directionalLight2.position.set(-5, -5, -5); // Позиция заполняющего/контрового света
        scene.add(directionalLight2);

        const loader = new GLTFLoader();
        let group; // Объявим group здесь, чтобы был доступен в cleanup

        loader.load(modelPath, (gltf) => {
            const model = gltf.scene;
            group = new THREE.Group(); // Присваиваем значение объявленной переменной
            group.add(model);

            // --- Центрирование и масштабирование ---
             try { // Добавим try-catch на случай ошибок с bounding box
                 const box = new THREE.Box3().setFromObject(model);
                 const center = box.getCenter(new THREE.Vector3());
                 const size = box.getSize(new THREE.Vector3()).length(); // Используем длину диагонали для масштаба

                 model.position.sub(center); // Центрируем модель внутри группы

                 // Масштабируем группу (подбери множитель, 25 может быть мало для перспективы)
                 const desiredHeight = 14; // Желаемая примерная высота модели в юнитах сцены
                  if (size > 0.001) { // Избегаем деления на ноль
                     group.scale.setScalar(desiredHeight / size);
                  } else {
                     group.scale.setScalar(1); // Стандартный масштаб, если размер не определился
                  }

             } catch (bboxError) {
                 console.error("Ошибка при расчете bounding box или центрировании:", bboxError);
                 // Применяем стандартный масштаб в случае ошибки
                 group.scale.setScalar(15); // Примерный масштаб
             }


            // --- !!! ПОВОРОТ ГРУППЫ ДЛЯ НАКЛОНА ВПЕРЕД !!! ---
            const tiltForwardAngle = 0.5; // <<<--- УГОЛ НАКЛОНА (в радианах, подбирай: 0.1, 0.2, 0.3...)
            // Применяем базовый поворот (если модель экспортирована "лежа") + наклон вперед
            group.rotation.x = -Math.PI / 2 + tiltForwardAngle;
            group.rotation.y = 2*Math.PI; // <<<--- ПОВОРОТ НА 180 ГРАДУСОВ ЛИЦОМ К КАМЕРЕ
            group.rotation.z = 0;
            // --- !!! ---

            scene.add(group);

            // Анимация (если нужна)
            // const mixer = new THREE.AnimationMixer(model);
            // const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle'); // Или другое имя
            // if (idleClip) { mixer.clipAction(idleClip).play(); }

            const animate = () => {
                 const animationId = requestAnimationFrame(animate);
                 // if (mixer) mixer.update(clock.getDelta()); // Раскомментируй, если используешь анимацию
                 controls.update(); // Обновляем контролы (даже если отключены, для target)
                 renderer.render(scene, camera);
             };
             // const clock = new THREE.Clock(); // Нужны часы для миксера
             animate();

        }, undefined, (error) => {
            console.error("Ошибка загрузки модели:", error);
        });

        // --- Очистка ---
        return () => {
             console.log("Очистка CharacterViewer для:", modelPath);
             // Останавливаем цикл анимации, если он был запущен через requestAnimationFrame
             // (Нужен способ остановить его, например, сохранив ID)

             // Удаляем слушатели событий контролов
             controls.dispose();

             // Очищаем сцену
             if (group) { // Проверяем, была ли группа создана
                  scene.remove(group);
                 // Очищаем ресурсы модели внутри группы
                 group.traverse(object => {
                     if (object.geometry) object.geometry.dispose();
                     if (object.material) {
                         if (Array.isArray(object.material)) {
                             object.material.forEach(material => material.dispose());
                         } else {
                             object.material.dispose();
                         }
                     }
                 });
             }
             // Очищаем другие объекты сцены, если они добавлялись
             scene.remove(ambientLight);
             scene.remove(directionalLight1);
             scene.remove(directionalLight2);


             // Очищаем рендерер
             renderer.dispose();

             // Очищаем контейнер
             if (containerRef.current) {
                 containerRef.current.innerHTML = ""; // Убираем canvas
             }
         };
    }, [modelPath]); // Перезапускаем эффект только при смене modelPath

    // Убедись, что у div есть размеры через CSS (в Inventory.scss)
    return <div ref={containerRef} className="character-viewer-container" style={{ width: '250px', height: '250px', display: 'inline-block' }} />;
};

export default CharacterViewer;