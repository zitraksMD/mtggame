// src/components/BottomNav.jsx
import React, { useEffect } from "react"; // <<< --- ДОБАВЬТЕ useEffect ЗДЕСЬ
import { NavLink } from 'react-router-dom';
import "./BottomNav.scss"; // Убедитесь, что стили подключены


// ▼▼▼ КОМПОНЕНТ ТЕПЕРЬ ПРИНИМАЕТ ПРОП showForgeIndicator ▼▼▼
const BottomNav = ({ showForgeIndicator }) => {
  // ▼▼▼ Обновленный список ссылок для навбара ▼▼▼
  const navLinks = [
    { path: "/shop", icon: "/assets/icon-shop.png", label: "Shop", alt: "Shop" },
    // ▼▼▼ Для "Gear" добавляем hasIndicator, использующий проп showForgeIndicator ▼▼▼
    { path: "/inventory", icon: "/assets/icon-equipment.png", label: "Gear", alt: "Gear & Inventory", hasIndicator: showForgeIndicator },
    { path: "/main", icon: "/assets/icon-play.png", label: "Campaign", alt: "Campaign / Play" },
    { path: "/glory", icon: "/assets/achievement-icon.png", label: "Glory", alt: "Glory (Achievements & Tasks)" },
   { path: "/discovery", icon: "/assets/icon-events.png", label: "Events", alt: "Events" },
    { path: "/alliance", icon: "/assets/icon-alliance-placeholder.png", label: "Alliance", alt: "Alliance Center (Referrals, Friends)" },
  ];
  // ▲▲▲-----------------------------------------------------------------------▲▲▲
  // Для отладки:
  useEffect(() => {
    console.log('[BottomNav.jsx] received showForgeIndicator:', showForgeIndicator);
  }, [showForgeIndicator]); 
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
          title={link.alt}
          end={link.path === mainGamePath}
        >
          {/* ▼▼▼ Добавляем обертку для иконки и индикатора ▼▼▼ */}
          <div className="nav-item-content-wrapper">
            <img src={link.icon} alt="" className="nav-icon" />
            {/* Условное отображение индикатора */}
            {link.hasIndicator && <span className="nav-item-indicator">!</span>}
          </div>
          {/* ▲▲▲------------------------------------------▲▲▲ */}
          
          {/* Подпись под иконкой */}
          <span className="nav-label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;