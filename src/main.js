import { Telegraf } from 'telegraf';
import { code } from 'telegraf/format';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';

const bot =  new Telegraf(config.get('TELEGRAM_BOT_TOKEN'));

/** Обработка  по фильтрам. Например, текст, голосовое сообщение */
bot.on(message('text'), async ctx => {
  try {
    await ctx.reply(code('Запрос принял. Жду ответа от сервера.'));
    
    const messages = [{ role: openai.roles.USER, content: ctx.message.text }]
    const response = await openai.chat(messages);
    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voice message: ', e.message);
  }
} )
bot.on(message('voice'), async ctx => {
  try {
    await ctx.reply(code('Запрос принял. Жду ответа от сервера.'))
    const voiceMessageFileLink = (await ctx.telegram.getFileLink(ctx.message.voice.file_id));
    const userId = String(ctx.message.from.id);

    const oggPath = await ogg.create(voiceMessageFileLink.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);
    await ctx.reply(`Ваш запрос: ${text}`);

    const messages = [{ role: openai.roles.USER, content: text }]
    const response = await openai.chat(messages);
    await ctx.reply(response.content);
  } catch (e) {
    console.log('Error while voice message: ', e.message);
  }
} )

/** Обработка команд */
bot.command('start', async ctx => {
  await ctx.reply(JSON.stringify(ctx.message, null, 2))
})


/** Start bot */
bot.launch();

/** Обработка остановки NODE */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));