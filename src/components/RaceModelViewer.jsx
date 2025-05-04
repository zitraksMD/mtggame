// src/components/RaceModelViewer.jsx
import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Внутренний компонент для модели
function Model({ modelPath }) {
  const group = useRef();
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, group);

  // --- !!! НАСТРОЙКИ МОДЕЛИ ДЛЯ ПЕРСПЕКТИВЫ !!! ---
  // Масштаб скорее всего нужно будет УМЕНЬШИТЬ по сравнению с ортографической
  const scale = 5.3;     // <<<--- НАЧНИ С 1.0 И ПОДБИРАЙ
  // Смещение по Y, чтобы ноги были примерно на уровне пола сцены (0)
  const positionY = 0; // <<<--- ПОДБЕРИ ЭТО ЗНАЧЕНИЕ (обычно около половины высоты модели со знаком минус)

  useEffect(() => {
    // --- Логика запуска Idle анимации (остается как есть) ---
    const idleAction = Object.values(actions).find(
        action => action.getClip().name.toLowerCase().includes('idle')
    );
    let actionToPlay = idleAction || Object.values(actions)[0];
    if (actionToPlay) { actionToPlay.reset().fadeIn(0.5).play(); }
    else { console.warn(`No animations found in ${modelPath}.`); }
    return () => { if(actionToPlay) actionToPlay.fadeOut(0.5); };
  }, [actions, modelPath]);

  return (
    <primitive
      ref={group}
      object={scene}
      scale={scale}
      position={[0, positionY, 0]}
      rotation={[0, 2*Math.PI, 0]} // <<<--- ИЗМЕНИ ЗНАЧЕНИЕ ЗДЕСЬ
      // [X, Y, Z] - Поворот по Y на Math.PI радиан (это 180 градусов)
    />
  );
}

// Основной компонент вьювера
const RaceModelViewer = ({ modelPath }) => {
  return (
    <Canvas
      // --- !!! УБРАЛИ orthographic, НАСТРОИЛИ ПЕРСПЕКТИВНУЮ КАМЕРУ !!! ---
      camera={{
          position: [0, 0.5, 6], // <<<--- Позиция камеры: чуть выше центра (Y=0.5), на расстоянии 3 по Z. ПОДБЕРИ значения!
          fov: 55                 // <<<--- Угол обзора (Field of View). 50-75 обычно нормально.
      }}
      // --- !!! ---
      style={{
           width: '100%',        // Размеры области рендера
           height: '100%',
           background: 'transparent', // <<<--- УБРАЛИ ФОН СТИЛЕМ
           borderRadius: '5px',
           touchAction: 'none'
       }}
    >
      {/* Освещение */}
      <ambientLight intensity={2.0} /> {/* Keep ambient as is, or maybe slightly increase to 2.2 */}
<directionalLight position={[5, 10, 7]} intensity={5} /> {/* <<< INCREASED from 1.5 */}
<directionalLight position={[-5, -5, -5]} intensity={5} /> {/* <<< INCREASED from 0.4 */}

      {/* Модель */}
      <Suspense fallback={null}> {/* Показывает заглушку, пока модель грузится */}
        <Model modelPath={modelPath} />
      </Suspense>
    </Canvas>
  );
};

export default RaceModelViewer;