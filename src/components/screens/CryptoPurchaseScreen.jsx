import React, { useState } from 'react';
import './CryptoPurchaseScreen.scss';

// Placeholder icons (в идеале использовать SVG или библиотеку иконок)
const BackArrowIcon = () => <span>&larr;</span>;
const SwapIcon = () => <span>&#8644;</span>;
const PlusIcon = () => <span>+</span>;
const MinusIcon = () => <span>-</span>;
const EthereumIcon = () => <span className="icon ethereum-icon">Ξ</span>; // Простой символ ETH
const VisaIcon = () => <span className="icon visa-icon">VISA</span>; // Текстовый placeholder
const RightArrowIcon = () => <span>&gt;</span>;
const BackspaceIcon = () => <span>&#9003;</span>;


const CryptoPurchaseScreen = () => {
  const [inputValue, setInputValue] = useState('0');

  const handleKeyPress = (key) => {
    if (key === 'Backspace') {
      setInputValue(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
    } else if (key === '.' && inputValue.includes('.')) {
      return;
    } else if (inputValue === '0' && key !== '.') {
      setInputValue(key);
    } else {
      setInputValue(prev => prev + key);
    }
  };

  const keypadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'Backspace'
  ];

  return (
    <div className="crypto-purchase-screen">
      <header className="screen-header">
        <button className="icon-button back-button">
          <BackArrowIcon />
        </button>
        <div className="buy-toggle">
          <button className="toggle-button active"><PlusIcon /> Купити</button>
          <button className="toggle-button"><MinusIcon /></button>
          <button className="icon-button"><SwapIcon /></button>
        </div>
        <div className="header-placeholder"></div> {/* Для выравнивания */}
      </header>

      <main className="screen-content">
        <div className="amount-display-container">
          <div className="amount-display">
            <span className="amount-value">{inputValue}</span>
            <span className="currency-label">ETH</span>
          </div>
          <div className="amount-actions">
            <button className="max-button">Max</button>
            <button className="icon-button swap-main-button"><SwapIcon /></button>
          </div>
        </div>

        <div className="payment-options">
          <div className="payment-option">
            <div className="option-icon-name">
              <EthereumIcon />
              <div className="option-text">
                <span className="option-title">Купити</span>
                <span className="option-subtitle">Ethereum</span>
              </div>
            </div>
            <div className="option-details">
              <span className="option-value">0 ETH</span>
              <RightArrowIcon />
            </div>
          </div>
          <div className="payment-option">
            <div className="option-icon-name">
              <VisaIcon />
              <div className="option-text">
                <span className="option-title">Оплатити за допомогою</span>
                <span className="option-subtitle">Card 1</span>
              </div>
            </div>
            <div className="option-details">
              <RightArrowIcon />
            </div>
          </div>
        </div>

        <div className="keypad">
          {keypadButtons.map((key) => (
            <button
              key={key}
              className="keypad-button"
              onClick={() => handleKeyPress(key === 'Backspace' ? 'Backspace' : key)}
            >
              {key === 'Backspace' ? <BackspaceIcon /> : key}
            </button>
          ))}
        </div>
      </main>

      <footer className="screen-footer">
        <button className="continue-button">Продовжити</button>
      </footer>
    </div>
  );
};

export default CryptoPurchaseScreen;