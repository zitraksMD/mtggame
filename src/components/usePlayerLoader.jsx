import { useState, useEffect, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { convertTiledX, convertTiledY, DEFAULT_WORLD_WIDTH, DEFAULT_WORLD_HEIGHT } from './utils';
import * as THREE from 'three';

const usePlayerLoader = (modelPath, startPosData, scene, levelConfig) => {
    const [playerObject, setPlayerObject] = useState(null);
    const [isPlayerModelLoaded, setIsPlayerModelLoaded] = useState(false);
    const playerRef = useRef(null); // Можно использовать для возврата ссылки

    useEffect(() => {
        if (!scene || !modelPath || !startPosData || !levelConfig) return;

        const loader = new GLTFLoader();
        let isMounted = true;
        setIsPlayerModelLoaded(false);

        loader.load(
            modelPath,
            (gltf) => {
                if (!isMounted || !scene) return;

                const player = gltf.scene;
                player.scale.set(75, 75, 75);
                player.rotation.order = 'ZXY';
                 // Твоя рабочая ротация
                 player.rotation.set(Math.PI / 2, 0, Math.PI);
                player.userData.isPlayer = true;

                const { gameWorldWidth, gameWorldHeight, WORLD_Y_OFFSET } = levelConfig;
                const startX_world = convertTiledX(startPosData.x, 0, gameWorldWidth);
                const startY_world = convertTiledY(startPosData.y, 0, gameWorldHeight, WORLD_Y_OFFSET);
                player.position.set(startX_world, startY_world, 0);

                player.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.depthWrite = true;
                        // child.castShadow = true;
                        // child.receiveShadow = true;
                    }
                });

                scene.add(player);
                playerRef.current = player; // Сохраняем в ref хука
                setPlayerObject(player);    // Сохраняем в состояние хука
                setIsPlayerModelLoaded(true);
                console.log("✅ Модель игрока загружена (через хук)");
            },
            undefined,
            (error) => {
                console.error(`❌ Ошибка загрузки игрока ${modelPath}:`, error);
                if (isMounted) setIsPlayerModelLoaded(true); // Считаем загрузку "завершенной" с ошибкой
            }
        );

        return () => {
            isMounted = false;
            // Очистка при размонтировании или смене зависимостей
            if (playerRef.current && scene && scene.children.includes(playerRef.current)) {
                 console.log("🧹 Очистка игрока (из хука)");
                 // Удаляем объект со сцены
                 scene.remove(playerRef.current);
                 // Очищаем ресурсы модели (геометрия, материалы)
                 playerRef.current.traverse(object => {
                      if (object.isMesh) {
                         object.geometry?.dispose();
                         if (object.material) {
                             if (Array.isArray(object.material)) {
                                 object.material.forEach(material => {
                                      material.map?.dispose();
                                      material.dispose();
                                 });
                             } else {
                                 object.material.map?.dispose();
                                 object.material.dispose();
                             }
                         }
                      }
                 });
            }
            playerRef.current = null;
            setPlayerObject(null);
        };
    // Зависимости: путь к модели, начальные данные, сцена, конфиг уровня
    }, [modelPath, startPosData, scene, levelConfig]);

    return { playerObject, isPlayerModelLoaded, playerRef };
};

export default usePlayerLoader;