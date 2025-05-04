import React from 'react';
import { motion } from 'framer-motion';
import './LoadingScreen.scss'; // Создайте стили для экрана загрузки

const LoadingScreen = ({ message = "Загрузка..." }) => {
  return (
    <motion.div
      key="loading-screen" // Ключ для AnimatePresence
      className="loading-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2>{message}</h2>
    </motion.div>
  );
};

export default LoadingScreen;