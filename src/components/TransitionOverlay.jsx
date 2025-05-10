// src/components/TransitionOverlay.jsx
import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './TransitionOverlay.scss'; // Убедитесь, что этот файл стилей существует или создайте его

const TransitionOverlay = ({ playOpen, onOpenComplete, playClose, onCloseComplete }) => {
  const leftControls = useAnimation();
  const rightControls = useAnimation();

  // Анимация "закрытия" (шторки сходятся) - из код1
  useEffect(() => {
    if (playClose) {
      // console.log("TransitionOverlay: Playing CLOSE animation");
      const sequence = async () => {
        await Promise.all([
          leftControls.start({ x: '0%', opacity: 1, transition: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } }),
          rightControls.start({ x: '0%', opacity: 1, transition: { duration: 0.6, ease: [0.6, 0.01, -0.05, 0.9] } })
        ]);
        if (onCloseComplete) onCloseComplete();
      };
      sequence();
    }
  }, [playClose, leftControls, rightControls, onCloseComplete]);

  // Анимация "открытия" (шторки расходятся) - из код1, адаптировано для структуры код2
  useEffect(() => {
    if (playOpen) {
      // console.log("TransitionOverlay: Playing OPEN animation");
      const sequence = async () => {
        // Убедимся, что шторки в закрытом состоянии перед началом анимации открытия
        // (если они не были закрыты через playClose или это первый рендер с playOpen=true)
        // Используем set для мгновенного применения, если они не в целевом состоянии для начала открытия.
        // Или можно анимировать к закрытому состоянию очень быстро, как в код1.
        // Для большей согласованности с код1, используем start с короткой длительностью.
        // Это также полезно, если playOpen=true при первоначальной загрузке,
        // а initial={{ x: '-100%' }} установлен, то они сначала "прыгнут" в центр, потом разойдутся.
        // Если initial={{ x: '0%' }} (как было в код2), то этот шаг не так критичен для первоначального открытия.
        // Однако, для консистентности с логикой "закрытие перед открытием" из код1, оставим.
        await Promise.all([
            leftControls.start({ x: '0%', opacity: 1, transition: { duration: 0.01 } }), // Мгновенно закрыть, если не закрыты
            rightControls.start({ x: '0%', opacity: 1, transition: { duration: 0.01 } })
        ]);

        // Затем анимация открытия
        await Promise.all([
          leftControls.start({
            x: '-100%',
            opacity: 1,
            transition: { duration: 0.7, ease: [0.6, 0.01, -0.05, 0.9] }
          }),
          rightControls.start({
            x: '100%',
            opacity: 1,
            transition: { duration: 0.7, ease: [0.6, 0.01, -0.05, 0.9] }
          })
        ]);
        if (onOpenComplete) {
          onOpenComplete();
        }
      };
      sequence();
    }
    // Если playOpen=false и playClose не активен, шторки должны оставаться в своем последнем состоянии
    // или вернуться в "открытое" начальное состояние (за экраном),
    // если не предполагается, что они будут закрываться без playClose.
    // Код1 не имел явного 'else' здесь, он полагался на initial state и playClose.
    // Код2 устанавливал их в '0%' (закрыто), если playOpen=false.
    // Для сохранения функциональности обеих анимаций, мы не будем добавлять 'else' здесь,
    // состояние контролируется playOpen и playClose.
    // Начальное состояние определяется `initial` у `motion.div`.

  }, [playOpen, leftControls, rightControls, onOpenComplete]);

  return (
    <motion.div
      className="transition-overlay-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        // pointerEvents из код1, чтобы блокировать взаимодействие во время перехода
        pointerEvents: playOpen || playClose ? 'auto' : 'none',
      }}
    >
      <motion.div
        className="shoji-screen left"
        // Начальное состояние из код1 - за экраном.
        // Анимации playOpen/playClose приведут их в нужное положение.
        initial={{ x: '-100%', opacity: 1 }}
        animate={leftControls}
        // стили для .shoji-screen.left должны быть определены в TransitionOverlay.scss
        // например: { position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', backgroundColor: 'black' }
      />
      <motion.div
        className="shoji-screen right"
        // Начальное состояние из код1 - за экраном.
        initial={{ x: '100%', opacity: 1 }}
        animate={rightControls}
        // стили для .shoji-screen.right должны быть определены в TransitionOverlay.scss
        // например: { position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', backgroundColor: 'black' }
      />
    </motion.div>
  );
};

export default TransitionOverlay;