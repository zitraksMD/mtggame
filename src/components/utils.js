// src/components/utils.js

// Добавляем 'export' перед каждой функцией/константой

export const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export const DEFAULT_WORLD_WIDTH = 1200;
export const DEFAULT_WORLD_HEIGHT = 1200;

export const convertTiledX = (x, width = 0, gameWorldWidth = DEFAULT_WORLD_WIDTH) => {
    return x - gameWorldWidth / 2 + width / 2;
};

export const convertTiledY = (y, height = 0, gameWorldHeight = DEFAULT_WORLD_HEIGHT, worldYOffset = gameWorldHeight / 2) => {
    // Убедимся, что используем переданный worldYOffset, если он есть
    const effectiveWorldYOffset = worldYOffset !== undefined ? worldYOffset : gameWorldHeight / 2;
    return gameWorldHeight - y - height / 2 - effectiveWorldYOffset;
};

export const checkCollision = (rect1, rect2) => {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
};