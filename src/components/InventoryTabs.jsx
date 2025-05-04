// src/components/InventoryTabs.jsx
import React from 'react';

// Принимает активный таб, функцию для смены и опционально позицию
const InventoryTabs = ({ activeTab, setActiveTab, position = 'middle' }) => {
  const isTop = position === 'top';
  const baseClass = "inventory-tabs";
  const positionClass = isTop ? "inventory-tabs-top" : "inventory-tabs-middle";

  return (
    // Применяем разные классы в зависимости от позиции
    <div className={`${baseClass} ${positionClass}`}>
      <button
        className={activeTab === "stats" ? "active" : ""}
        onClick={() => setActiveTab("stats")}
      >
        Stats
      </button>
      <button
        className={activeTab === "gear" ? "active" : ""}
        onClick={() => setActiveTab("gear")}
      >
        Gear
      </button>
      <button
        className={activeTab === "artifacts" ? "active" : ""}
        onClick={() => setActiveTab("artifacts")}
      >
        Artifacts
      </button>
    </div>
  );
};

export default InventoryTabs;