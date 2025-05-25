// src/components/BottomNav.jsx
import React from "react";
import { NavLink } from 'react-router-dom';
import "./BottomNav.scss"; // Убедитесь, что стили подключены

const BottomNav = () => {
  // ▼▼▼ Обновленный список ссылок для навбара ▼▼▼
  const navLinks = [
    { path: "/shop", icon: "/assets/icon-shop.png", label: "Shop", alt: "Shop" },
    { path: "/inventory", icon: "/assets/icon-equipment.png", label: "Gear", alt: "Gear & Inventory" }, // Раньше /inventory, можно оставить или сменить на /gear. Иконка от инвентаря. Кузня теперь доступна отсюда.
    { path: "/main", icon: "/assets/icon-play.png", label: "Campaign", alt: "Campaign / Play" }, // Раньше /main. Это теперь основная кнопка "Бой".
    { path: "/glory", icon: "/assets/achievement-icon.png", label: "Glory", alt: "Glory (Achievements & Tasks)" }, // Объединяет достижения и задания.
    { path: "/events", icon: "/assets/icon-events.png", label: "Events", alt: "Events" }, // Раньше /discovery. Иконка от discovery.
    { path: "/alliance", icon: "/assets/icon-alliance-placeholder.png", label: "Alliance", alt: "Alliance Center (Referrals, Friends)" }, // Новый пункт. Нужна новая иконка.
  ];
  // ▲▲▲-------------------------------------------------▲▲▲

  // Определяем, какой путь является "главным" для точного совпадения NavLink
  const mainGamePath = "/campaign"; // Предполагаем, что "/campaign" теперь главный игровой экран

  return (
    <nav className="bottom-nav">
      {navLinks.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          title={link.alt} // Подсказка для десктопа
          // `end` используется для того, чтобы NavLink был активен только при точном совпадении пути,
          // что обычно нужно для "домашней" или главной ссылки.
          end={link.path === mainGamePath}
        >
          {/* Иконка */}
          {/* TODO: Замените пути к иконкам на актуальные для вашего проекта */}
          <img src={link.icon} alt="" className="nav-icon" /> {/* alt можно оставить пустым для декоративных иконок, если есть label */}

          {/* Подпись под иконкой */}
          <span className="nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;