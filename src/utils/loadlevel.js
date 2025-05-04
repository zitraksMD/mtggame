export async function loadLevel(levelName) {
    try {
      const response = await fetch(`/levels/${levelName}.json`); // Загружаем из `dist/levels`
      if (!response.ok) throw new Error(`Ошибка загрузки: ${response.statusText}`);
  
      const levelData = await response.json();
      return levelData;
    } catch (error) {
      console.error("❌ Ошибка загрузки уровня:", error);
      return null;
    }
  }
  