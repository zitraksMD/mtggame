import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './MailDetailPopup.scss';

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    // Для <AnimatePresence> exit тоже должен быть здесь, если оверлей должен анимированно исчезать
    // exit: { opacity: 0, transition: { duration: 0.2 } } // Добавим, чтобы было симметрично
};

const modalVariants = {
    hidden: { y: "100vh", opacity: 0, scale: 0.7 }, // Начальное состояние (когда скрыт или перед появлением)
    visible: { // Активное состояние (когда виден)
        y: "0", 
        opacity: 1, 
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: { // Состояние при удалении из DOM (анимация закрытия)
        y: "100vh", // Уезжает вниз
        opacity: 0, 
        scale: 0.7, 
        transition: { duration: 0.3, ease: "easeIn" } // Немного изменил ease для закрытия
    }
};

const MailDetailPopup = ({ mail, onClose, onClaim, onDelete }) => {
    // if (!mail) return null; // Это условие теперь обрабатывается AnimatePresence

    return (
        // AnimatePresence будет отслеживать появление/исчезновение дочернего элемента,
        // который имеет prop `key` и условный рендеринг (в данном случае, `mail && (...)`)
        <AnimatePresence 
          // mode="wait" // не нужен здесь, если только один элемент анимируется
          onExitComplete={() => { /* Можно что-то сделать после завершения анимации закрытия */}}
        > 
            {mail && ( // Ключевое условие: рендерим, только если `mail` существует
                <motion.div
                    key="mailDetailOverlay" // Уникальный ключ для AnimatePresence
                    className="mail-detail-popup-overlay"
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden" // <<< ВАЖНО: Используем 'hidden' для exit, чтобы оверлей исчез
                                  // или можно определить отдельный exit вариант для backdropVariants
                    onClick={onClose}
                >
                    <motion.div
                        key="mailDetailContent" // Уникальный ключ (хотя для вложенных не всегда строго нужен, если родитель имеет key)
                        className="mail-detail-popup-content"
                        variants={modalVariants}
                        initial="hidden"  // Применяем `hidden` из modalVariants
                        animate="visible" // Применяем `visible` из modalVariants
                        exit="exit"      // <<< ВАЖНО: Применяем `exit` из modalVariants
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ... остальное содержимое поп-апа ... */}
                        <div className="mail-detail-header">
                            <h3 className="mail-detail-title-text">{mail.title}</h3>
                            <button onClick={onClose} className="mail-detail-close-btn" aria-label="Закрыть письмо">
                                &times;
                            </button>
                        </div>
                        <div className="mail-detail-meta">
                            <span><strong>От:</strong> {mail.sender}</span>
                            <span><strong>Дата:</strong> {mail.date}</span>
                        </div>
                        <hr className="mail-detail-separator" />
                        <div className="mail-detail-body">
                            {mail.message.split('\n').map((paragraph, index) => (
                                <p key={index}>{paragraph || '\u00A0'}</p>
                            ))}
                        </div>
                        <div className="mail-detail-actions">
                            {mail.rewardType && !mail.claimed && (
                                <button
                                    onClick={() => onClaim(mail.id)}
                                    className="mail-action-button-detail claim-one"
                                >
                                    <span role="img" aria-label="Награда">🎁</span> Забрать ({mail.rewardAmount} {mail.rewardType})
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(mail.id)}
                                className="mail-action-button-detail delete-one"
                            >
                                <span role="img" aria-label="Удалить">🗑️</span> Удалить
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MailDetailPopup;