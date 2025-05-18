// src/components/popups/TonExchangePopup.jsx (или TonExchangePopupInternalContent.jsx)

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore, { TON_SHARD_TO_TON_EXCHANGE_RATE } from '../../store/useGameStore';
import './TonExchangePopup.scss'; // Стили

// Иконка стрелок
const SwapArrowsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 4L17 20L13 16" />
        <path d="M7 20L7 4L11 8" />
    </svg>
);

const TonExchangePopupInternalContent = ({ onClose }) => {
    const {
        toncoinShards,
        toncoinBalance,
        exchangeShardsToTon,
        requestToncoinWithdrawal, // Предполагаем, что эта функция есть в useGameStore
    } = useGameStore(state => ({
        toncoinShards: state.toncoinShards,
        toncoinBalance: state.toncoinBalance,
        exchangeShardsToTon: state.exchangeShardsToTon,
        requestToncoinWithdrawal: state.requestToncoinWithdrawal,
    }));

    const [activeTab, setActiveTab] = useState('exchange');

    // Состояния для вкладки "Обмен"
    const [shardsToExchange, setShardsToExchange] = useState('');
    const [realToncoinToReceive, setRealToncoinToReceive] = useState(0);
    const [isShardInputInvalid, setIsShardInputInvalid] = useState(false);
    const MIN_SHARDS_FOR_EXCHANGE = 10;

    // Состояния для вкладки "Вывод"
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [isWithdrawAmountInvalid, setIsWithdrawAmountInvalid] = useState(false);
    const [withdrawAmountErrorMessage, setWithdrawAmountErrorMessage] = useState('');
    const MIN_TON_FOR_WITHDRAWAL = 1; // Минимальная сумма TON для вывода

    // --- Логика для вкладки "Обмен" ---
    useEffect(() => {
        if (activeTab !== 'exchange') return; // Выполнять только если активна вкладка обмена

        const shards = parseInt(shardsToExchange, 10);
        if (!isNaN(shards) && shards > 0 && TON_SHARD_TO_TON_EXCHANGE_RATE > 0) {
            setRealToncoinToReceive(parseFloat((shards / TON_SHARD_TO_TON_EXCHANGE_RATE).toFixed(1)));
        } else {
            setRealToncoinToReceive(0);
        }

        if (shardsToExchange === '' || isNaN(shards)) {
            setIsShardInputInvalid(false);
        } else {
            setIsShardInputInvalid(shards < MIN_SHARDS_FOR_EXCHANGE || !Number.isInteger(parseFloat(shardsToExchange)));
        }
    }, [shardsToExchange, TON_SHARD_TO_TON_EXCHANGE_RATE, activeTab]);

    const handleShardsInputChange = (e) => {
        const inputValue = e.target.value;
        if (/^\d*$/.test(inputValue)) {
            setShardsToExchange(inputValue);
        }
    };

    const handleExchange = useCallback(async () => {
        const shardsRaw = parseFloat(shardsToExchange);
        if (!Number.isInteger(shardsRaw)) {
            alert("The number of Toncoin Shards must be an integer.");
            return;
        }
        const shards = parseInt(shardsToExchange, 10);
        if (isNaN(shards) || shards <= 0) {
            alert("Enter the correct number of Toncoin Shards.");
            return;
        }
        if (shards < MIN_SHARDS_FOR_EXCHANGE) {
            alert(`Min. anount for convert: ${MIN_SHARDS_FOR_EXCHANGE} Toncoin Shards.`);
            return;
        }
        if (shards > toncoinShards) {
            alert("Not enough TON to convert.");
            return;
        }
        const result = exchangeShardsToTon(shards);
        alert(result.message);
        if (result.success) {
            setShardsToExchange('');
        }
    }, [shardsToExchange, toncoinShards, exchangeShardsToTon]);

    // --- Логика для вкладки "Вывод" ---
    useEffect(() => {
        if (activeTab !== 'withdraw') return; // Выполнять только если активна вкладка вывода

        const amount = parseFloat(withdrawAmount);
        setWithdrawAmountErrorMessage(''); // Сброс сообщения об ошибке по умолчанию

        if (withdrawAmount === '') {
            setIsWithdrawAmountInvalid(false); // Не ошибка, если пусто, но кнопка будет disabled
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            setIsWithdrawAmountInvalid(true);
            setWithdrawAmountErrorMessage("Enter correct amount.");
        } else if (amount < MIN_TON_FOR_WITHDRAWAL) {
            setIsWithdrawAmountInvalid(true);
            setWithdrawAmountErrorMessage(`Minimum amount for withdrawal: ${MIN_TON_FOR_WITHDRAWAL} TON.`);
        } else if (amount > toncoinBalance) {
            setIsWithdrawAmountInvalid(true);
            setWithdrawAmountErrorMessage("Not enough TONs to withdraw.");
        }
         else {
            setIsWithdrawAmountInvalid(false);
        }
    }, [withdrawAmount, toncoinBalance, activeTab, MIN_TON_FOR_WITHDRAWAL]);

    const handleWithdrawAmountChange = (e) => {
        const value = e.target.value;
        // Разрешаем ввод только чисел и одной десятичной точки
        if (/^\d*\.?\d*$/.test(value)) {
            setWithdrawAmount(value);
        }
    };

    const handleWithdrawAddressChange = (e) => {
        setWithdrawAddress(e.target.value);
    };

    const handleWithdraw = useCallback(async () => {
        const amount = parseFloat(withdrawAmount);

        if (isNaN(amount) || amount <= 0) {
            alert("Введите корректную сумму для вывода.");
            return;
        }
        if (amount < MIN_TON_FOR_WITHDRAWAL) {
            alert(`Минимальная сумма для вывода: ${MIN_TON_FOR_WITHDRAWAL} TON.`);
            return;
        }
        if (amount > toncoinBalance) {
            alert("Недостаточно TON для вывода.");
            return;
        }
        if (!withdrawAddress.trim()) { // Простая проверка на пустоту адреса
            alert("Введите ваш TON адрес.");
            return;
        }
        // Здесь можно добавить более сложную валидацию адреса TON, если необходимо

        // alert(`Запрос на вывод ${amount} TON на адрес ${withdrawAddress}`);
        // Замените на реальный вызов функции вывода
        const result = await requestToncoinWithdrawal(amount, withdrawAddress);
        alert(result.message); // Предполагаем, что функция возвращает объект с сообщением
        if (result.success) {
            setWithdrawAmount('');
            setWithdrawAddress('');
        }
    }, [withdrawAmount, withdrawAddress, toncoinBalance, requestToncoinWithdrawal, MIN_TON_FOR_WITHDRAWAL]);

    return (
        <div className="ton-exchange-internal-wrapper">
            <button
                onClick={onClose}
                className="main-popup-close-btn"
                aria-label="Закрыть"
            >
                &times;
            </button>

            <div className="exchange-popup-body-content">
                <h3 className="balance-area-title">Your Balance:</h3>
                <div className="balances-overview">
                    <div className="balance-item shards-balance">
                        <img src="/assets/toncoin-icon.png" alt="Shards" className="currency-icon" />
                        <div className="balance-details">
                            <span>{toncoinShards?.toLocaleString() || 0}</span>
                            <span className="currency-label">Toncoin Shards</span>
                        </div>
                    </div>
                    <div className="balance-item ton-balance">
                        <img src="/assets/ton-image.png" alt="TON" className="currency-icon diamond-like-ton" />
                        <div className="balance-details">
                            <span>{toncoinBalance?.toFixed(4) || '0.0000'}</span>
                            <span className="currency-label">Toncoin</span>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'exchange' && (
                        <motion.div
                            key="exchange-tab-content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="exchange-tab-content-inner new-exchange-ui"
                        >
                            <p className="exchange-currency-label">Toncoin Shards</p>
                            <input
                                id="shards-to-exchange-input"
                                type="number"
                                step="1"
                                className={`exchange-value-input ${isShardInputInvalid ? 'error' : ''}`}
                                value={shardsToExchange}
                                onChange={handleShardsInputChange}
                                placeholder="Enter amount"
                            />
                            <div className="input-error-message-container">
                                {isShardInputInvalid && shardsToExchange !== '' && (
                                    <p className="input-error-message-text"> 
                                        {parseInt(shardsToExchange, 10) < MIN_SHARDS_FOR_EXCHANGE 
                                            ? `Min. ${MIN_SHARDS_FOR_EXCHANGE} Toncoin Shards`
                                            : "Enter an integer"} 
                                    </p>
                                )}
                            </div>

                            <div className="conversion-arrow-icon"><SwapArrowsIcon /></div>
                            <p className="exchange-currency-label">Toncoin</p>
                            <div className="exchange-value-output">{realToncoinToReceive.toFixed(1)}</div>
                            <button
                                onClick={handleExchange}
                                className="action-button exchange-button"
                                disabled={
                                    !shardsToExchange ||
                                    isShardInputInvalid ||
                                    parseInt(shardsToExchange, 10) > toncoinShards ||
                                    isNaN(parseInt(shardsToExchange, 10))
                                }
                            >
                                Convert
                            </button>

                        </motion.div>
                    )}
                    {activeTab === 'withdraw' && (
                        <motion.div
                            key="withdraw-tab-content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="exchange-tab-content-inner withdraw-ui" // Можно использовать свой класс для стилизации
                        >
                            
                            <div className="input-group"> {/* Первая группа: Сумма */}
            <label htmlFor="withdraw-amount">Withdrawal Amount:</label>
            <input
                id="withdraw-amount"
                type="text" 
                inputMode="decimal"
                className={`exchange-value-input ${isWithdrawAmountInvalid ? 'error' : ''}`}
                value={withdrawAmount}
                onChange={handleWithdrawAmountChange}
                placeholder={`Min. ${MIN_TON_FOR_WITHDRAWAL} TON`}
            />
            {/* ▼▼▼ ВОТ ЗДЕСЬ НУЖЕН КОНТЕЙНЕР ОШИБКИ ▼▼▼ */}
            <div className="input-error-message-container"> {/* Убедись, что ЭТОТ DIV ЕСТЬ */}
                {isWithdrawAmountInvalid && withdrawAmountErrorMessage && (
                    <p className="input-error-message-text">{withdrawAmountErrorMessage}</p>
                )}
            </div>
        </div>

        <div className="input-group"> {/* Вторая группа: Адрес */}
            <label htmlFor="withdraw-address">Your Ton Withdrawal Address (кошелек):</label>
            <input
                id="withdraw-address"
                type="text"
                className="exchange-value-input" // Добавь isWithdrawAddressInvalid ? 'error' : '' если есть
                value={withdrawAddress}
                onChange={handleWithdrawAddressChange}
                placeholder="EQ... или UQ..."
            />
            {/* ▼▼▼ И ЗДЕСЬ НУЖЕН КОНТЕЙНЕР ОШИБКИ, ЕСЛИ ДЛЯ АДРЕСА ЕСТЬ ОШИБКИ ▼▼▼ */}
            <div className="input-error-message-container"> {/* Убедись, что ЭТОТ DIV ЕСТЬ */}
                {/* {isWithdrawAddressError && withdrawAddressErrorMessageText && ( // Пример
                    <p className="input-error-message-text">{withdrawAddressErrorMessageText}</p>
                )} */}
            </div>
        </div>
                            <button
                                onClick={handleWithdraw}
                                className="action-button withdraw-button"
                                disabled={
                                    !withdrawAmount ||
                                    isWithdrawAmountInvalid || // Уже включает проверку на минимум и баланс
                                    !withdrawAddress.trim() || // Проверка на пустой адрес
                                    parseFloat(withdrawAmount) > toncoinBalance || // Дополнительная проверка баланса
                                    isNaN(parseFloat(withdrawAmount)) ||
                                    parseFloat(withdrawAmount) < MIN_TON_FOR_WITHDRAWAL
                                }
                            >
                                Request withdrawal
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* ▼▼▼ УВЕДОМЛЕНИЕ ТЕПЕРЬ ЗДЕСЬ, МЕЖДУ СКРОЛЛИРУЕМЫМ КОНТЕНТОМ И "НАВИСАЮЩИМИ" ТАБАМИ ▼▼▼ */}
            <p className="exchange-notice fixed-bottom-notice">
                Withdrawals are processed within 24 hours.
            </p>
            {/* ▲▲▲ КОНЕЦ УВЕДОМЛЕНИЯ ▲▲▲ */}
            <div className="exchange-popup-tabs-footer">
                <div className="tabs-container">
                    <button
                        className={`tab-button ${activeTab === 'exchange' ? 'active' : ''}`}
                        onClick={() => setActiveTab('exchange')}
                    >
                        Convert
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'withdraw' ? 'active' : ''}`}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        Withdrawal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TonExchangePopupInternalContent;