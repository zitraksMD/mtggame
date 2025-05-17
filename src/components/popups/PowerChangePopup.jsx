// Simplified PowerChangePopup for testing visibility animation ONLY
import React, { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import "./PowerChangePopup.scss";

const popupVariants = {
  // Начальное состояние (до появления) и конечное (при исчезновении)
  hidden: {
    opacity: 0,   // Невидимый
    scale: 0.95,  // Немного уменьшен
    y: -10        // Чуть выше центральной точки (относительное смещение)
  },
  // Состояние, когда видим
  visible: {
    opacity: 1,   // Видимый
    scale: 1,     // Нормальный размер
    y: 0,         // В центральной точке (относительное смещение 0)
    transition: { duration: 0.3, ease: "easeOut" } // Параметры анимации появления
  },
  // Состояние для анимации исчезновения
  exit: {
    opacity: 0,   // Невидимый
    scale: 0.95,  // Немного уменьшен
    y: 10,        // Чуть ниже центральной точки
    transition: { duration: 0.2, ease: "easeIn" } // Параметры анимации исчезновения (0.2 сек = 200 мс)
  }
};

const PowerChangePopup = ({ oldPower, newPower, onClose }) => {
    const [visible, setVisible] = useState(true);
    const diff = newPower - oldPower;
    const isGain = diff > 0;
    const diffDisplay = `<span class="math-inline">\{isGain ? "\+" \: ""\}</span>{diff}`;

    useEffect(() => {
        console.log("Simple Popup Effect RUNNING");
        const visibleDuration = 1500; // How long it stays fully visible
        const exitAnimationDuration = (popupVariants.exit.transition.duration || 0.2) * 1000;

        const visibilityTimer = setTimeout(() => {
            console.log("Simple Popup: Setting visible = false");
            setVisible(false);
        }, visibleDuration);

        const closeTimer = setTimeout(() => {
            console.log("Simple Popup: Calling onClose");
            onClose?.();
        }, visibleDuration + exitAnimationDuration);

        return () => {
            console.log("Simple Popup Effect CLEANUP");
            clearTimeout(visibilityTimer);
            clearTimeout(closeTimer);
        };
    }, [onClose]); // Only depend on stable onClose

    return (
         <motion.div
            className={`power-change-popup ${isGain ? "gain" : "loss"}`}
            variants={popupVariants}
            initial="hidden"
            animate={visible ? "visible" : "exit"}
         >
             <span className="power-icon">⚡️</span>
             <span className="power-label">Power:</span>
             <span className="power-value current">{newPower}</span> {/* Static number */}
             {diff !== 0 && ( <span className={`power-diff ${isGain ? "gain" : "loss"}`}> ({diffDisplay}) </span> )}
         </motion.div>
    );
};
export default PowerChangePopup;