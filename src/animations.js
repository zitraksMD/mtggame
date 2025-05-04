// src/animations.js
export const pageVariants = {
    initial: {
      opacity: 0,
      clipPath: "inset(0% 50% 0% 50%)" // Обрезка до центральной линии
    },
    in: {
      opacity: 1,
      clipPath: "inset(0% 0% 0% 0%)"    // Полностью видимый
    },
    out: {
      opacity: 0,
      clipPath: "inset(0% 50% 0% 50%)" // Обрезка до центральной линии
    }
  };
  
  export const pageTransition = {
    type: "tween",
    ease: "easeInOut", // Попробуйте "circOut" или "linear" если "easeInOut" глючит
    duration: 0.5 // Оставим чуть дольше для теста
  };