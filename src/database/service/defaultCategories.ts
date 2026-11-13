import type { Database as SqlJsDatabase } from 'sql.js';
import type { ContextLogger } from '../../utils/logger';
import { queryRows } from '../sqlQuery';
import { runInSavepoint } from '../savepoint';

export function seedDefaultCategories(db: SqlJsDatabase, log: ContextLogger): void {
  const count = Number(
    queryRows<{ count: unknown }>(db, 'SELECT COUNT(*) as count FROM categories')[0]?.count ?? 0
  );
  if (count > 0) return;

  const categories = [
    { name: 'Daire/Konut Satışı', type: 'invoice_out', color: '#22c55e' },
    { name: 'Dükkan/Ofis Satışı', type: 'invoice_out', color: '#10b981' },
    { name: 'Arsa Satışı', type: 'invoice_out', color: '#14b8a6' },
    { name: 'Kira Geliri', type: 'invoice_out', color: '#06b6d4' },
    { name: 'Hakediş Faturası', type: 'invoice_out', color: '#3b82f6' },
    { name: 'Hizmet Geliri', type: 'invoice_out', color: '#6366f1' },
    { name: 'Diğer Gelir', type: 'invoice_out', color: '#84cc16' },
    { name: 'Arsa Maliyeti', type: 'invoice_in', color: '#ef4444' },
    { name: 'Hafriyat', type: 'invoice_in', color: '#f97316' },
    { name: 'Beton', type: 'invoice_in', color: '#84cc16' },
    { name: 'Demir/Çelik', type: 'invoice_in', color: '#64748b' },
    { name: 'İşçilik', type: 'invoice_in', color: '#8b5cf6' },
    { name: 'Kalıp/İskele', type: 'invoice_in', color: '#a855f7' },
    { name: 'Elektrik Malzeme', type: 'invoice_in', color: '#eab308' },
    { name: 'Sıhhi Tesisat', type: 'invoice_in', color: '#06b6d4' },
    { name: 'Boya/Kaplama', type: 'invoice_in', color: '#ec4899' },
    { name: 'Seramik/Fayans', type: 'invoice_in', color: '#14b8a6' },
    { name: 'Kapı/Pencere', type: 'invoice_in', color: '#f59e0b' },
    { name: 'Çatı/İzolasyon', type: 'invoice_in', color: '#78716c' },
    { name: 'Peyzaj', type: 'invoice_in', color: '#22c55e' },
    { name: 'Proje/Ruhsat', type: 'invoice_in', color: '#6366f1' },
    { name: 'Taşeron Faturası', type: 'invoice_in', color: '#0ea5e9' },
    { name: 'Nakliye', type: 'invoice_in', color: '#f43f5e' },
    { name: 'Ofis Kirası', type: 'invoice_in', color: '#ef4444' },
    { name: 'Elektrik/Su/Doğalgaz', type: 'invoice_in', color: '#f97316' },
    { name: 'Personel Maaşları', type: 'invoice_in', color: '#8b5cf6' },
    { name: 'SGK Primleri', type: 'invoice_in', color: '#a855f7' },
    { name: 'Vergi', type: 'invoice_in', color: '#ef4444' },
    { name: 'Muhasebe/Danışmanlık', type: 'invoice_in', color: '#6366f1' },
    { name: 'Araç Giderleri', type: 'invoice_in', color: '#64748b' },
    { name: 'Diğer Gider', type: 'invoice_in', color: '#71717a' },
    { name: 'Nakit', type: 'payment', color: '#22c55e' },
    { name: 'EFT/Havale', type: 'payment', color: '#3b82f6' },
    { name: 'Çek', type: 'payment', color: '#f59e0b' },
    { name: 'Senet', type: 'payment', color: '#f97316' },
    { name: 'Kredi Kartı', type: 'payment', color: '#8b5cf6' },
    { name: 'Takas/Mahsup', type: 'payment', color: '#64748b' },
  ];

  try {
    runInSavepoint(db, () => {
      for (const cat of categories) {
        db.run('INSERT INTO categories (name, type, color, is_default) VALUES (?, ?, ?, 1)', [
          cat.name,
          cat.type,
          cat.color,
        ]);
      }
    });
  } catch (error) {
    log.error('Default categories could not be created', error);
  }
}
