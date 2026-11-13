import { app, IpcMainInvokeEvent } from 'electron';
import { exchangeRateLimiter } from '../../utils/security';
import { mainLogger } from '../logger';
import { setLocale } from '../i18n';
import { API, TIMING, FALLBACKS } from '../../utils/constants';
import { z } from 'zod';
import { parseInput } from '../../utils/schemas';
import { languageSchema } from '../../i18n';
import { safeHandle } from './safeHandle';

let cachedRates: { USD: number; EUR: number; timestamp: number } | null = null;

const exchangeRatesSchema = z.object({
  rates: z.object({ TRY: z.number().positive(), EUR: z.number().positive() }),
});

export function registerAppHandlers(): void {
  safeHandle('app:getVersion', () => app.getVersion());

  safeHandle('app:setLanguage', (_: IpcMainInvokeEvent, locale: unknown) => {
    setLocale(parseInput(languageSchema, locale));
  });

  safeHandle('exchange:getRates', async () => {
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
      const data = exchangeRatesSchema.parse(await response.json());
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
}
