import { 
  DonkiCME, 
  DonkiFlare, 
  DonkiSEP, 
  DonkiGST, 
  DonkiIPS, 
  DonkiNotification,
  DonkiWSAEnlil 
} from './api';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface RiskIndicator {
  emoji: string;
  level: RiskLevel;
  description: string;
}

export function getRiskLevel(speed?: number, kp?: number, flareClass?: string): RiskIndicator {
  // Определение уровня риска для CME по скорости
  if (speed !== undefined) {
    if (speed >= 1000) return { emoji: '🔴', level: 'extreme', description: 'Экстремальный риск' };
    if (speed >= 700) return { emoji: '🟠', level: 'high', description: 'Высокий риск' };
    if (speed >= 500) return { emoji: '🟡', level: 'moderate', description: 'Средний риск' };
    return { emoji: '🔵', level: 'low', description: 'Низкий риск' };
  }

  // Для геомагнитных бурь по Kp индексу
  if (kp !== undefined) {
    if (kp >= 9) return { emoji: '🔴', level: 'extreme', description: 'Экстремальная буря' };
    if (kp >= 7) return { emoji: '🟠', level: 'high', description: 'Сильная буря' };
    if (kp >= 5) return { emoji: '🟡', level: 'moderate', description: 'Умеренная буря' };
    return { emoji: '🔵', level: 'low', description: 'Слабая буря' };
  }

  // Для солнечных вспышек
  if (flareClass) {
    if (flareClass.startsWith('X')) return { emoji: '🔴', level: 'extreme', description: 'Экстремально мощная' };
    if (flareClass.startsWith('M')) return { emoji: '🟠', level: 'high', description: 'Мощная' };
    if (flareClass.startsWith('C')) return { emoji: '🟡', level: 'moderate', description: 'Средняя' };
    return { emoji: '🔵', level: 'low', description: 'Слабая' };
  }

  return { emoji: '⚪', level: 'low', description: 'Неизвестно' };
}

export function formatCME(cme: DonkiCME): string {
  const analysis = cme.cmeAnalyses?.[0];
  const speed = analysis?.speed ? `${Math.round(analysis.speed)} км/с` : 'Не указано';
  const location = cme.sourceLocation || 'Не указано';
  const time = cme.startTime 
    ? new Date(cme.startTime).toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Не указано';

  let text = `🌊 <b>Корональный выброс массы (CME)</b>\n\n`;
  text += `🆔 <b>ID:</b> ${cme.activityID}\n`;
  text += `📅 <b>Время:</b> ${time}\n`;
  text += `📍 <b>Расположение:</b> ${location}\n`;
  text += `⚡ <b>Скорость:</b> ${speed}\n`;

  if (analysis) {
    text += `\n📊 <b>Анализ:</b>\n`;
    text += `• Широта: ${analysis.latitude}°\n`;
    text += `• Долгота: ${analysis.longitude}°\n`;
    text += `• Угол: ${analysis.halfAngle}°\n`;
    text += `• Тип: ${analysis.type || 'Не указано'}\n`;
    if (analysis.isMostAccurate) {
      text += `• ✓ Наиболее точный анализ\n`;
    }
  }

  if (cme.note) {
    text += `\n📝 <b>Примечание:</b> ${cme.note.substring(0, 200)}${cme.note.length > 200 ? '...' : ''}\n`;
  }

  if (cme.link) {
    text += `\n🔗 <a href="${cme.link}">Подробнее</a>`;
  }

  return text;
}

export function formatFlare(flare: DonkiFlare): string {
  const beginTime = new Date(flare.beginTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const peakTime = new Date(flare.peakTime).toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `☀️ <b>Солнечная вспышка (Flare)</b>\n\n`;
  text += `🆔 <b>ID:</b> ${flare.flrID}\n`;
  text += `📅 <b>Начало:</b> ${beginTime}\n`;
  text += `⏰ <b>Пик:</b> ${peakTime}\n`;
  text += `💥 <b>Класс:</b> ${flare.classType || 'Не указано'}\n`;
  text += `📍 <b>Расположение:</b> ${flare.sourceLocation || 'Не указано'}\n`;

  if (flare.activeRegionNum) {
    text += `🔢 <b>Активная область:</b> ${flare.activeRegionNum}\n`;
  }

  if (flare.note) {
    text += `\n📝 <b>Примечание:</b> ${flare.note.substring(0, 200)}${flare.note.length > 200 ? '...' : ''}\n`;
  }

  return text;
}

export function formatSEP(sep: DonkiSEP): string {
  const eventTime = new Date(sep.eventTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `⚡ <b>Солнечные энергичные частицы (SEP)</b>\n\n`;
  text += `🆔 <b>ID:</b> ${sep.sepID}\n`;
  text += `📅 <b>Время события:</b> ${eventTime}\n`;

  if (sep.instruments && sep.instruments.length > 0) {
    text += `🛰️ <b>Инструменты:</b> ${sep.instruments.map(i => i.displayName).join(', ')}\n`;
  }

  return text;
}

export function formatGST(gst: DonkiGST): string {
  const startTime = new Date(gst.startTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `🌍 <b>Геомагнитная буря (GST)</b>\n\n`;
  text += `🆔 <b>ID:</b> ${gst.gstID}\n`;
  text += `📅 <b>Начало:</b> ${startTime}\n`;

  if (gst.allKpIndex && gst.allKpIndex.length > 0) {
    const maxKp = Math.max(...gst.allKpIndex.map(k => k.kp));
    const avgKp = (gst.allKpIndex.reduce((sum, k) => sum + k.kp, 0) / gst.allKpIndex.length).toFixed(1);
    text += `📊 <b>Максимальный Kp:</b> ${maxKp}\n`;
    text += `📊 <b>Средний Kp:</b> ${avgKp}\n`;
  }

  if (gst.note) {
    text += `\n📝 <b>Примечание:</b> ${gst.note.substring(0, 200)}${gst.note.length > 200 ? '...' : ''}\n`;
  }

  return text;
}

export function formatIPS(ips: DonkiIPS): string {
  const eventTime = new Date(ips.eventTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `💥 <b>Межпланетный удар (IPS)</b>\n\n`;
  text += `🆔 <b>ID:</b> ${ips.activityID}\n`;
  text += `📍 <b>Местоположение:</b> ${ips.location}\n`;
  text += `📅 <b>Время события:</b> ${eventTime}\n`;

  if (ips.instruments && ips.instruments.length > 0) {
    text += `🛰️ <b>Инструменты:</b> ${ips.instruments.map(i => i.displayName).join(', ')}\n`;
  }

  return text;
}

export function formatNotification(notification: DonkiNotification): string {
  const issueTime = new Date(notification.messageIssueTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `📢 <b>Уведомление DONKI</b>\n\n`;
  text += `📅 <b>Время:</b> ${issueTime}\n`;
  text += `🏷️ <b>Тип:</b> ${notification.messageType}\n`;
  text += `\n${notification.messageBody.substring(0, 500)}${notification.messageBody.length > 500 ? '...' : ''}\n`;

  if (notification.messageURL) {
    text += `\n🔗 <a href="${notification.messageURL}">Подробнее</a>`;
  }

  return text;
}

export function formatWSAEnlil(sim: DonkiWSAEnlil): string {
  const completionTime = new Date(sim.modelCompletionTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `🌐 <b>WSA-ENLIL+Cone Симуляция</b>\n\n`;
  text += `🆔 <b>ID:</b> ${sim.simulationID}\n`;
  text += `⏱️ <b>Завершено:</b> ${completionTime}\n`;
  text += `📏 <b>AU:</b> ${sim.au}\n`;
  
  if (sim.estimatedShockArrivalTime) {
    const arrivalTime = new Date(sim.estimatedShockArrivalTime).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    text += `🎯 <b>Ожидаемое прибытие ударной волны:</b> ${arrivalTime}\n`;
  }

  if (sim.impactList && sim.impactList.length > 0) {
    text += `\n📋 <b>Воздействия:</b>\n`;
    sim.impactList.forEach((impact, idx) => {
      const arrivalTime = new Date(impact.arrivalTime).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      text += `${idx + 1}. ${impact.location} - ${arrivalTime} ${impact.isGlancingBlow ? '⚡(скользящий удар)' : '💥(прямой удар)'}\n`;
    });
  }

  if (sim.isEarthGB) {
    text += `\n⚠️ <b>Влияние на Землю</b>`;
  }

  return text;
}

// Простые форматтеры для обычных пользователей
export function formatCMESimple(cme: DonkiCME): string {
  const analysis = cme.cmeAnalyses?.[0];
  const speed = analysis?.speed || 0;
  const risk = getRiskLevel(speed);
  
  const time = cme.startTime 
    ? new Date(cme.startTime).toLocaleString('ru-RU', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Не указано';

  // Примерная оценка времени прибытия (1-3 дня для типичного CME)
  const arrivalEstimate = speed > 800 ? '1-2 дня' : speed > 500 ? '2-3 дня' : '3-4 дня';

  let text = `${risk.emoji} <b>Солнечный шторм</b>\n\n`;
  text += `📅 <b>Когда:</b> ${time}\n`;
  text += `${risk.emoji} <b>Уровень:</b> ${risk.description}\n`;
  text += `⚡ <b>Скорость:</b> ${Math.round(speed)} км/с\n`;
  
  if (analysis && speed > 0) {
    text += `\n💡 <b>Что это значит:</b>\n`;
    text += `Массивное облако солнечной плазмы выброшено с Солнца. `;
    
    if (speed >= 1000) {
      text += `Это очень мощный выброс! Может вызвать сильные геомагнитные бури, полярные сияния на средних широтах и возможные сбои в спутниковых системах. `;
    } else if (speed >= 700) {
      text += `Достаточно сильный выброс, который может вызвать геомагнитную бурю и красивые полярные сияния. `;
    } else if (speed >= 500) {
      text += `Умеренный выброс, может вызвать слабую геомагнитную активность. `;
    } else {
      text += `Слабая активность, минимальное влияние на Землю. `;
    }
    
    text += `Ожидаемое прибытие к Земле: примерно через ${arrivalEstimate}.\n`;
  }

  if (cme.link) {
    text += `\n🔗 <a href="${cme.link}">Технические детали</a>`;
  }

  return text;
}

export function formatFlareSimple(flare: DonkiFlare): string {
  const risk = getRiskLevel(undefined, undefined, flare.classType);
  const beginTime = new Date(flare.beginTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `${risk.emoji} <b>Солнечная вспышка</b>\n\n`;
  text += `📅 <b>Когда:</b> ${beginTime}\n`;
  text += `${risk.emoji} <b>Сила:</b> ${flare.classType || 'Не указано'} класс (${risk.description})\n`;

  if (flare.classType) {
    text += `\n💡 <b>Что это значит:</b>\n`;
    
    if (flare.classType.startsWith('X')) {
      text += `Это одна из самых мощных вспышек! Может вызвать сбои в радио- и спутниковой связи, проблемы с GPS. `;
      text += `Может сопровождаться корональным выбросом массы. `;
    } else if (flare.classType.startsWith('M')) {
      text += `Мощная вспышка. Может вызвать кратковременные сбои в радиосвязи, особенно в полярных регионах. `;
      text += `Возможно усиление полярных сияний. `;
    } else if (flare.classType.startsWith('C')) {
      text += `Средняя вспышка. Обычно не оказывает значительного влияния на Землю, но может вызвать слабые помехи в радиосвязи. `;
    } else {
      text += `Слабая вспышка, минимальное влияние на Землю. `;
    }
    
    text += `Вспышки класса ${flare.classType} происходят довольно часто на Солнце.\n`;
  }

  return text;
}

export function formatSEPSimple(sep: DonkiSEP): string {
  const eventTime = new Date(sep.eventTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `⚡ <b>Радиационная буря</b>\n\n`;
  text += `📅 <b>Когда:</b> ${eventTime}\n`;

  text += `\n💡 <b>Что это значит:</b>\n`;
  text += `Солнце выбросило поток высокоэнергетических частиц в космос. `;
  text += `Это может быть опасно для космонавтов и пассажиров высоко летящих самолетов. `;
  text += `Обычно не представляет опасности для людей на Земле благодаря атмосфере и магнитному полю планеты.\n`;

  return text;
}

export function formatGSTSimple(gst: DonkiGST): string {
  const startTime = new Date(gst.startTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let maxKp = 0;
  if (gst.allKpIndex && gst.allKpIndex.length > 0) {
    maxKp = Math.max(...gst.allKpIndex.map(k => k.kp));
  }

  const risk = getRiskLevel(undefined, maxKp);
  
  let text = `${risk.emoji} <b>Геомагнитная буря</b>\n\n`;
  text += `📅 <b>Начало:</b> ${startTime}\n`;
  text += `${risk.emoji} <b>Интенсивность:</b> ${risk.description}`;
  
  if (maxKp > 0) {
    text += ` (Kp=${maxKp.toFixed(1)})\n`;
  } else {
    text += `\n`;
  }

  text += `\n💡 <b>Что это значит:</b>\n`;
  
  if (maxKp >= 9) {
    text += `Экстремально сильная геомагнитная буря! Может вызвать серьезные сбои в энергосистемах, радиосвязи и GPS. `;
    text += `Полярные сияния могут быть видны даже на экваторе! `;
  } else if (maxKp >= 7) {
    text += `Сильная буря. Возможны сбои в спутниковых системах и радиосвязи. `;
    text += `Полярные сияния видны на средних широтах (например, в Москве). `;
  } else if (maxKp >= 5) {
    text += `Умеренная геомагнитная буря. Возможно усиление полярных сияний, слабые помехи в радиосвязи. `;
    text += `Безопасна для большинства систем. `;
  } else {
    text += `Слабая геомагнитная активность. Минимальное влияние на технологии. `;
  }
  
  text += `Геомагнитные бури происходят когда солнечный ветер взаимодействует с магнитным полем Земли.\n`;

  return text;
}

export function formatIPSSimple(ips: DonkiIPS): string {
  const eventTime = new Date(ips.eventTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `💥 <b>Ударная волна в космосе</b>\n\n`;
  text += `📅 <b>Когда:</b> ${eventTime}\n`;
  text += `📍 <b>Место:</b> ${ips.location}\n`;

  text += `\n💡 <b>Что это значит:</b>\n`;
  text += `Быстрая ударная волна от солнечного выброса прошла через точку ${ips.location} в космосе. `;
  text += `Это может быть предвестником геомагнитной бури на Земле, если ударная волна направлена к нашей планете. `;
  text += `Обычно такие события происходят за 1-3 дня до прибытия коронального выброса к Земле.\n`;

  return text;
}

export function formatNotificationSimple(notification: DonkiNotification): string {
  const issueTime = new Date(notification.messageIssueTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `📢 <b>Уведомление о космической погоде</b>\n\n`;
  text += `📅 <b>Когда:</b> ${issueTime}\n`;
  text += `🏷️ <b>Тип события:</b> ${notification.messageType}\n`;
  text += `\n${notification.messageBody.substring(0, 400)}${notification.messageBody.length > 400 ? '...' : ''}\n`;

  if (notification.messageURL) {
    text += `\n🔗 <a href="${notification.messageURL}">Подробнее</a>`;
  }

  return text;
}

export function formatWSAEnlilSimple(sim: DonkiWSAEnlil): string {
  const completionTime = new Date(sim.modelCompletionTime).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `🌐 <b>Прогноз космической погоды</b>\n\n`;
  text += `⏱️ <b>Создано:</b> ${completionTime}\n`;

  if (sim.estimatedShockArrivalTime) {
    const arrivalTime = new Date(sim.estimatedShockArrivalTime).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
    text += `🎯 <b>Ожидаемое прибытие:</b> ${arrivalTime}\n`;
  }

  text += `\n💡 <b>Что это значит:</b>\n`;
  text += `Это результат компьютерного моделирования космической погоды. `;
  text += `Ученые используют математические модели, чтобы предсказать, когда солнечный шторм достигнет Земли и других планет. `;
  
  if (sim.isEarthGB) {
    text += `Согласно этой симуляции, ожидается геомагнитное воздействие на Землю. `;
  }

  if (sim.impactList && sim.impactList.length > 0) {
    text += `Модель показывает возможные воздействия на различные объекты в космосе.\n`;
  } else {
    text += `Прогнозы помогают подготовиться к возможным воздействиям на спутники, космические аппараты и земную инфраструктуру.\n`;
  }

  return text;
}
