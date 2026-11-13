import type { Database as SqlJsDatabase } from 'sql.js';
import { BaseRepository } from './BaseRepository';
import type { Category } from '../../types';
import type { CategoryInput } from '../../utils/schemas';
import { DEFAULT_CATEGORY_COLOR } from '../../utils/constants';

export class CategoryRepository extends BaseRepository<Category> {
  constructor(db: SqlJsDatabase) {
    super(db, 'categories');
  }

  getAll(): Category[] {
    return this.query(`SELECT * FROM categories ORDER BY type, name`);
  }

  create(data: CategoryInput): Category {
    const result = this.run(`INSERT INTO categories (name, type, color) VALUES (?, ?, ?)`, [
      data.name,
      data.type,
      data.color || DEFAULT_CATEGORY_COLOR,
    ]);
    return this.requireRow(
      this.queryOne<Category>(`SELECT * FROM categories WHERE id = ?`, [result.lastInsertRowid])
    );
  }

  delete(id: number): { success: boolean } {
    const category = this.queryOne<Category>(`SELECT * FROM categories WHERE id = ?`, [id]);
    if (!category) return { success: false };
    if (category.is_default) return { success: false };
    this.run(`DELETE FROM categories WHERE id = ?`, [id]);
    return { success: true };
  }
}
