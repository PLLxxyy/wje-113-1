import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Snack, NutritionGrade } from '../../shared/types.js';

const router = Router();

function mapSnackRow(row: any): Snack {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    image: row.image,
    calories: row.calories,
    sugar: row.sugar,
    fat: row.fat,
    sodium: row.sodium,
    protein: row.protein,
    carbohydrates: row.carbohydrates,
    fiber: row.fiber,
    servingSize: row.serving_size,
    healthScore: row.health_score,
    nutritionGrade: {
      calories: row.nutrition_grade_calories,
      sugar: row.nutrition_grade_sugar,
      fat: row.nutrition_grade_fat,
      sodium: row.nutrition_grade_sodium,
    } as NutritionGrade,
    isApproved: row.is_approved === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const rows = db
      .prepare(
        `SELECT s.*, f.created_at as favorited_at
         FROM favorites f
         INNER JOIN snacks s ON f.snack_id = s.id
         WHERE f.user_id = ? AND s.is_approved = 1
         ORDER BY f.created_at DESC`
      )
      .all(req.user.userId) as any[];

    const snacks = rows.map((row) => {
      const snack = mapSnackRow(row);
      const avgResult = db
        .prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM comments WHERE snack_id = ?')
        .get(row.id) as { avg: number | null; count: number };
      snack.avgRating = avgResult.avg ? Math.round(avgResult.avg * 10) / 10 : 0;
      snack.reviewCount = avgResult.count;
      return snack;
    });

    res.json({ success: true, data: snacks });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/check/:snackId', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.snackId, 10);
    const favorite = db
      .prepare('SELECT id FROM favorites WHERE user_id = ? AND snack_id = ?')
      .get(req.user.userId, snackId) as { id: number } | undefined;

    res.json({ success: true, data: { isFavorited: !!favorite } });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/:snackId', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.snackId, 10);
    const snack = db.prepare('SELECT id FROM snacks WHERE id = ?').get(snackId) as any;

    if (!snack) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM favorites WHERE user_id = ? AND snack_id = ?')
      .get(req.user.userId, snackId) as { id: number } | undefined;

    if (existing) {
      res.status(400).json({ success: false, error: '已收藏该零食' });
      return;
    }

    db.prepare('INSERT INTO favorites (user_id, snack_id) VALUES (?, ?)').run(
      req.user.userId,
      snackId
    );

    res.status(201).json({ success: true, message: '收藏成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.delete('/:snackId', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.snackId, 10);
    const result = db
      .prepare('DELETE FROM favorites WHERE user_id = ? AND snack_id = ?')
      .run(req.user.userId, snackId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '未收藏该零食' });
      return;
    }

    res.json({ success: true, message: '取消收藏成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
