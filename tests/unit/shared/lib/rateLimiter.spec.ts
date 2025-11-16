import { rateLimitMiddleware } from '../../../src/shared/lib/rateLimiter';
import { BotContext } from '../../../src/processes/bot/types';

describe('rateLimitMiddleware', () => {
  let mockCtx: Partial<BotContext>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn().mockResolvedValue(undefined);
    mockCtx = {
      from: { id: 123 },
      reply: jest.fn().mockResolvedValue(undefined),
      answerCbQuery: jest.fn().mockResolvedValue(true),
    };
    jest.clearAllMocks();
  });

  it('должен пропускать запросы без userId', async () => {
    const ctx = { ...mockCtx, from: undefined } as BotContext;
    const middleware = rateLimitMiddleware();

    await middleware(ctx, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('должен пропускать другие типы запросов (не команды и не callback)', async () => {
    const ctx = {
      ...mockCtx,
      message: { text: 'regular text' },
    } as BotContext;

    const middleware = rateLimitMiddleware();

    await middleware(ctx, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('должен пропускать команды в пределах лимита', async () => {
    const ctx = {
      ...mockCtx,
      message: { text: '/start' },
    } as BotContext;

    const middleware = rateLimitMiddleware();

    // Выполняем несколько запросов в пределах лимита (20 команд)
    for (let i = 0; i < 5; i++) {
      await middleware(ctx, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(5);
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it('должен блокировать команды при превышении лимита', async () => {
    const ctx = {
      ...mockCtx,
      message: { text: '/start' },
    } as BotContext;

    const middleware = rateLimitMiddleware();

    // Выполняем больше запросов, чем лимит (20 команд)
    for (let i = 0; i < 25; i++) {
      await middleware(ctx, mockNext);
    }

    // Первые 20 должны пройти, остальные заблокированы
    expect(mockNext.mock.calls.length).toBeLessThanOrEqual(20);
    expect(mockCtx.reply).toHaveBeenCalled();
  });

  it('должен пропускать callback queries в пределах лимита', async () => {
    const ctx = {
      ...mockCtx,
      callbackQuery: { data: 'test_data' },
    } as BotContext;

    const middleware = rateLimitMiddleware();

    // Выполняем несколько запросов в пределах лимита (60 callbacks)
    for (let i = 0; i < 10; i++) {
      await middleware(ctx, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });

  it('должен отвечать на callback query при блокировке', async () => {
    const ctx = {
      ...mockCtx,
      callbackQuery: { data: 'test_data' },
    } as BotContext;

    const middleware = rateLimitMiddleware();

    // Выполняем больше запросов, чем лимит (60 callbacks)
    for (let i = 0; i < 65; i++) {
      await middleware(ctx, mockNext);
    }

    expect(mockCtx.answerCbQuery).toHaveBeenCalled();
  });
});

