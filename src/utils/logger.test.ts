import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  const consoleLog = console.log;
  const consoleWarn = console.warn;
  const consoleError = console.error;

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = consoleLog;
    console.warn = consoleWarn;
    console.error = consoleError;
    vi.resetAllMocks();
  });

  it('usa console.error para logger.error', () => {
    logger.error('error mensaje');
    expect(console.error).toHaveBeenCalledWith('error mensaje');
  });

  it('no rompe cuando llama logger.log', () => {
    logger.log('info mensaje');
    if (import.meta.env.DEV) {
      expect(console.log).toHaveBeenCalledWith('info mensaje');
    } else {
      expect(console.log).not.toHaveBeenCalled();
    }
  });

  it('no rompe cuando llama logger.warn', () => {
    logger.warn('warn mensaje');
    if (import.meta.env.DEV) {
      expect(console.warn).toHaveBeenCalledWith('warn mensaje');
    } else {
      expect(console.warn).not.toHaveBeenCalled();
    }
  });
});
