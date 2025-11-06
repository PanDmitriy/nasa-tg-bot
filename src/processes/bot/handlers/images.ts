import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';
import { NasaImage } from '../../../features/images/api';
import { container } from '../../../shared/di/container';
import { getCallbackQueryData } from '../../../shared/lib/telegramHelpers';


/**
 * Главный хендлер команды /images
 * Показывает меню с популярными темами или выполняет поиск
 */
export async function handleImages(ctx: Context & BotContext) {
  const args = ctx.message && 'text' in ctx.message 
    ? ctx.message.text.split(' ').slice(1).join(' ')
    : '';

  // Если передан запрос, выполняем поиск
  if (args.trim()) {
    return handleImageSearch(ctx, args.trim());
  }

  // Иначе показываем меню с популярными темами
  const topics = container.imagesApi.getPopularTopics();
  
  // Разбиваем на группы по 2 кнопки в ряд
  const keyboard = [];
  for (let i = 0; i < topics.length; i += 2) {
    const row = topics.slice(i, i + 2).map(topic =>
      Markup.button.callback(
        `${topic.emoji} ${topic.name}`,
        `images_topic_${topic.id}`
      )
    );
    keyboard.push(row);
  }

  // Добавляем кнопку для своего запроса
  keyboard.push([Markup.button.callback('🔍 Свой запрос', 'images_custom_search')]);

  const message = `🖼️ <b>Галерея изображений NASA</b>\n\n` +
    `Выберите интересующую вас тему, и я покажу подборку изображений из архива NASA.\n\n` +
    `💡 <i>Или введите /images &lt;запрос&gt; для поиска по своему запросу</i>`;

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(keyboard),
  });
}

/**
 * Обработка выбора темы
 */
export async function handleImageTopic(ctx: Context & BotContext) {
  const data = getCallbackQueryData(ctx);
  if (!data) {
    await ctx.answerCbQuery('❌ Ошибка получения данных');
    return;
  }
  
  const topicId = data.replace('images_topic_', '');
  
  const topics = container.imagesApi.getPopularTopics();
  const topic = topics.find((t) => t.id === topicId);
  
  if (!topic) {
    await ctx.answerCbQuery('❌ Тема не найдена');
    return;
  }

  try {
    await ctx.answerCbQuery(`🔍 Ищу изображения по теме "${topic.name}"...`);
    await ctx.sendChatAction('upload_photo');
    
    const loading = await ctx.reply(`⏳ Загружаю изображения по теме "${topic.name}"...`);
    
    const images = await container.imagesApi.searchImages(topic.query, 20);
    
    if (images.length === 0) {
      await ctx.reply(
        `❌ По запросу "${topic.name}" изображений не найдено.\n\nПопробуйте другую тему или используйте /images &lt;ваш запрос&gt;`,
        { parse_mode: 'HTML' }
      );
      try { await ctx.deleteMessage(loading.message_id); } catch {}
      return;
    }

    // Сохраняем в сессию
    if (!ctx.session) ctx.session = {};
    if (!ctx.session.images) ctx.session.images = {};
    ctx.session.images.currentImages = images;
    ctx.session.images.currentIndex = 0;
    ctx.session.images.currentQuery = topic.name;

    // Показываем первое изображение
    await showImage(ctx, images[0], 0, images.length, topic.name);
    try { await ctx.deleteMessage(loading.message_id); } catch {}
  } catch (error) {
    console.error('Images Error:', error);
    await ctx.reply(
      '❌ Произошла ошибка при поиске изображений. Попробуйте позже.',
      Markup.inlineKeyboard([
        Markup.button.callback('🔄 Повторить', `images_topic_${topicId}`)
      ])
    );
  }
}

/**
 * Обработка поиска по текстовому запросу
 */
async function handleImageSearch(ctx: Context & BotContext, query: string) {
  try {
    await ctx.sendChatAction('upload_photo');
    const loading = await ctx.reply(`⏳ Ищу изображения по запросу "${query}"...`);
    
    const images = await container.imagesApi.searchImages(query, 20);
    
    if (images.length === 0) {
      await ctx.reply(
        `❌ По запросу "${query}" изображений не найдено.\n\n` +
        `💡 Попробуйте:\n` +
        `• Использовать английские слова (Mars, Apollo, Hubble)\n` +
        `• Выбрать тему из меню командой /images`,
        { parse_mode: 'HTML' }
      );
      try { await ctx.deleteMessage(loading.message_id); } catch {}
      return;
    }

    // Сохраняем в сессию
    if (!ctx.session) ctx.session = {};
    if (!ctx.session.images) ctx.session.images = {};
    ctx.session.images.currentImages = images;
    ctx.session.images.currentIndex = 0;
    ctx.session.images.currentQuery = query;

    // Показываем первое изображение
    await showImage(ctx, images[0], 0, images.length, query);
    try { await ctx.deleteMessage(loading.message_id); } catch {}
  } catch (error) {
    console.error('Image Search Error:', error);
    await ctx.reply('❌ Произошла ошибка при поиске изображений. Попробуйте позже.');
  }
}

/**
 * Показ изображения с навигацией
 * @param editMessageId - ID сообщения для редактирования (если указан, будет редактироваться, иначе - новое сообщение)
 */
async function showImage(
  ctx: Context & BotContext,
  image: NasaImage,
  index: number,
  total: number,
  query: string,
  editMessageId?: number
) {
  const dateText = image.dateCreated
    ? `\n📅 <i>${new Date(image.dateCreated).toLocaleDateString('ru-RU')}</i>`
    : '';

  const description = image.description
    ? `\n\n${image.description.substring(0, 400)}${image.description.length > 400 ? '...' : ''}`
    : '';

  const caption = `🖼️ <b>${image.title}</b>\n` +
    `🔍 Запрос: ${query}${dateText}${description}\n\n` +
    `📸 <i>NASA Image Library</i>\n` +
    `📊 ${index + 1}/${total}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⬅️', 'images_prev'),
      Markup.button.callback(`${index + 1}/${total}`, 'images_info'),
      Markup.button.callback('➡️', 'images_next'),
    ],
    [Markup.button.callback('🏠 Меню тем', 'images_menu')],
  ]);

  // Если есть ID сообщения для редактирования, редактируем его
  if (editMessageId) {
    try {
      await ctx.sendChatAction('upload_photo');
      await ctx.editMessageMedia(
        {
          type: 'photo',
          media: image.imageUrl,
          caption,
          parse_mode: 'HTML',
        },
        keyboard
      );
      return;
    } catch (error) {
      console.error('Error editing message:', error);
      // Если не удалось отредактировать (например, изменился тип медиа), удаляем и отправляем заново
      try {
        await ctx.deleteMessage(editMessageId);
      } catch {}
      // Продолжаем как новое сообщение
    }
  }

  // Отправка нового сообщения
  try {
    await ctx.replyWithPhoto(image.imageUrl, {
      caption,
      parse_mode: 'HTML',
      ...keyboard,
    });
  } catch (error) {
    console.error('Error sending photo:', error);
    // Если не удалось отправить фото, отправляем как ссылку
    await ctx.reply(
      `🖼️ <b>${image.title}</b>\n\n` +
      `${caption}\n\n` +
      `🔗 <a href="${image.imageUrl}">Открыть изображение</a>`,
      {
        parse_mode: 'HTML',
        ...keyboard,
        link_preview_options: { is_disabled: true },
      }
    );
  }
}

/**
 * Навигация: предыдущее изображение
 */
export async function handleImagePrev(ctx: Context & BotContext) {
  await handleImageNavigation(ctx, -1);
}

/**
 * Навигация: следующее изображение
 */
export async function handleImageNext(ctx: Context & BotContext) {
  await handleImageNavigation(ctx, 1);
}

/**
 * Общая функция навигации
 */
async function handleImageNavigation(ctx: Context & BotContext, direction: number) {
  try {
    await ctx.answerCbQuery();
  } catch {}

  if (!ctx.session?.images?.currentImages || ctx.session.images.currentImages.length === 0) {
    await ctx.reply('❌ Сессия просмотра истекла. Выберите тему заново: /images');
    try { await ctx.deleteMessage(); } catch {}
    return;
  }

  const currentIndex = ctx.session.images.currentIndex || 0;
  const images = ctx.session.images.currentImages;
  const query = ctx.session.images.currentQuery || 'Изображения';

  let newIndex = currentIndex + direction;
  
  // Циклическая навигация
  if (newIndex < 0) {
    newIndex = images.length - 1;
  } else if (newIndex >= images.length) {
    newIndex = 0;
  }

  ctx.session.images.currentIndex = newIndex;

  // Получаем ID текущего сообщения для редактирования
  const messageId = ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message
    ? ctx.callbackQuery.message.message_id
    : undefined;

  // Редактируем сообщение вместо удаления
  await showImage(ctx, images[newIndex], newIndex, images.length, query, messageId);
}

/**
 * Возврат в меню тем
 */
export async function handleImagesMenu(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch {}
  } catch {}

  return handleImages(ctx);
}

/**
 * Обработка нажатия на кнопку "Свой запрос"
 */
export async function handleImagesCustomSearch(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery('💡 Введите /images <ваш запрос>, например: /images Jupiter');
    await ctx.reply(
      `🔍 <b>Поиск по своему запросу</b>\n\n` +
      `Введите команду:\n` +
      `<code>/images ваш запрос</code>\n\n` +
      `<b>Примеры:</b>\n` +
      `• <code>/images Jupiter</code>\n` +
      `• <code>/images Space Station</code>\n` +
      `• <code>/images Black Hole</code>\n\n` +
      `💡 <i>Запросы лучше работают на английском языке</i>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Custom search error:', error);
  }
}

/**
 * Информация об изображении
 */
export async function handleImageInfo(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery('ℹ️ Информация о текущем изображении');
  } catch {}
}

