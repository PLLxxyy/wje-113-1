import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { calculateHealthScore, calculateNutritionGrade } from '../db/database.js';
import type { Snack, Ingredient, Comment, NutritionGrade } from '../../shared/types.js';

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

function getIngredients(snackId: number): Ingredient[] {
  const rows = db
    .prepare('SELECT * FROM ingredients WHERE snack_id = ?')
    .all(snackId) as any[];
  return rows.map((row) => ({
    id: row.id,
    snackId: row.snack_id,
    name: row.name,
    isHarmful: row.is_harmful === 1,
  }));
}

function getComments(snackId: number): Comment[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.username 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.snack_id = ? 
       ORDER BY c.created_at DESC`
    )
    .all(snackId) as any[];
  return rows.map((row) => ({
    id: row.id,
    snackId: row.snack_id,
    userId: row.user_id,
    username: row.username,
    content: row.content,
    rating: row.rating,
    createdAt: row.created_at,
  }));
}

function getAvgRating(snackId: number): number {
  const result = db
    .prepare('SELECT AVG(rating) as avg FROM comments WHERE snack_id = ?')
    .get(snackId) as { avg: number | null };
  return result.avg ? Math.round(result.avg * 10) / 10 : 0;
}

function getReviewCount(snackId: number): number {
  const result = db
    .prepare('SELECT COUNT(*) as count FROM comments WHERE snack_id = ?')
    .get(snackId) as { count: number };
  return result.count;
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const {
      category,
      search,
      sort = 'created_at',
      order = 'desc',
      page = '1',
      limit = '12',
      minHealthScore,
      maxCalories,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM snacks WHERE is_approved = 1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (minHealthScore) {
      query += ' AND health_score >= ?';
      params.push(parseInt(minHealthScore as string, 10));
    }

    if (maxCalories) {
      query += ' AND calories <= ?';
      params.push(parseInt(maxCalories as string, 10));
    }

    const validSortFields = [
      'created_at',
      'health_score',
      'calories',
      'sugar',
      'protein',
      'name',
    ];
    const sortField = validSortFields.includes(sort as string) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const totalResult = db.prepare(countQuery).get(...params) as { count: number };
    const total = totalResult.count;

    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const rows = db.prepare(query).all(...params) as any[];
    const snacks = rows.map((row) => {
      const snack = mapSnackRow(row);
      snack.avgRating = getAvgRating(row.id);
      snack.reviewCount = getReviewCount(row.id);
      return snack;
    });

    res.json({
      success: true,
      data: {
        snacks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/categories', (req: Request, res: Response): void => {
  try {
    const rows = db
      .prepare('SELECT DISTINCT category FROM snacks WHERE is_approved = 1 ORDER BY category')
      .all() as { category: string }[];
    const categories = rows.map((r) => r.category);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/popular', (req: Request, res: Response): void => {
  try {
    const limit = parseInt((req.query.limit as string) || '8', 10);
    const rows = db
      .prepare(
        `SELECT s.*, 
                (SELECT COUNT(*) FROM comments c WHERE c.snack_id = s.id) as review_count,
                (SELECT AVG(rating) FROM comments c WHERE c.snack_id = s.id) as avg_rating
         FROM snacks s 
         WHERE s.is_approved = 1
         ORDER BY avg_rating DESC, review_count DESC, s.health_score DESC
         LIMIT ?`
      )
      .all(limit) as any[];

    const snacks = rows.map((row) => {
      const snack = mapSnackRow(row);
      snack.avgRating = Math.round((row.avg_rating || 0) * 10) / 10;
      snack.reviewCount = row.review_count;
      return snack;
    });

    res.json({ success: true, data: snacks });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = db.prepare('SELECT * FROM snacks WHERE id = ?').get(id) as any;

    if (!row) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    const snack = mapSnackRow(row);
    snack.ingredients = getIngredients(id);
    snack.comments = getComments(id);
    snack.avgRating = getAvgRating(id);
    snack.reviewCount = getReviewCount(id);

    res.json({ success: true, data: snack });
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

    const {
      name,
      brand,
      category,
      description,
      image,
      calories,
      sugar,
      fat,
      sodium,
      protein,
      carbohydrates,
      fiber,
      servingSize,
      ingredients,
    } = req.body;

    if (!name || !brand || !category) {
      res.status(400).json({ success: false, error: '名称、品牌和分类不能为空' });
      return;
    }

    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const hasHarmful = ingredientList.some((i: any) => i.isHarmful);

    const healthScore = calculateHealthScore({
      calories: calories || 0,
      sugar: sugar || 0,
      fat: fat || 0,
      sodium: sodium || 0,
      protein: protein || 0,
      hasHarmfulIngredients: hasHarmful,
    });

    const grade = calculateNutritionGrade({
      calories: calories || 0,
      sugar: sugar || 0,
      fat: fat || 0,
      sodium: sodium || 0,
    });

    const info = db
      .prepare(
        `INSERT INTO snacks (
          name, brand, category, description, image, calories, sugar, fat, sodium, protein,
          carbohydrates, fiber, serving_size, health_score, nutrition_grade_calories,
          nutrition_grade_sugar, nutrition_grade_fat, nutrition_grade_sodium, is_approved, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        name,
        brand,
        category,
        description || '',
        image || '',
        calories || 0,
        sugar || 0,
        fat || 0,
        sodium || 0,
        protein || 0,
        carbohydrates || 0,
        fiber || 0,
        servingSize || '',
        healthScore,
        grade.calories,
        grade.sugar,
        grade.fat,
        grade.sodium,
        req.user.userId
      );

    const snackId = info.lastInsertRowid as number;

    const insertIngredient = db.prepare(
      'INSERT INTO ingredients (snack_id, name, is_harmful) VALUES (?, ?, ?)'
    );
    for (const ing of ingredientList) {
      if (ing.name) {
        insertIngredient.run(snackId, ing.name, ing.isHarmful ? 1 : 0);
      }
    }

    db.prepare(
      'INSERT INTO reviews (snack_id, submitted_by, status) VALUES (?, ?, ?)'
    ).run(snackId, req.user.userId, 'pending');

    res.status(201).json({
      success: true,
      message: '零食已提交审核',
      data: { id: snackId },
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
    const existing = db.prepare('SELECT * FROM snacks WHERE id = ?').get(id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    if (req.user.role !== 'admin' && existing.created_by !== req.user.userId) {
      res.status(403).json({ success: false, error: '无权修改此零食' });
      return;
    }

    const {
      name,
      brand,
      category,
      description,
      image,
      calories,
      sugar,
      fat,
      sodium,
      protein,
      carbohydrates,
      fiber,
      servingSize,
      ingredients,
    } = req.body;

    const ingredientList = Array.isArray(ingredients) ? ingredients : null;
    let hasHarmful: boolean;

    if (ingredientList) {
      hasHarmful = ingredientList.some((i: any) => i.isHarmful);
    } else {
      const existingIngs = db
        .prepare('SELECT is_harmful FROM ingredients WHERE snack_id = ?')
        .all(id) as { is_harmful: number }[];
      hasHarmful = existingIngs.some((i) => i.is_harmful === 1);
    }

    const finalCalories = calories ?? existing.calories;
    const finalSugar = sugar ?? existing.sugar;
    const finalFat = fat ?? existing.fat;
    const finalSodium = sodium ?? existing.sodium;
    const finalProtein = protein ?? existing.protein;

    const healthScore = calculateHealthScore({
      calories: finalCalories,
      sugar: finalSugar,
      fat: finalFat,
      sodium: finalSodium,
      protein: finalProtein,
      hasHarmfulIngredients: hasHarmful,
    });

    const grade = calculateNutritionGrade({
      calories: finalCalories,
      sugar: finalSugar,
      fat: finalFat,
      sodium: finalSodium,
    });

    db.prepare(
      `UPDATE snacks SET
        name = ?, brand = ?, category = ?, description = ?, image = ?,
        calories = ?, sugar = ?, fat = ?, sodium = ?, protein = ?,
        carbohydrates = ?, fiber = ?, serving_size = ?,
        health_score = ?, nutrition_grade_calories = ?, nutrition_grade_sugar = ?,
        nutrition_grade_fat = ?, nutrition_grade_sodium = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    ).run(
      name ?? existing.name,
      brand ?? existing.brand,
      category ?? existing.category,
      description ?? existing.description,
      image ?? existing.image,
      finalCalories,
      finalSugar,
      finalFat,
      finalSodium,
      finalProtein,
      carbohydrates ?? existing.carbohydrates,
      fiber ?? existing.fiber,
      servingSize ?? existing.serving_size,
      healthScore,
      grade.calories,
      grade.sugar,
      grade.fat,
      grade.sodium,
      id
    );

    if (ingredientList) {
      db.prepare('DELETE FROM ingredients WHERE snack_id = ?').run(id);
      const insertIngredient = db.prepare(
        'INSERT INTO ingredients (snack_id, name, is_harmful) VALUES (?, ?, ?)'
      );
      for (const ing of ingredientList) {
        if (ing.name) {
          insertIngredient.run(id, ing.name, ing.isHarmful ? 1 : 0);
        }
      }
    }

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
    const existing = db.prepare('SELECT * FROM snacks WHERE id = ?').get(id) as any;

    if (!existing) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    if (req.user.role !== 'admin' && existing.created_by !== req.user.userId) {
      res.status(403).json({ success: false, error: '无权删除此零食' });
      return;
    }

    db.prepare('DELETE FROM snacks WHERE id = ?').run(id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/:id/comments', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.id, 10);
    const snack = db.prepare('SELECT id FROM snacks WHERE id = ?').get(snackId) as any;

    if (!snack) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    const { content, rating } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: '评论内容不能为空' });
      return;
    }

    const ratingNum = Math.min(5, Math.max(1, parseInt(rating as string, 10) || 5));

    const info = db
      .prepare('INSERT INTO comments (snack_id, user_id, content, rating) VALUES (?, ?, ?, ?)')
      .run(snackId, req.user.userId, content, ratingNum);

    const commentId = info.lastInsertRowid as number;
    const comment = db
      .prepare(
        `SELECT c.*, u.username 
         FROM comments c 
         LEFT JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`
      )
      .get(commentId) as any;

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        snackId: comment.snack_id,
        userId: comment.user_id,
        username: comment.username,
        content: comment.content,
        rating: comment.rating,
        createdAt: comment.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/:id/comments', (req: Request, res: Response): void => {
  try {
    const snackId = parseInt(req.params.id, 10);
    const comments = getComments(snackId);
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/:id/submit-review', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.id, 10);
    const snack = db.prepare('SELECT * FROM snacks WHERE id = ?').get(snackId) as any;

    if (!snack) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    if (snack.is_approved === 1) {
      res.status(400).json({ success: false, error: '该零食已通过审核' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE snack_id = ? AND status = ? AND type = ?')
      .get(snackId, 'pending', 'new_snack') as any;

    if (existing) {
      res.status(400).json({ success: false, error: '该零食正在审核中' });
      return;
    }

    db.prepare(
      'INSERT INTO reviews (snack_id, type, submitted_by, status) VALUES (?, ?, ?, ?)'
    ).run(snackId, 'new_snack', req.user.userId, 'pending');

    res.json({ success: true, message: '已提交审核' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/:id/correction', authMiddleware, (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const snackId = parseInt(req.params.id, 10);
    const snack = db.prepare('SELECT * FROM snacks WHERE id = ?').get(snackId) as any;

    if (!snack) {
      res.status(404).json({ success: false, error: '零食不存在' });
      return;
    }

    const correction = req.body;
    if (!correction || Object.keys(correction).length === 0) {
      res.status(400).json({ success: false, error: '修正内容不能为空' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE snack_id = ? AND status = ? AND type = ?')
      .get(snackId, 'pending', 'correction') as any;

    if (existing) {
      res.status(400).json({ success: false, error: '该零食已有待审核的修正' });
      return;
    }

    const correctionData = JSON.stringify(correction);

    db.prepare(
      'INSERT INTO reviews (snack_id, type, correction_data, submitted_by, status) VALUES (?, ?, ?, ?, ?)'
    ).run(snackId, 'correction', correctionData, req.user.userId, 'pending');

    res.status(201).json({ success: true, message: '修正已提交审核' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
