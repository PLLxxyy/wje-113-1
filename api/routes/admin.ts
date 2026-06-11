import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { calculateHealthScore, calculateNutritionGrade } from '../db/database.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import type { Snack, NutritionGrade, Review } from '../../shared/types.js';

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

router.use(authMiddleware, adminMiddleware);

router.get('/reviews', (req: Request, res: Response): void => {
  try {
    const { status = 'pending', type, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const validStatuses = ['pending', 'approved', 'rejected'];
    const statusFilter = validStatuses.includes(status as string) ? status : 'pending';

    let countQuery = 'SELECT COUNT(*) as count FROM reviews WHERE status = ?';
    let listQuery = `SELECT r.*, s.name as snack_name, s.brand as snack_brand, s.image as snack_image,
                     u.username as submitter_name
              FROM reviews r
              INNER JOIN snacks s ON r.snack_id = s.id
              INNER JOIN users u ON r.submitted_by = u.id
              WHERE r.status = ?`;
    const countParams: any[] = [statusFilter];
    const listParams: any[] = [statusFilter];

    if (type && (type === 'new_snack' || type === 'correction')) {
      countQuery += ' AND type = ?';
      listQuery += ' AND r.type = ?';
      countParams.push(type);
      listParams.push(type);
    }

    const totalResult = db.prepare(countQuery).get(...countParams) as { count: number };
    const total = totalResult.count;

    listQuery += ' ORDER BY r.submitted_at DESC LIMIT ? OFFSET ?';
    listParams.push(limitNum, offset);

    const rows = db.prepare(listQuery).all(...listParams) as any[];

    const reviews = rows.map((row) => ({
      id: row.id,
      snackId: row.snack_id,
      type: row.type || 'new_snack',
      correctionData: row.correction_data,
      snackName: row.snack_name,
      snackBrand: row.snack_brand,
      snackImage: row.snack_image,
      submittedBy: row.submitted_by,
      submitterName: row.submitter_name,
      status: row.status,
      reviewNote: row.review_note,
      reviewerId: row.reviewer_id,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
    })) as any[];

    res.json({
      success: true,
      data: {
        reviews,
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

router.get('/reviews/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = db
      .prepare(
        `SELECT r.*, s.name as snack_name, s.brand as snack_brand, s.image as snack_image,
                s.description as snack_description, s.category as snack_category,
                s.calories, s.sugar, s.fat, s.sodium, s.protein,
                s.carbohydrates, s.fiber, s.serving_size, s.health_score,
                u.username as submitter_name, u.email as submitter_email
         FROM reviews r
         INNER JOIN snacks s ON r.snack_id = s.id
         INNER JOIN users u ON r.submitted_by = u.id
         WHERE r.id = ?`
      )
      .get(id) as any;

    if (!row) {
      res.status(404).json({ success: false, error: '审核记录不存在' });
      return;
    }

    const ingredients = db
      .prepare('SELECT id, name, is_harmful FROM ingredients WHERE snack_id = ?')
      .all(row.snack_id) as any[];

    const reviewType = row.type || 'new_snack';

    const review: any = {
      id: row.id,
      type: reviewType,
      correctionData: row.correction_data,
      snack: {
        id: row.snack_id,
        name: row.snack_name,
        brand: row.snack_brand,
        category: row.snack_category,
        description: row.snack_description,
        image: row.snack_image,
        calories: row.calories,
        sugar: row.sugar,
        fat: row.fat,
        sodium: row.sodium,
        protein: row.protein,
        carbohydrates: row.carbohydrates,
        fiber: row.fiber,
        servingSize: row.serving_size,
        healthScore: row.health_score,
        ingredients: ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          isHarmful: i.is_harmful === 1,
        })),
      },
      submittedBy: row.submitted_by,
      submitterName: row.submitter_name,
      submitterEmail: row.submitter_email,
      status: row.status,
      reviewNote: row.review_note,
      reviewerId: row.reviewer_id,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
    };

    if (reviewType === 'correction' && row.correction_data) {
      try {
        review.correction = JSON.parse(row.correction_data);
      } catch {
        review.correction = null;
      }
    }

    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/reviews/:id/approve', (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const { reviewNote } = req.body;

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as any;
    if (!review) {
      res.status(404).json({ success: false, error: '审核记录不存在' });
      return;
    }

    if (review.status !== 'pending') {
      res.status(400).json({ success: false, error: '该审核已处理' });
      return;
    }

    const updateReview = db.prepare(
      `UPDATE reviews 
       SET status = 'approved', reviewer_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    updateReview.run(req.user.userId, reviewNote || '', id);

    const reviewType = review.type || 'new_snack';

    if (reviewType === 'correction' && review.correction_data) {
      try {
        const correction = JSON.parse(review.correction_data);
        const snackId = review.snack_id;
        const existing = db.prepare('SELECT * FROM snacks WHERE id = ?').get(snackId) as any;
        if (existing) {
          const ingredientList = Array.isArray(correction.ingredients) ? correction.ingredients : null;
          let hasHarmful: boolean;

          if (ingredientList) {
            hasHarmful = ingredientList.some((i: any) => i.isHarmful);
          } else {
            const existingIngs = db
              .prepare('SELECT is_harmful FROM ingredients WHERE snack_id = ?')
              .all(snackId) as { is_harmful: number }[];
            hasHarmful = existingIngs.some((i) => i.is_harmful === 1);
          }

          const finalCalories = correction.calories ?? existing.calories;
          const finalSugar = correction.sugar ?? existing.sugar;
          const finalFat = correction.fat ?? existing.fat;
          const finalSodium = correction.sodium ?? existing.sodium;
          const finalProtein = correction.protein ?? existing.protein;

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
            correction.name ?? existing.name,
            correction.brand ?? existing.brand,
            correction.category ?? existing.category,
            correction.description ?? existing.description,
            correction.image ?? existing.image,
            finalCalories,
            finalSugar,
            finalFat,
            finalSodium,
            finalProtein,
            correction.carbohydrates ?? existing.carbohydrates,
            correction.fiber ?? existing.fiber,
            correction.servingSize ?? existing.serving_size,
            healthScore,
            grade.calories,
            grade.sugar,
            grade.fat,
            grade.sodium,
            snackId
          );

          if (ingredientList) {
            db.prepare('DELETE FROM ingredients WHERE snack_id = ?').run(snackId);
            const insertIngredient = db.prepare(
              'INSERT INTO ingredients (snack_id, name, is_harmful) VALUES (?, ?, ?)'
            );
            for (const ing of ingredientList) {
              if (ing.name) {
                insertIngredient.run(snackId, ing.name, ing.isHarmful ? 1 : 0);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to apply correction:', e);
      }
    } else {
      db.prepare('UPDATE snacks SET is_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        review.snack_id
      );
    }

    res.json({ success: true, message: reviewType === 'correction' ? '修正已通过，原零食数据已更新' : '审核通过' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/reviews/:id/reject', (req: Request, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const { reviewNote } = req.body;

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as any;
    if (!review) {
      res.status(404).json({ success: false, error: '审核记录不存在' });
      return;
    }

    if (review.status !== 'pending') {
      res.status(400).json({ success: false, error: '该审核已处理' });
      return;
    }

    const updateReview = db.prepare(
      `UPDATE reviews 
       SET status = 'rejected', reviewer_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    updateReview.run(req.user.userId, reviewNote || '审核未通过', id);

    res.json({ success: true, message: '已驳回' });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/snacks', (req: Request, res: Response): void => {
  try {
    const { page = '1', limit = '12', search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM snacks';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ? OR brand LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const totalResult = db.prepare(countQuery).get(...params) as { count: number };
    const total = totalResult.count;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const rows = db.prepare(query).all(...params) as any[];
    const snacks = rows.map(mapSnackRow);

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

router.get('/users', (req: Request, res: Response): void => {
  try {
    const rows = db
      .prepare(
        'SELECT id, username, email, role, avatar, created_at FROM users ORDER BY created_at DESC'
      )
      .all() as any[];

    const users = rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      createdAt: row.created_at,
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const totalSnacks = (db.prepare('SELECT COUNT(*) as count FROM snacks').get() as { count: number }).count;
    const approvedSnacks = (db.prepare('SELECT COUNT(*) as count FROM snacks WHERE is_approved = 1').get() as { count: number }).count;
    const pendingReviews = (db.prepare('SELECT COUNT(*) as count FROM reviews WHERE status = ?').get('pending') as { count: number }).count;
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const totalComments = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number }).count;
    const totalFavorites = (db.prepare('SELECT COUNT(*) as count FROM favorites').get() as { count: number }).count;

    const avgHealthScore = (
      db.prepare('SELECT AVG(health_score) as avg FROM snacks WHERE is_approved = 1').get() as {
        avg: number | null;
      }
    ).avg;

    const categoryStats = db
      .prepare(
        'SELECT category, COUNT(*) as count, AVG(health_score) as avg_score FROM snacks WHERE is_approved = 1 GROUP BY category ORDER BY count DESC'
      )
      .all() as any[];

    res.json({
      success: true,
      data: {
        totalSnacks,
        approvedSnacks,
        pendingReviews,
        totalUsers,
        totalComments,
        totalFavorites,
        avgHealthScore: avgHealthScore ? Math.round(avgHealthScore * 10) / 10 : 0,
        categoryStats: categoryStats.map((c) => ({
          category: c.category,
          count: c.count,
          avgScore: Math.round((c.avg_score || 0) * 10) / 10,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
