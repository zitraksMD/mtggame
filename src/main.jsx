// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <--- 1. Импортируйте BrowserRouter
import App from './app.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode> // StrictMode не влияет на эту ошибку, но лучше его вернуть для разработки
  <BrowserRouter> {/* <--- 2. Оберните App */}
    <App />
  </BrowserRouter>
  // </React.StrictMode>
);