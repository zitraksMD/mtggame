// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.jsx';
import { TelegramProvider } from './context/TelegramProvider'; // <--- 1. Импортируем провайдер

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <BrowserRouter>
    {/* ▼▼▼ 2. Оборачиваем App в TelegramProvider ▼▼▼ */}
    <TelegramProvider>
      <App />
    </TelegramProvider>
    {/* ▲▲▲---------------------------------------▲▲▲ */}
  </BrowserRouter>
  // </React.StrictMode>
);