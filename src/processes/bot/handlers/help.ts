import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';

export async function handleHelp(ctx: Context & BotContext): Promise<void> {
  const message = `📚 <b>Помощь</b>\n\n` +
    `Выберите интересующую тему или команду:\n\n` +
    `<b>Основные команды:</b>`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌌 APOD', 'help_apod'),
      Markup.button.callback('🌍 Земля', 'help_earth')
    ],
    [
      Markup.button.callback('☄️ Астероиды', 'help_asteroids'),
      Markup.button.callback('🖼️ Галерея', 'help_images')
    ],
    [
      Markup.button.callback('🌊 DONKI', 'help_donki'),
      Markup.button.callback('📅 Подписки', 'help_subscriptions')
    ],
    [
      Markup.button.callback('❓ Общие вопросы', 'help_general'),
      Markup.button.callback('🏠 Меню', 'main_menu')
    ]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpApod(ctx: Context & BotContext) {
  const message = `🌌 <b>APOD (Astronomy Picture of the Day)</b>\n\n` +
    `Получите потрясающее фото космоса от NASA каждый день!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Просто отправьте: <code>/apod</code>\n` +
    `• Бот покажет случайное фото из архива NASA\n\n` +
    `<b>Примеры:</b>\n` +
    `• <code>/apod</code> — получить случайное фото\n\n` +
    `💡 <b>Совет:</b> Подпишитесь на ежедневные уведомления командой /subscribe`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Попробовать', 'quick_apod')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpEarth(ctx: Context & BotContext) {
  const message = `🌍 <b>Снимок Земли</b>\n\n` +
    `Получите актуальный снимок нашей планеты из космоса!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Отправьте: <code>/earth</code>\n` +
    `• Бот покажет последний доступный снимок от NASA EPIC\n\n` +
    `<b>Режимы:</b>\n` +
    `• Natural — естественные цвета\n` +
    `• Enhanced — улучшенные цвета\n\n` +
    `💡 <b>Совет:</b> Можно переключаться между режимами прямо в сообщении`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Попробовать', 'quick_earth')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpAsteroids(ctx: Context & BotContext) {
  const message = `☄️ <b>Астероиды</b>\n\n` +
    `Узнайте о ближайших астероидах, приближающихся к Земле!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Отправьте: <code>/asteroids</code>\n` +
    `• Бот покажет информацию об астероидах за последние 7 дней\n\n` +
    `<b>Информация включает:</b>\n` +
    `• Потенциально опасные астероиды\n` +
    `• Ближайшие безопасные астероиды\n` +
    `• Размеры, скорости и расстояния\n\n` +
    `💡 <b>Совет:</b> Данные обновляются ежедневно`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Попробовать', 'quick_asteroids')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpImages(ctx: Context & BotContext) {
  const message = `🖼️ <b>Галерея изображений</b>\n\n` +
    `Просматривайте коллекцию изображений из архива NASA!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Отправьте: <code>/images</code> — выбрать тему из меню\n` +
    `• Или: <code>/images &lt;запрос&gt;</code> — поиск по запросу\n\n` +
    `<b>Примеры:</b>\n` +
    `• <code>/images</code> — открыть меню тем\n` +
    `• <code>/images Mars</code> — найти изображения Марса\n` +
    `• <code>/images Apollo</code> — найти изображения миссии Apollo\n\n` +
    `💡 <b>Совет:</b> Используйте английские слова для лучших результатов`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Попробовать', 'quick_images')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpDonki(ctx: Context & BotContext) {
  const message = `🌊 <b>DONKI - Космическая погода</b>\n\n` +
    `Отслеживайте события космической погоды в реальном времени!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Отправьте: <code>/donki</code>\n` +
    `• Выберите тип события из меню\n\n` +
    `<b>Типы событий:</b>\n` +
    `• CME — Корональные выбросы массы\n` +
    `• Вспышки — Солнечные вспышки\n` +
    `• SEP — Солнечные энергичные частицы\n` +
    `• Геобури — Геомагнитные бури\n` +
    `• IPS — Межпланетные удары\n` +
    `• Уведомления — Важные уведомления NASA\n\n` +
    `💡 <b>Совет:</b> Можно подписаться на уведомления о событиях`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Попробовать', 'quick_donki')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpSubscriptions(ctx: Context & BotContext) {
  const message = `📅 <b>Подписки</b>\n\n` +
    `Подпишитесь на ежедневные уведомления о космических событиях!\n\n` +
    `<b>Как использовать:</b>\n` +
    `• Отправьте: <code>/subscribe</code>\n` +
    `• Выберите тип подписки (APOD, Earth, DONKI)\n` +
    `• Выберите время доставки (UTC)\n` +
    `• Подтвердите подписку\n\n` +
    `<b>Управление:</b>\n` +
    `• <code>/unsubscribe</code> — отписаться от подписок\n\n` +
    `💡 <b>Совет:</b> Вы можете иметь несколько подписок одновременно`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Подписаться', 'quick_subscribe')],
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

export async function handleHelpGeneral(ctx: Context & BotContext) {
  const message = `❓ <b>Общие вопросы</b>\n\n` +
    `<b>Как работает бот?</b>\n` +
    `Бот использует официальные API NASA для получения данных о космосе. Все данные актуальны и обновляются регулярно.\n\n` +
    `<b>Откуда берутся данные?</b>\n` +
    `• APOD — NASA Astronomy Picture of the Day\n` +
    `• Earth — NASA EPIC (Earth Polychromatic Imaging Camera)\n` +
    `• Asteroids — NASA Near Earth Object Web Service\n` +
    `• Images — NASA Image and Video Library\n` +
    `• DONKI — NASA Space Weather Database Of Notifications, Knowledge, Information\n\n` +
    `<b>Как часто обновляются данные?</b>\n` +
    `Данные обновляются в реальном времени при каждом запросе.\n\n` +
    `💡 <b>Совет:</b> Используйте главное меню для быстрой навигации`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Назад к помощи', 'help_menu')],
    [Markup.button.callback('🏠 Меню', 'main_menu')]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
} 