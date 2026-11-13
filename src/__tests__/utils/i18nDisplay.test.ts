import { describe, it, expect, afterEach } from 'vitest';
import { i18n } from '../../i18n';
import { categoryLabel } from '../../utils/categories';
import { formatPercent } from '../../utils/formatters';

afterEach(async () => {
  await i18n.changeLanguage('tr');
});

describe('categoryLabel', () => {
  it('translates default (Turkish-stored) categories', async () => {
    await i18n.changeLanguage('en');
    expect(categoryLabel(i18n.t, 'Beton')).not.toBe('');
    expect(categoryLabel(i18n.t, 'Beton')).toBe(i18n.t('categories.Beton'));
  });

  it('shows user-created categories as entered and the uncategorized bucket as "other"', async () => {
    await i18n.changeLanguage('en');
    expect(categoryLabel(i18n.t, 'Benim Kategorim')).toBe('Benim Kategorim');
    expect(categoryLabel(i18n.t, 'Diğer')).toBe(i18n.t('analytics.other'));
    expect(categoryLabel(i18n.t, null)).toBe(i18n.t('analytics.other'));
  });
});

describe('formatPercent', () => {
  it('puts the sign where each language expects it', async () => {
    await i18n.changeLanguage('tr');
    expect(formatPercent(42).replace(/\s/g, '')).toBe('%42');
    await i18n.changeLanguage('en');
    expect(formatPercent(42)).toBe('42%');
  });
});

describe('English plurals', () => {
  it('uses the singular for a count of one', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('shared.bulkDelete.buttonLabel', { count: 1 })).toBe('Delete 1 transaction');
    expect(i18n.t('shared.bulkDelete.buttonLabel', { count: 3 })).toBe('Delete 3 transactions');
    expect(i18n.t('companies.relatedProjects', { count: 1 })).toBe('1 project');
  });

  it('keeps Turkish unchanged (no plural nouns after numbers)', async () => {
    await i18n.changeLanguage('tr');
    expect(i18n.t('shared.bulkDelete.buttonLabel', { count: 1 })).toBe(
      i18n.t('shared.bulkDelete.buttonLabel', { count: 5 }).replace('5', '1')
    );
  });
});
