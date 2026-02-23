import { ipcMain } from 'electron';
import { app } from 'electron';
import type { DatabaseService } from '../../database/DatabaseService';
import { exchangeRateLimiter } from '../../utils/security';
import { mainLogger } from '../logger';
import { setLocale } from '../i18n';
import { API, TIMING, FALLBACKS } from '../../utils/constants';
import { safeHandle } from './safeHandle';

let cachedRates: { USD: number; EUR: number; timestamp: number } | null = null;

export function registerAppHandlers(getDbService: () => DatabaseService): void {
  // App version — no DB access, use ipcMain directly
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Language sync from renderer
  ipcMain.handle('app:setLanguage', (_event, locale: string) => {
    setLocale(locale);
  });

  // Exchange rate — no DB access, use ipcMain directly
  ipcMain.handle('exchange:getRates', async () => {
    if (cachedRates && Date.now() - cachedRates.timestamp < TIMING.EXCHANGE_RATE_CACHE) {
      return { USD: cachedRates.USD, EUR: cachedRates.EUR };
    }

    if (!exchangeRateLimiter.canMakeRequest()) {
      mainLogger.warn('Exchange rate API rate limit exceeded', 'ExchangeRate');
      if (cachedRates) {
        return { USD: cachedRates.USD, EUR: cachedRates.EUR };
      }
      return { USD: FALLBACKS.USD_RATE, EUR: FALLBACKS.EUR_RATE };
    }

    try {
      const response = await fetch(API.EXCHANGE_RATE_URL);
      const data = (await response.json()) as { rates: { TRY: number; EUR: number } };
      const rates = {
        USD: data.rates.TRY,
        EUR: data.rates.TRY / data.rates.EUR,
      };
      cachedRates = { ...rates, timestamp: Date.now() };
      return rates;
    } catch (error) {
      mainLogger.error('Exchange rate fetch error', 'ExchangeRate', error);
      if (cachedRates) {
        return { USD: cachedRates.USD, EUR: cachedRates.EUR };
      }
      return { USD: FALLBACKS.USD_RATE, EUR: FALLBACKS.EUR_RATE };
    }
  });

  // Database health checks — sanitize errors from DB operations
  safeHandle('db:checkIntegrity', () => getDbService().checkIntegrity());
  safeHandle('db:checkForeignKeys', () => getDbService().checkForeignKeys());
  safeHandle('db:getStats', () => getDbService().getStats());
}
