import { describe, it, expect, afterEach, vi } from 'vitest';
import { getDateRange } from '../../pages/dashboard-components/dateRange';

afterEach(() => {
  vi.useRealTimers();
});

describe('Dashboard getDateRange', () => {
  it('starts "this week" on the previous Monday when today is Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 14, 0));

    const { start, end } = getDateRange('week');

    expect(start).toEqual(new Date(2026, 10, 9));
    expect(start && start <= end).toBe(true);
  });

  it('starts "this week" today when today is Monday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 9, 0));

    expect(getDateRange('week').start).toEqual(new Date(2026, 10, 9));
  });
});
