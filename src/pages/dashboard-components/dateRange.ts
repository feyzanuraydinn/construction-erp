export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export const getDateRange = (filter: DateFilter): { start: Date | null; end: Date } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (filter) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    case 'week': {
      const daysSinceMonday = (now.getDay() + 6) % 7;
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysSinceMonday
      );
      return { start: startOfWeek, end };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    default:
      return { start: null, end };
  }
};
