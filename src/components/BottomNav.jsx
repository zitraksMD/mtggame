// src/components/BottomNav.jsx
import React from "react";
import { NavLink } from 'react-router-dom';
import "./BottomNav.scss"; // Подключаем стили

const BottomNav = () => {
  // ▼▼▼ Добавляем свойство 'label' для каждой ссылки ▼▼▼
  const navLinks = [
    { path: "/shop", icon: "/assets/icon-shop.png", label: "Магазин", alt: "Магазин" },
    { path: "/inventory", icon: "/assets/icon-inventory.png", label: "Сумка", alt: "Инвентарь" },
    { path: "/forge", icon: "/assets/forge-icon.png", label: "Кузня", alt: "Кузница" },
    { path: "/main", icon: "/assets/icon-play.png", label: "Бой", alt: "Играть" },
    { path: "/achievements", icon: "/assets/achievement-icon.png", label: "Задания", alt: "Достижения" },
    { path: "/discovery", icon: "/assets/icon-discovery.png", label: "Discovery", alt: "Discovery" }, 
  ];
  // ▲▲▲--------------------------------------------▲▲▲

  return (
    <nav className="bottom-nav">
      {navLinks.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          title={link.alt} // Добавляем title для подсказки на десктопе
          // end={link.path === '/main'} // Раскомментируйте, если /main - главный путь
        >
          {/* Иконка */}
          <img src={link.icon} alt="" className="nav-icon" /> {/* alt можно оставить пустым */}

          {/* ▼▼▼ Добавляем подпись под иконкой ▼▼▼ */}
          <span className="nav-label">{link.label}</span>
          {/* ▲▲▲---------------------------▲▲▲ */}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;