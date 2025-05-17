// src/components/popups/MailPopupContent.jsx
import React, { useState, useEffect } from 'react';
// import useGameStore from '../../store/useGameStore'; // Uncomment if needed
import './MailPopupContent.scss';
import MailDetailPopup from './MailDetailPopup';

// Mock data should ideally come from a global store or API in a real app
const initialMockMailItems = [
    { id: 'sys_welcome_001', sender: 'Система', title: 'Добро пожаловать в игру!', message: 'Спасибо за регистрацию! В качестве приветственного бонуса, примите этот небольшой подарок.\n\nНадеемся, вам понравится наше приключение!', rewardType: 'золото', rewardAmount: 100, claimed: false, read: false, date: '2025-05-15' },
    { id: 'event_login_002', sender: 'Календарь Наград', title: 'Ежедневный вход: День 1', message: 'Вы получили ежедневную награду за вход. Заберите ее скорее!', rewardType: 'кристаллы', rewardAmount: 10, claimed: false, read: false, date: '2025-05-16' },
    { id: 'update_info_003', sender: 'Летописец', title: 'Обновление игры v1.1!', message: 'Приветствуем, Искатель Приключений!\n\nРады сообщить о выходе обновления 1.1, которое включает:\n- Новую зону "Забытые Руины"\n- Улучшенный баланс классов\n- Исправление множества ошибок.\n\nПодробнее на нашем форуме!', rewardType: null, claimed: false, read: true, date: '2025-05-16' },
    { id: 'reward_milestone_004', sender: 'Хранитель Достижений', title: 'Достижение "Первые шаги"', message: 'Поздравляем с прохождением 5 уровней! Ваша награда ждет вас в этом письме.', rewardType: 'зелье энергии', rewardAmount: 1, claimed: true, read: true, date: '2025-05-17' },
    { id: 'sys_maintenance_005', sender: 'Главный Магистр', title: 'Технические работы скоро', message: 'Уважаемые игроки, завтра с 03:00 до 04:00 по серверному времени будут проводиться плановые технические работы по улучшению стабильности магических потоков. Возможны временные разрывы связи с Астралом.', rewardType: null, claimed: false, read: false, date: '2025-05-17' },
    { id: 'long_title_006', sender: 'Вестник Королевства', title: 'Очень Важное Уведомление Касательно Предстоящего Турнира и Правил Участия в Нем', message: 'Текст письма о турнире...', rewardType: null, claimed: false, read: false, date: '2025-05-18' },
    { id: 'reward_007', sender: 'Гильдия Торговцев', title: 'Компенсация', message: 'Приносим извинения за временные неудобства. Примите эту скромную компенсацию.', rewardType: 'отмычки', rewardAmount: 5, claimed: false, read: false, date: '2025-05-18' },
];


const MailPopupContent = ({ onCloseRequest }) => { // onCloseRequest prop for closing the main mail UI
    const [mails, setMails] = useState(initialMockMailItems);
    const [selectedMailForDetail, setSelectedMailForDetail] = useState(null);

    // const { addItems, markMailAsRead, claimMailReward, deleteMailGlobally } = useGameStore(state => ({...}));

    const handleOpenMailDetail = (mail) => {
        setSelectedMailForDetail(mail);
        if (!mail.read) {
            // In a real app: markMailAsRead(mail.id);
            setMails(prevMails => prevMails.map(m => m.id === mail.id ? { ...m, read: true } : m));
        }
    };

    const handleCloseMailDetail = () => {
        setSelectedMailForDetail(null);
    };

    const handleClaimRewardFromDetail = (mailId) => {
        // In a real app: claimMailReward(mailId);
        setMails(prevMails => prevMails.map(m => m.id === mailId ? { ...m, claimed: true, read: true } : m));
        setSelectedMailForDetail(prev => prev && prev.id === mailId ? { ...prev, claimed: true, read: true } : prev);
    };

    const handleDeleteMailFromDetail = (mailId) => {
        // In a real app: deleteMailGlobally(mailId);
        setMails(prevMails => prevMails.filter(m => m.id !== mailId));
        handleCloseMailDetail(); // Always close detail view after deletion from it
    };

    const handleClaimAll = () => {
        let itemsClaimed = [];
        const updatedMails = mails.map(m => {
            if (m.rewardType && !m.claimed) {
                itemsClaimed.push({ type: m.rewardType, amount: m.rewardAmount });
                // In a real app: addItems(m.rewardType, m.rewardAmount);
                return { ...m, claimed: true, read: true };
            }
            return m;
        });
        if (itemsClaimed.length > 0) {
            console.log("Claimed all rewards:", itemsClaimed);
            setMails(updatedMails);
            if (selectedMailForDetail) { // If a mail was open, update its state
                const stillExists = updatedMails.find(m => m.id === selectedMailForDetail.id);
                if (stillExists) setSelectedMailForDetail(stillExists); else handleCloseMailDetail();
            }
        }
    };

    const handleDeleteAllReadAndClaimed = () => {
        const mailsToKeep = mails.filter(m => !m.read || (m.rewardType && !m.claimed));
        const numDeleted = mails.length - mailsToKeep.length;
        if (numDeleted > 0) {
            console.log(`Deleted ${numDeleted} read and claimed mails.`);
            setMails(mailsToKeep);
            if (selectedMailForDetail && !mailsToKeep.find(m => m.id === selectedMailForDetail.id)) {
                handleCloseMailDetail();
            }
        }
    };

    const unreadCount = mails.filter(mail => !mail.read).length;
    const claimableCount = mails.filter(mail => mail.rewardType && !mail.claimed).length;
    const canDeleteSome = mails.some(m => m.read && (!m.rewardType || m.claimed));

    return (
        <div className="mail-content-area">
            <div className="mail-list-header-info">
                 <span className="mail-list-title">Входящие ({mails.length})</span>
                 {unreadCount > 0 && <span className="mail-unread-highlight"> ({unreadCount} новых)</span>}
            </div>

            <div className="mail-list-scroll-container">
                {mails.length === 0 ? (
                    <p className="mail-list-empty-text">Почтовый ящик пуст, как сокровищница гоблина после набега!</p>
                ) : (
                    mails.map(mail => (
                        <div
                            key={mail.id}
                            className={`mail-list-entry ${mail.read ? 'is-read' : 'is-unread'}`}
                            onClick={() => handleOpenMailDetail(mail)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenMailDetail(mail)}
                        >
                            <div className="mail-entry-indicator">
                                {mail.rewardType && !mail.claimed ? 
                                    <span className="mail-icon reward-pending" role="img" aria-label="Есть награда">🎁</span> : 
                                    <span className={`mail-icon ${mail.read ? 'read-visual' : 'unread-visual'}`} role="img" aria-label={mail.read ? "Прочитано" : "Непрочитано"}>
                                        {mail.read ? '✉️' : '📧'}
                                    </span>
                                }
                            </div>
                            <div className="mail-entry-summary">
                                <div className="mail-entry-sender">{mail.sender}</div>
                                <div className="mail-entry-title">{mail.title}</div>
                            </div>
                            <div className="mail-entry-date">{mail.date}</div>
                        </div>
                    ))
                )}
            </div>

            {(claimableCount > 0 || canDeleteSome) && (
                <div className="mail-list-footer">
                    {claimableCount > 0 && (
                        <button onClick={handleClaimAll} className="mail-footer-action-button claim-all-btn">
                            <span role="img" aria-label="Деньги">💰</span> Забрать все ({claimableCount})
                        </button>
                    )}
                    {canDeleteSome && (
                         <button onClick={handleDeleteAllReadAndClaimed} className="mail-footer-action-button delete-read-btn">
                            <span role="img" aria-label="Корзина">🗑️</span> Очистить
                        </button>
                    )}
                </div>
            )}

            {/* Detail Popup is managed here */}
            <MailDetailPopup
                mail={selectedMailForDetail}
                onClose={handleCloseMailDetail}
                onClaim={handleClaimRewardFromDetail}
                onDelete={handleDeleteMailFromDetail}
            />
        </div>
    );
};

export default MailPopupContent;