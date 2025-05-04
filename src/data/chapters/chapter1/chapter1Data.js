// src/data/chapters/chapter1/chapter1Data.js

const chapterData = {
    id: 1,
    name: "Глава 1: Начало",
    image: "/assets/chapter1.png", // Картинка для MainMenu
    imageWidth: 1200,
    imageHeight: 900,
    initialView: { x: -50, y: -200 },

    // Массив уровней ДЛЯ КАРТЫ в MainMenu
    levels: [
        // VVV ИСПРАВЬ ID ЗДЕСЬ VVV
        { id: 101, name: "Ур. 1-1", x: 250, y: 500, nodeSize: 40 }, // БЫЛО: id: 1
        { id: 102, name: "Ур. 1-2", x: 450, y: 580, nodeSize: 40 }, // БЫЛО: id: 2
        { id: 103, name: "Ур. 1-3", x: 680, y: 620, nodeSize: 40 }, // БЫЛО: id: 3
        { id: 104, name: "Ур. 1-4", x: 800, y: 500, nodeSize: 40 }, // БЫЛО: id: 4
        { id: 105, name: "Ур. 1-5", x: 950, y: 400, nodeSize: 40 }, // БЫЛО: id: 5
        { id: 106, name: "Ур. 1-6", x: 750, y: 350, nodeSize: 40 }, // БЫЛО: id: 6
        { id: 107, name: "Ур. 1-7", x: 550, y: 280, nodeSize: 40 }, // БЫЛО: id: 7
        { id: 108, name: "Ур. 1-8", x: 400, y: 180, nodeSize: 40 }, // БЫЛО: id: 8
        { id: 109, name: "Ур. 1-9", x: 600, y: 150, nodeSize: 40 }, // БЫЛО: id: 9
        { id: 110, name: "Ур. 1-10", x: 850, y: 180, nodeSize: 50 }, // БЫЛО: id: 10
        // ^^^ Убедись, что эти ID соответствуют именам файлов в public/data/levels/ ^^^
    ]
};

export default chapterData;