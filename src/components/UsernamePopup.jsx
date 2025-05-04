import React, { useState, useEffect } from "react";
import useGameStore from "../store/useGameStore";
import "./UsernamePopup.scss";

const UsernamePopup = () => {
  const { username, setUsername } = useGameStore();
  const [input, setInput] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Показать попап, если имени нет
    if (!username) {
      setIsVisible(true);
    }
  }, [username]);

  const handleSave = () => {
    if (input.trim()) {
      setUsername(input.trim());
      localStorage.setItem("username", input.trim());
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="username-popup">
      <div className="popup-content">
        <h2>Введите ваш никнейм</h2>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ваш ник..."
        />
        <button onClick={handleSave}>Сохранить</button>
      </div>
    </div>
  );
};

export default UsernamePopup;
