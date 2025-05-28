// src/components/InventoryTabs.jsx
import React from 'react';

// Принимает активный таб, функцию для смены, опционально позицию,
// и НОВЫЙ ПРОП showArtifactsActionIndicator
const InventoryTabs = ({ 
    activeTab, 
    setActiveTab, 
    position = 'middle', 
    showArtifactsActionIndicator // <<< НОВЫЙ ПРОП
}) => {
    const isTop = position === 'top';
    const baseClass = "inventory-tabs";
    const positionClass = isTop ? "inventory-tabs-top" : "inventory-tabs-middle";

    // Для отладки (можно удалить позже)
    // React.useEffect(() => {
    //   console.log('[InventoryTabs] showArtifactsActionIndicator:', showArtifactsActionIndicator);
    // }, [showArtifactsActionIndicator]);

    return (
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
                {/* Если у вас будет индикатор и для Gear, логика будет аналогичной */}
            </button>
            <button
                className={activeTab === "artifacts" ? "active" : ""}
                onClick={() => setActiveTab("artifacts")}
            >
                Artifacts
                {/* === НОВЫЙ ИНДИКАТОР ДЛЯ ВКЛАДКИ ARTIFACTS === */}
                {showArtifactsActionIndicator && <span className="tab-action-indicator">!</span>}
            </button>
        </div>
    );
};

export default InventoryTabs;