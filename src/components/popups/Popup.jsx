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


const Popup = ({ title, children, onClose, bannerStyle  }) => {

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
    <AnimatePresence>
        <motion.div
            className="popup-backdrop" // Этот div центрирует .popup-box
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
            <motion.div
                // Добавляем класс, если title должен быть в стиле баннера
                className={`popup-box ${bannerStyle ? 'has-banner-header' : ''}`} 
                onClick={(e) => e.stopPropagation()}
                variants={popupVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Шапка окна - теперь ее рендеринг зависит от title */}
                {title && (
                    <div className="popup-header"> {/* .popup-header получит доп. стили от .has-banner-header */}
                        <h3 className="popup-title">{title}</h3>
                    </div>
                )}
                
                {/* Кнопка закрытия всегда есть и позиционируется абсолютно */}
                <button className="popup-close-button" onClick={onClose} aria-label="Закрыть">
                    &times;
                </button>

                <div className="popup-content">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default Popup;