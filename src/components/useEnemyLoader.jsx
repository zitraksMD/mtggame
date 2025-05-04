import { useState, useEffect, useRef, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { convertTiledX, convertTiledY } from './utils'; // Импорт утилит

// --- Добавляем константы для хелсбара ---
const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_OFFSET_Y = 15; // <<<--- Подбери эту высоту над головой врага

const useEnemyLoader = (enemiesData, scene, levelConfig) => {
    const [enemyRefs, setEnemyRefs] = useState([]);
    const [areEnemiesLoaded, setAreEnemiesLoaded] = useState(false);
    const [initialEnemyStates, setInitialEnemyStates] = useState([]);
    const internalRefs = useRef([]);
    const loader = useRef(new GLTFLoader());

     // --- Создаем материалы для хелсбара один раз ---
     const hpBgMaterial = useRef(new THREE.MeshBasicMaterial({
        color: 0x333333, // Темно-серый фон
        depthTest: false, // Не проверять глубину (всегда поверх)
        depthWrite: false, // Не писать в буфер глубины
        transparent: true, // Разрешить прозрачность (на всякий случай)
        opacity: 0.8
    })).current;

    const hpFillMaterial = useRef(new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Зеленый цвет
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.9
    })).current;

    // --- Создаем геометрии тоже один раз ---
    const hpBgGeometry = useRef(new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)).current;
    const hpFillGeometry = useRef(new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)).current;
    
    const cleanupEnemies = useCallback(() => {
        if (!scene) return;
        internalRefs.current.forEach(enemyRef => {
            if (enemyRef.pivot && scene.children.includes(enemyRef.pivot)) {
                // --- Очистка ссылок хелсбара при удалении врага ---
                // Сами геометрии/материалы не удаляем, т.к. они общие
                if (enemyRef.hpBar) {
                     enemyRef.hpBar.bg = null;
                     enemyRef.hpBar.fill = null;
                     enemyRef.hpBar.container = null;
                }
                // --- ---

                scene.remove(enemyRef.pivot);
                enemyRef.pivot.traverse(object => {
                    // Очищаем только ресурсы МОДЕЛИ, а не общие ресурсы хелсбара
                     if (!(object === enemyRef.hpBar?.bg || object === enemyRef.hpBar?.fill)) { // Не трогаем меши хелсбара
                         if (object.geometry) object.geometry.dispose();
                         if (object.material) {
                             if (Array.isArray(object.material)) {
                                 object.material.forEach(material => { if (material !== hpBgMaterial && material !== hpFillMaterial) material.dispose(); }); // Не диспозим общие материалы
                             } else {
                                 if (object.material !== hpBgMaterial && object.material !== hpFillMaterial) object.material.dispose(); // Не диспозим общие материалы
                             }
                         }
                     }
                });
            }
            enemyRef.mixer?.stopAllAction();
        });
        internalRefs.current = [];
        setEnemyRefs([]);
        setInitialEnemyStates([]);
    }, [scene, hpBgMaterial, hpFillMaterial]); // Добавили зависимости


    useEffect(() => {
        if (!scene || !enemiesData || enemiesData.length === 0 || !levelConfig) {
             // Если нет данных или сцены, считаем загрузку завершенной (пустой)
            if (enemyRefs.length > 0 || initialEnemyStates.length > 0) {
                 // Очистим состояние, если оно было не пустым
                 setEnemyRefs([]);
                 setInitialEnemyStates([]);
            }
            setAreEnemiesLoaded(true);
            return;
        }

        // Сбрасываем состояние перед новой загрузкой
        setAreEnemiesLoaded(false);
        cleanupEnemies(); // Очищаем предыдущих врагов

        let isMounted = true;
        let enemiesToLoad = enemiesData.length;
        let enemiesLoadedCount = 0;
        const loadedEnemyData = [];
        const initialStatesData = [];

        const { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET } = levelConfig;
        const ENEMY_SCALE_FACTOR = 25; // Масштаб врага

        const checkLoadingComplete = () => {
            if (enemiesLoadedCount >= enemiesToLoad && isMounted) {
                console.log(`✅ Все враги (${enemiesLoadedCount}/${enemiesToLoad}) загружены (из useEnemyLoader)`);
                internalRefs.current = [...loadedEnemyData]; // Сохраняем во внутренний реф
                setEnemyRefs(loadedEnemyData); // Обновляем состояние для компонента Level
                setInitialEnemyStates(initialStatesData);
                setAreEnemiesLoaded(true);
            }
        };

        enemiesData.forEach(enemyData => {
            // Проверка базовых данных врага
             if (!enemyData || !enemyData.id || !enemyData.model || !enemyData.stats) {
                 console.error("Некорректные данные для врага:", enemyData);
                 enemiesLoadedCount++; // Считаем его "загруженным" с ошибкой
                 checkLoadingComplete();
                 return; // Пропускаем этого врага
             }

            loader.current.load(
                enemyData.model, // Путь к модели
                (gltf) => { // Успешная загрузка
                    if (!isMounted || !scene) return; // Проверка, что компонент еще смонтирован

                    const enemyModel = gltf.scene;
                    const enemyPivot = new THREE.Object3D(); // Создаем Pivot (логический центр)
                    enemyPivot.name = `pivot_${enemyData.id}`;

                    // Рассчитываем позицию Pivot'а
                    const enemyX = convertTiledX(enemyData.x || 0, 0, gameWorldWidth); // Добавим || 0 на случай отсутствия X/Y
                    const enemyY = convertTiledY(enemyData.y || 0, 0, gameWorldHeight, WORLD_Y_OFFSET);
                    enemyPivot.position.set(enemyX, enemyY, 0); // Устанавливаем позицию Pivot'а

                    // --- Настройка самой модели ---
                    enemyModel.scale.set(ENEMY_SCALE_FACTOR, ENEMY_SCALE_FACTOR, ENEMY_SCALE_FACTOR);
                    enemyModel.rotation.order = 'XYZ';
                    // Поворот модели для соответствия осям Three.js (Y-вверх)
                    enemyModel.rotation.x = Math.PI / 2; // Поворот на 90 градусов вокруг X
                    enemyModel.rotation.z = 0; // Убедимся, что по Z нет поворота по умолчанию

                    // Добавляем модель как дочерний объект к Pivot'у
                    enemyPivot.add(enemyModel);
                     // --- !!! СОЗДАНИЕ ХЕЛСБАРА !!! ---
                     const hpBarContainer = new THREE.Group(); hpBarContainer.name = `hpBar_${enemyData.id}`;
                     const hpBgMesh = new THREE.Mesh(hpBgGeometry, hpBgMaterial);
                     const hpFillMesh = new THREE.Mesh(hpFillGeometry, hpFillMaterial);
                     hpFillMesh.position.z = 0.1; // Чуть впереди фона
                     hpBarContainer.add(hpBgMesh); hpBarContainer.add(hpFillMesh);
                     hpBarContainer.position.set(0, HEALTH_BAR_OFFSET_Y, 1); // Над головой врага
                     hpBgMesh.renderOrder = 998; hpFillMesh.renderOrder = 999; // Порядок рендера
                     enemyPivot.add(hpBarContainer); // Добавляем в pivot
                     // --- !!! КОНЕЦ СОЗДАНИЯ ХЕЛСБАРА !!! ---
                    // Добавляем Pivot (вместе с моделью внутри) на сцену
                    scene.add(enemyPivot);

                    // --- Настройка анимаций ---
                    let mixer = null;
                    const actions = {};
                    let idleActionName = null;

                    if (gltf.animations && gltf.animations.length > 0) {
                        mixer = new THREE.AnimationMixer(enemyModel);
                        console.log(`[${enemyData.id}] Найденные анимации в ${enemyData.model}:`, gltf.animations.map(clip => clip.name)); // <<-- ВАЖНО: Смотри эти имена!

                        gltf.animations.forEach((clip) => {
                            const action = mixer.clipAction(clip);
                            actions[clip.name] = action;
                            // Ищем стандартные названия для зацикливания
                            if (['idle', 'walk', 'run', 'patrol'].some(name => clip.name.toLowerCase().includes(name))) {
                                action.loop = THREE.LoopRepeat;
                            } else { // Остальные (Attack, Reload, Death и т.п.) - один раз
                                action.loop = THREE.LoopOnce;
                                action.clampWhenFinished = true;
                            }
                        });

                        // Поиск Idle анимации
                        const possibleIdleNames = ['Idle', 'idle', 'Skeleton Idle', 'Breathing Idle']; // Добавь варианты
                        idleActionName = possibleIdleNames.find(name => actions[name]) || null;

                        if (!idleActionName) { // Если не нашли по имени, ищем по 포함 'idle'
                            const foundIdleClip = gltf.animations.find(clip => clip.name.toLowerCase().includes('idle'));
                            if (foundIdleClip) idleActionName = foundIdleClip.name;
                        }
                        if (!idleActionName && gltf.animations.length > 0) { // Если совсем ничего, берем первую
                            idleActionName = gltf.animations[0].name;
                            console.warn(`[${enemyData.id}] Idle не найден, используется первая анимация: "${idleActionName}"`);
                        }

                        // Запускаем Idle по умолчанию
                        if (idleActionName && actions[idleActionName]) {
                            actions[idleActionName].play();
                        } else {
                            console.error(`[${enemyData.id}] Не удалось найти и запустить Idle анимацию!`);
                        }
                    } else {
                        console.warn(`[${enemyData.id}] В модели ${enemyData.model} не найдены анимации.`);
                    }

                    // --- Сохранение данных врага ---
                    const enemyRefData = {
                        id: enemyData.id,
                        type: enemyData.type,
                        stats: { ...enemyData.stats },
                        pivot: enemyPivot, // Ссылка на Pivot (Object3D)
                        model: enemyModel, // Ссылка на саму модель (gltf.scene)
                        mixer,
                        actions,
                        idleActionName, // Имя найденной Idle анимации
                        position: enemyPivot.position, // Это ссылка на позицию Pivot'а!
                        attackCooldown: 0,
                        isDead: false,
                        currentAction: idleActionName ? actions[idleActionName] : null, // Текущая анимация
                        hpBar: { container: hpBarContainer, bg: hpBgMesh, fill: hpFillMesh },
                        aiState: null // Состояние ИИ (будет установлено в Level.jsx)
                        // TODO: Добавить сюда данные для патрулирования, если нужно
                    };
                    loadedEnemyData.push(enemyRefData);

                    // --- Сохранение начального состояния HP ---
                    initialStatesData.push({
                        id: enemyData.id,
                        currentHp: enemyData.stats?.hp || 100,
                        maxHp: enemyData.stats?.hp || 100,
                        isBoss: enemyData.type === 'boss'
                    });

                    enemiesLoadedCount++;
                    checkLoadingComplete();
                },
                undefined, // onProgress - не используется
                (error) => { // onError
                    console.error(`❌ Ошибка загрузки врага ${enemyData.model}:`, error);
                    enemiesLoadedCount++; // Считаем его "загруженным" с ошибкой, чтобы не блокировать игру
                    checkLoadingComplete();
                }
            );
        });

        // Если массив врагов пуст изначально
        if (enemiesToLoad === 0) {
             checkLoadingComplete();
        }


        return () => {
            isMounted = false;
            // Очистка при размонтировании или изменении зависимостей
            cleanupEnemies();
        };
    },  [enemiesData, scene, levelConfig, cleanupEnemies, hpBgGeometry, hpFillGeometry, hpBgMaterial, hpFillMaterial]); // Добавили геометрии/материалы в зависимости

    useEffect(() => {
        return () => {
            console.log("Disposing shared health bar resources");
            hpBgGeometry.dispose();
            hpFillGeometry.dispose();
            hpBgMaterial.dispose();
            hpFillMaterial.dispose();
         };
     }, [hpBgGeometry, hpFillGeometry, hpBgMaterial, hpFillMaterial]); // Зависимости от рефов геометрии/материалов

   return { enemyRefs, areEnemiesLoaded, initialEnemyStates };
};

export default useEnemyLoader;