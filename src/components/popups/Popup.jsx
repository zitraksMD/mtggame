// src/components/Popup.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Popup.scss'; // Подключим стили

// Анимации для появления/исчезновения
const backdropVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const popupVariants = {
  hidden: { y: "-50px", opacity: 0, scale: 0.9 },
  visible: { y: "0px", opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { y: "50px", opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};


const Popup = ({ title, children, onClose }) => {

  // Закрытие по нажатию Esc
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]); // Зависимость от onClose

  return (
    // AnimatePresence нужен для анимации при удалении компонента
    <AnimatePresence>
        {/* Фон-затемнение */}
        <motion.div
            className="popup-backdrop"
            onClick={onClose} // Закрытие по клику на фон
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden" // Анимация при закрытии
        >
            {/* Само окно */}
            <motion.div
                className="popup-box"
                onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике внутри окна
                variants={popupVariants}
                initial="hidden"
                animate="visible"
                exit="exit" // Анимация при закрытии
            >
                {/* Шапка окна */}
                <div className="popup-header">
                    <h3 className="popup-title">{title || 'Окно'}</h3>
                    <button className="popup-close-button" onClick={onClose} aria-label="Закрыть">
                        &times; {/* Крестик */}
                    </button>
                </div>

                {/* Контент окна */}
                <div className="popup-content">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default Popup;