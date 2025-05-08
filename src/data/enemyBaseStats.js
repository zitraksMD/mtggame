// src/data/enemyBaseStats.js

// Базовые характеристики врагов (для уровня 1, сложности normal)
export const BASE_ENEMY_STATS = {

    // --- Существующие типы (из твоего JSON примера) ---
    'melee': {
      hp: 50, speed: 1.8, damage: 8, attackRange: 35, attackSpeed: 1.5 // ~1 атака в 0.67 сек
    },
    'ranged': {
      hp: 30, speed: 1.0, damage: 6, attackRange: 250, attackSpeed: 2.0 // ~1 атака в 0.5 сек
    },
    'caster': { // Общий для магов огня/льда, специфичные поля в levelData
      hp: 80, speed: 0, attackRange: 300, attackSpeed: 0.5, // ~1 каст в 2 сек
      beamDamage: 5, beamEffectDuration: 1.0
    },
    'boss': { // Пример босса
      hp: 250, speed: 1.2, damage: 18, attackRange: 45, attackSpeed: 2.2 // ~1 атака в 0.45 сек
    },
  
    // --- Новые типы ---
    'skeleton_swordsman': {
      hp: 40, speed: 2.0, damage: 7, attackRange: 25, attackSpeed: 1.2 // ~1 атака в 0.83 сек
    },
    'skeleton_archer': {
      hp: 25, speed: 1.2, damage: 5, attackRange: 280, attackSpeed: 1.8 // ~1 атака в 0.55 сек
    },
    'ogre_mage': {
      hp: 150, speed: 0.5, directDamage: 10, attackRange: 250, attackSpeed: 0.6, // ~1 атака в 1.67 сек
      projectileSpeed: 300, // <<< УВЕЛИЧЬ ЗНАЧЕНИЕ ЗДЕСЬ (например, до 300)
      groundEffectDuration: 3.0, // Оставляем
      groundEffectRadius: 40,    // Добавь эти, если еще не добавил
      groundEffectDps: 5   
      // Атакует снарядом в точку
    },
    'bone_dancer': {
      hp: 70, speed: 4.0, // Очень быстрый
      // У него нет прямой атаки? Или слабая контактная?
      // damage: 3, attackRange: 20, attackSpeed: 1.0,
      // Параметры поведения
      activationRange: 200,
      chargeMultiplier: 3.0,
      chargeDuration: 0.25,
      orbitDistance: 60
    },
    'rotting_soldier': {
      hp: 90, speed: 1.2,
      // Нет своей атаки? Добегает и взрывается при смерти?
      // Статы для эффекта смерти:
      explosionDamage: 30, // Урон при взрыве
      explosionRadius: 60, // Радиус взрыва
      cloudDuration: 8.0,  // Длительность облака
      cloudRadius: 70,   // Радиус облака
      cloudDps: 5          // Урон облака в секунду
    },
    'plague_totemist': {
      hp: 100, speed: 1.1, // Может отбегать?
      // Нет своей атаки?
      abilityCooldown: 12.0, // Кулдаун установки тотема
      totemType: 'debuff_slow', // Тип тотема (для логики эффекта)
      totemDuration: 15.0,   // Время жизни тотема
      totemRadius: 120,      // Радиус действия тотема
      totemEffect: { slowPercent: 0.3 } // Параметры эффекта (замедление на 30%)
    },
    'revenant_knight': {
      hp: 200, speed: 1.4, damage: 12, attackRange: 30, attackSpeed: 1.4, // ~1 атака в 0.71 сек
      initialBlockCharges: 3 // Начальное кол-во блоков
    },
    'sand_reaper': {
      hp: 130, speed: 1.0, // Двигается или стоит?
      // Нет своей атаки?
      abilityCooldown: 5.0, // Кулдаун шипов
      spikeDelay: 1.2,    // Задержка перед появлением шипов
      spikeRadius: 35,    // Радиус области шипов
      spikeDamage: 18     // Урон от шипов
    },
    'ghostly_enchanter': {
      hp: 90, speed: 0.5, // Медленный или стоит?
      attackRange: 350,   // Дальность луча
      attackSpeed: 0.6,   // ~1 каст в 1.67 сек
      attackType: 'beam',   // Тип атаки - луч
      auraRadius: 150, // <<< НОВЫЙ ПАРАМЕТР: Радиус ауры ослабления (подбери значение)

    },
    'cursed_gladiator': {
      hp: 160, speed: 1.6, damage: 10, attackRange: 30, attackSpeed: 1.3, // ~1 атака в 0.77 сек
      stackDamageBonus: 2 // +2 урона за каждую предыдущую атаку
    },
    'poison_cultist': {
      hp: 110, speed: 1.5, // Двигается или стоит?
      attackRange: 220,   // Дальность броска лужи
      attackSpeed: 0.7,   // Не используется? Атака по кулдауну?
      abilityCooldown: 4.0, // Кулдаун лужи
      puddleDuration: 10.0, // Время жизни лужи
      puddleRadius: 50,   // Радиус лужи
      puddleDps: 4,        // Урон лужи в секунду
      projectileSpeed: 250, // Скорость летящей сферы для лужи
      patrolRadius: 80 // <<< НОВЫЙ ПАРАМЕТР: Радиус квадрата патрулирования
    },
  

    // Добавь сюда 'skeleton_swordsman', если он призывается Носильщиком,
    // или используй статы обычного мечника выше.
  };  