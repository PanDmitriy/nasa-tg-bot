import dotenv from 'dotenv';
dotenv.config();

import { Telegraf, session } from 'telegraf';
import { code } from 'telegraf/format';
import { message } from 'telegraf/filters';
import { ogg } from './ogg.js';
import { openai } from './openai.js';
import { nasa } from './nasa.js';

const INIT_SESSION = {
  messages: [],
};

const COMMANDS = [
  { command: "start", description: "Запуск" },
  { command: "new", description: "Новый чат с GPT" },
  { command: "apod", description: "NASA. Астрономическое фото дня" }
];

const bot =  new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.use(session());
bot.telegram.setMyCommands(COMMANDS);

/** Обработка команд */
bot.command('start', async ctx => {
  ctx.session = INIT_SESSION;
  await ctx.reply('Жду вашего голосового или тексового запроса')
});

bot.command('new', async ctx => {
  ctx.session = INIT_SESSION;
  await ctx.reply('Жду вашего голосового или тексового запроса')
})

bot.command('apod', async ctx => {
  const photo = await nasa.getPhotoOfDay();
  await ctx.replyWithPhoto(photo.url, {caption: photo.title });
  await ctx.reply(photo.explanation);
  photo.copyright && await ctx.reply(`Автор ${photo.copyright}`);
})
/** ---------- */

/** Обработка текстового сообщения */
bot.on(message('text'), async ctx => {
  try {
    if(!ctx.session) {
      ctx.session = INIT_SESSION;
    };
    await ctx.reply(code('Запрос принял. Жду ответа от сервера.'));
    ctx.session.messages.push({ role: openai.roles.USER, content: ctx.message.text });

    const response = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voice message: ', e.message);
  }
} )
/** ---------- */

/** Обработка голосового сообщения */
bot.on(message('voice'), async ctx => {
  try {
    if(!ctx.session) {
      ctx.session = INIT_SESSION;
    };

    await ctx.reply(code('Запрос принял. Жду ответа от сервера.'))
    const voiceMessageFileLink = (await ctx.telegram.getFileLink(ctx.message.voice.file_id));
    const userId = String(ctx.message.from.id);

    const oggPath = await ogg.create(voiceMessageFileLink.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);
    await ctx.reply(`Ваш запрос: ${text}`);

    ctx.session.messages.push({ role: openai.roles.USER, content: text });

    const response = await openai.chat(ctx.session.messages);
    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content });

    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voice message: ', e.message);
  }
} )
/** ---------- */


/** Start bot */
bot.launch();

/** Обработка остановки NODE */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));