import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { DietItem } from '../../shared/types.js';

const router = Router();

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { date } = req.query;
    let query = `
      SELECT d.*, s.name as snack_name, s.image as snack_image, 
             s.calories, s.protein, s.sugar, s.fat
      FROM diet_items d
      INNER JOIN snacks s ON d.snack_id = s.id
      WHERE d.user_id = ?
    `;
    const params: any[] = [req.user.userId];

    if (date) {
      query += ' AND d.date = ?';
      params.push(date);
    }

    query += ' ORDER BY d.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    const dietItems: DietItem[] = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      snackId: row.snack_id,
      snackName: row.snack_name,
      quantity: row.quantity,
      date: row.date,
      mealType: row.meal_type,
      createdAt: row.created_at,
    }));

    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalSugar: 0,
      totalFat: 0,
      items: dietItems,
    };

    for (const row of rows) {
      summary.totalCalories += row.calories * row.quantity;
      summary.totalProtein += row.protein * row.quantity;
      summary.totalSugar += row.sugar * row.quantity;
      summary.totalFat += row.fat * row.quantity;
    }

    summary.totalCalories = Math.round(summary.totalCalories);
    summary.totalProtein = Math.round(summary.totalProtein * 10) / 10;
    summary.totalSugar = Math.round(summary.totalSugar * 10) / 10;
    summary.totalFat = Math.round(summary.totalFat * 10) / 10;

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/range', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: '开始日期和结束日期不能为空' });
      return;
    }

    const rows = db
      .prepare(
        `SELECT d.date, d.meal_type, d.quantity, 
                s.name as snack_name, s.calories, s.protein, s.sugar, s.fat
         FROM diet_items d
         INNER JOIN snacks s ON d.snack_id = s.id
         WHERE d.user_id = ? AND d.date >= ? AND d.date <= ?
         ORDER BY d.date, d.created_at`
      )
      .all(req.user.userId, startDate, endDate) as any[];

    const byDate: Record<string, any> = {};
    for (const row of rows) {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          date: row.date,
          totalCalories: 0,
          totalProtein: 0,
          totalSugar: 0,
          totalFat: 0,
          items: [],
        };
      }
      byDate[row.date].totalCalories += row.calories * row.quantity;
      byDate[row.date].totalProtein += row.protein * row.quantity;
      byDate[row.date].totalSugar += row.sugar * row.quantity;
      byDate[row.date].totalFat += row.fat * row.quantity;
      byDate[row.date].items.push({
        snackId: row.snack_id,
        snackName: row.snack_name,
        quantity: row.quantity,
        mealType: row.meal_type,
        calories: row.calories * row.quantity,
      });
    }

    const result = Object.values(byDate).map((d) => ({
      ...d,
      totalCalories: Math.round(d.totalCalories),
      totalProtein: Math.round(d.totalProtein * 10) / 10,
      totalSugar: Math.round(d.totalSugar * 10) / 10,
      totalFat: Math.round(d.totalFat * 10) / 10,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { snackId, quantity, date, mealType } = req.body;

    if (!snackId) {
      res.status(400).json({ success: false, error: '零食ID不能为空' });
      return;
    }

    const snack = db.prepare('SELECT id FROM snacks WHERE id = ?').get(snackId) as any;
    if (!snack) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const finalMealType = validMealTypes.includes(mealType) ? mealType : 'snack';
    const finalQuantity = parseInt(quantity as string, 10) || 1;
    const finalDate = date || new Date().toISOString().split('T')[0];

    const info = db
      .prepare(
        'INSERT INTO diet_items (user_id, snack_id, quantity, date, meal_type) VALUES (?, ?, ?, ?, ?)'
      )
      .run(req.user.userId, snackId, finalQuantity, finalDate, finalMealType);

    res.status(201).json({
      success: true,
      message: '已添加到饮食计划',
      data: { id: info.lastInsertRowid as number },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.put('/:id', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const existing = db
      .prepare('SELECT * FROM diet_items WHERE id = ? AND user_id = ?')
      .get(id, req.user.userId) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: '饮食记录不存在' });
      return;
    }

    const { quantity, date, mealType } = req.body;

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const finalMealType = validMealTypes.includes(mealType) ? mealType : existing.meal_type;
    const finalQuantity = quantity ? parseInt(quantity as string, 10) : existing.quantity;
    const finalDate = date || existing.date;

    db.prepare(
      'UPDATE diet_items SET quantity = ?, date = ?, meal_type = ? WHERE id = ?'
    ).run(finalQuantity, finalDate, finalMealType, id);

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.delete('/:id', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const result = db
      .prepare('DELETE FROM diet_items WHERE id = ? AND user_id = ?')
      .run(id, req.user.userId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '饮食记录不存在' });
      return;
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
