// src/components/TransitionOverlay.jsx
import React, { useEffect, useRef } from 'react'; // Добавлен useRef из код1
import { motion, useAnimation } from 'framer-motion';
import './TransitionOverlay.scss'; // Убедитесь, что этот файл стилей существует или создайте его

const TransitionOverlay = ({
  playOpen,
  onOpenComplete,
  playClose,
  onCloseComplete,
  initialState = 'open' // 'open' или 'closed' - добавлено из код1
}) => {
  const leftControls = useAnimation();
  const rightControls = useAnimation();
  const hasPlayedInitialAnimation = useRef(false); // Добавлено из код1

  // Устанавливаем начальное неанимированное состояние (из код1)
  useEffect(() => {
    if (!hasPlayedInitialAnimation.current) {
      if (initialState === 'closed') {
        // console.log("TransitionOverlay: Initial state is CLOSED");
        leftControls.set({ x: '0%', opacity: 1 });
        rightControls.set({ x: '0%', opacity: 1 });
      } else { // 'open' or default
        // console.log("TransitionOverlay: Initial state is OPEN (off-screen)");
        // Это состояние также устанавливается через `initial` пропсы на motion.div ниже.
        // .set() здесь гарантирует это состояние, если initial пропсы будут изменены.
        leftControls.set({ x: '-100%', opacity: 1 });
        rightControls.set({ x: '100%', opacity: 1 });
      }
    }
  }, [initialState, leftControls, rightControls]); // hasPlayedInitialAnimation.current не включаем в зависимости,
                                                 // т.к. этот эффект должен реагировать на initialState ДО первой анимации


  // Анимация "закрытия" (шторки сходятся) - обновлено с учетом логики код1
  useEffect(() => {
    if (playClose) {
      hasPlayedInitialAnimation.current = true; // Добавлено из код1
      // console.log("TransitionOverlay: Playing CLOSE animation");
      const sequence = async () => {
        // Сначала убедимся, что они видимы, если вдруг были opacity:0 (из код1)
        await Promise.all([
            leftControls.start({ opacity: 1, transition: { duration: 0.01 } }),
            rightControls.start({ opacity: 1, transition: { duration: 0.01 } })
        ]);
        // Затем анимация закрытия
        await Promise.all([
          leftControls.start({ x: '0%', /* opacity: 1 уже установлено или анимируется */ transition: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } }),
          rightControls.start({ x: '0%', /* opacity: 1 уже установлено или анимируется */ transition: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } })
        ]);
        if (onCloseComplete) onCloseComplete();
      };
      sequence();
    }
  }, [playClose, leftControls, rightControls, onCloseComplete]);

  // Анимация "открытия" (шторки расходятся) - обновлено с учетом логики код1
  useEffect(() => {
    if (playOpen) {
      hasPlayedInitialAnimation.current = true; // Добавлено из код1
      // console.log("TransitionOverlay: Playing OPEN animation");
      const sequence = async () => {
        // Убедимся, что шторки в закрытом состоянии перед началом анимации открытия (из код1, также присутствовало в код2)
        await Promise.all([
            leftControls.start({ x: '0%', opacity: 1, transition: { duration: 0.01 } }),
            rightControls.start({ x: '0%', opacity: 1, transition: { duration: 0.01 } })
        ]);

        // Затем анимация открытия
        await Promise.all([
          leftControls.start({
            x: '-100%',
            opacity: 1, // opacity: 1 также было в код2
            transition: { duration: 0.7, ease: [0.6, 0.01, -0.05, 0.9] }
          }),
          rightControls.start({
            x: '100%',
            opacity: 1, // opacity: 1 также было в код2
            transition: { duration: 0.7, ease: [0.6, 0.01, -0.05, 0.9] }
          })
        ]);
        if (onOpenComplete) {
          onOpenComplete();
        }
      };
      sequence();
    }
  }, [playOpen, leftControls, rightControls, onOpenComplete]);

  return (
    <motion.div
      className="transition-overlay-container"
      style={{ // Стили из код2
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        pointerEvents: playOpen || playClose ? 'auto' : 'none', // Логика pointerEvents из код2
      }}
    >
      <motion.div
        className="shoji-screen left"
        // Начальное состояние из код2, соответствует 'open' из код1.
        // Будет переопределено useEffect для initialState, если initialState === 'closed'.
        initial={{ x: '-100%', opacity: 1 }}
        animate={leftControls}
        // стили для .shoji-screen.left должны быть определены в TransitionOverlay.scss
        // например: { position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', backgroundColor: 'black' }
      />
      <motion.div
        className="shoji-screen right"
        // Начальное состояние из код2, соответствует 'open' из код1.
        initial={{ x: '100%', opacity: 1 }}
        animate={rightControls}
        // стили для .shoji-screen.right должны быть определены в TransitionOverlay.scss
        // например: { position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', backgroundColor: 'black' }
      />
    </motion.div>
  );
};

export default TransitionOverlay;