import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { NutritionGrade } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'snack.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function calculateHealthScore(snack: {
  calories: number;
  sugar: number;
  fat: number;
  sodium: number;
  protein: number;
  hasHarmfulIngredients: boolean;
}): number {
  let score = 0;
  if (snack.calories <= 400) score += 10;
  if (snack.sugar <= 5) score += 20;
  if (snack.fat <= 10) score += 20;
  if (snack.sodium <= 300) score += 20;
  if (snack.protein >= 5) score += 20;
  if (!snack.hasHarmfulIngredients) score += 10;
  return score;
}

export function calculateNutritionGrade(snack: {
  calories: number;
  sugar: number;
  fat: number;
  sodium: number;
}): NutritionGrade {
  return {
    calories: snack.calories > 550 ? 'high' : snack.calories >= 400 ? 'medium' : 'low',
    sugar: snack.sugar > 22.5 ? 'high' : snack.sugar >= 5 ? 'medium' : 'low',
    fat: snack.fat > 17.5 ? 'high' : snack.fat >= 10 ? 'medium' : 'low',
    sodium: snack.sodium > 600 ? 'high' : snack.sodium >= 300 ? 'medium' : 'low',
  };
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS snacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      image TEXT,
      calories REAL DEFAULT 0,
      sugar REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbohydrates REAL DEFAULT 0,
      fiber REAL DEFAULT 0,
      serving_size TEXT,
      health_score INTEGER DEFAULT 0,
      nutrition_grade_calories TEXT DEFAULT 'low',
      nutrition_grade_sugar TEXT DEFAULT 'low',
      nutrition_grade_fat TEXT DEFAULT 'low',
      nutrition_grade_sodium TEXT DEFAULT 'low',
      is_approved INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snack_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      is_harmful INTEGER DEFAULT 0,
      FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snack_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snack_id INTEGER NOT NULL,
      type TEXT DEFAULT 'new_snack',
      correction_data TEXT,
      submitted_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewer_id INTEGER,
      review_note TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE,
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      snack_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, snack_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diet_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      snack_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      meal_type TEXT DEFAULT 'snack',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snacks_category ON snacks(category);
    CREATE INDEX IF NOT EXISTS idx_snacks_approved ON snacks(is_approved);
    CREATE INDEX IF NOT EXISTS idx_snacks_health_score ON snacks(health_score);
    CREATE INDEX IF NOT EXISTS idx_comments_snack ON comments(snack_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_diet_user_date ON diet_items(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
  `);

  const cols = db.prepare("PRAGMA table_info(reviews)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'type')) {
    db.exec("ALTER TABLE reviews ADD COLUMN type TEXT DEFAULT 'new_snack'");
  }
  if (!cols.some(c => c.name === 'correction_data')) {
    db.exec("ALTER TABLE reviews ADD COLUMN correction_data TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(type)");
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const insertAdmin = db.prepare(`
    INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')
  `);
  const result = insertAdmin.run('admin', 'admin@snack.com', hashedPassword);
  const adminId = Number(result.lastInsertRowid);

  const userPassword = bcrypt.hashSync('user123', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')
  `);
  insertUser.run('testuser', 'test@snack.com', userPassword);

  const snacks = [
    {
      name: '原味酸奶',
      brand: '蒙牛',
      category: '乳制品',
      description: '原味低脂酸奶，富含益生菌和钙质',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
      calories: 120,
      sugar: 4,
      fat: 3,
      sodium: 80,
      protein: 8,
      carbohydrates: 12,
      fiber: 0,
      serving_size: '200g',
      ingredients: [
        { name: '生牛乳', isHarmful: false },
        { name: '益生菌', isHarmful: false },
      ],
    },
    {
      name: '混合坚果',
      brand: '三只松鼠',
      category: '坚果',
      description: '多种坚果混合，富含健康脂肪和蛋白质',
      image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400',
      calories: 380,
      sugar: 3,
      fat: 28,
      sodium: 150,
      protein: 12,
      carbohydrates: 18,
      fiber: 6,
      serving_size: '50g',
      ingredients: [
        { name: '杏仁', isHarmful: false },
        { name: '腰果', isHarmful: false },
        { name: '核桃', isHarmful: false },
        { name: '盐', isHarmful: false },
      ],
    },
    {
      name: '全麦面包',
      brand: '桃李',
      category: '烘焙',
      description: '100%全麦制作，富含膳食纤维',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      calories: 260,
      sugar: 3,
      fat: 4,
      sodium: 280,
      protein: 10,
      carbohydrates: 45,
      fiber: 7,
      serving_size: '100g',
      ingredients: [
        { name: '全麦粉', isHarmful: false },
        { name: '酵母', isHarmful: false },
        { name: '盐', isHarmful: false },
      ],
    },
    {
      name: '烤薯片',
      brand: '乐事',
      category: '膨化食品',
      description: '非油炸烤薯片，比传统薯片更健康',
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
      calories: 450,
      sugar: 2,
      fat: 18,
      sodium: 520,
      protein: 6,
      carbohydrates: 65,
      fiber: 4,
      serving_size: '100g',
      ingredients: [
        { name: '马铃薯', isHarmful: false },
        { name: '植物油', isHarmful: false },
        { name: '盐', isHarmful: false },
        { name: '味精', isHarmful: true },
      ],
    },
    {
      name: '黑巧克力',
      brand: '德芙',
      category: '糖果',
      description: '70%可可含量的黑巧克力，富含抗氧化剂',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400',
      calories: 520,
      sugar: 8,
      fat: 35,
      sodium: 10,
      protein: 7,
      carbohydrates: 40,
      fiber: 11,
      serving_size: '50g',
      ingredients: [
        { name: '可可液块', isHarmful: false },
        { name: '可可脂', isHarmful: false },
        { name: '白砂糖', isHarmful: false },
      ],
    },
    {
      name: '苹果干',
      brand: '良品铺子',
      category: '果干',
      description: '天然苹果晒干，无添加糖',
      image: 'https://images.unsplash.com/photo-1599300495022-6c29b8fb7a5b?w=400',
      calories: 340,
      sugar: 24,
      fat: 1,
      sodium: 20,
      protein: 2,
      carbohydrates: 80,
      fiber: 12,
      serving_size: '100g',
      ingredients: [
        { name: '苹果', isHarmful: false },
      ],
    },
    {
      name: '能量棒',
      brand: 'Keep',
      category: '能量食品',
      description: '高蛋白低糖能量棒，运动前后补充能量',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
      calories: 390,
      sugar: 4,
      fat: 12,
      sodium: 250,
      protein: 22,
      carbohydrates: 35,
      fiber: 8,
      serving_size: '60g',
      ingredients: [
        { name: '乳清蛋白', isHarmful: false },
        { name: '燕麦', isHarmful: false },
        { name: '坚果酱', isHarmful: false },
        { name: '代糖', isHarmful: false },
      ],
    },
    {
      name: '海苔脆片',
      brand: '小老板',
      category: '膨化食品',
      description: '香脆烤海苔，低脂低卡',
      image: 'https://images.unsplash.com/photo-1607301406259-dfb1890e6f16?w=400',
      calories: 280,
      sugar: 1,
      fat: 8,
      sodium: 450,
      protein: 6,
      carbohydrates: 45,
      fiber: 3,
      serving_size: '30g',
      ingredients: [
        { name: '海苔', isHarmful: false },
        { name: '食用油', isHarmful: false },
        { name: '盐', isHarmful: false },
        { name: '酱油粉', isHarmful: false },
      ],
    },
    {
      name: '蔬菜饼干',
      brand: '康师傅',
      category: '饼干',
      description: '添加多种蔬菜粉的健康饼干',
      image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400',
      calories: 480,
      sugar: 10,
      fat: 20,
      sodium: 380,
      protein: 8,
      carbohydrates: 65,
      fiber: 5,
      serving_size: '100g',
      ingredients: [
        { name: '小麦粉', isHarmful: false },
        { name: '蔬菜粉', isHarmful: false },
        { name: '植物油', isHarmful: false },
        { name: '膨松剂', isHarmful: true },
      ],
    },
    {
      name: '水煮蛋白',
      brand: '自制',
      category: '蛋制品',
      description: '高蛋白低脂的经典健康食品',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400',
      calories: 52,
      sugar: 0,
      fat: 0,
      sodium: 150,
      protein: 11,
      carbohydrates: 1,
      fiber: 0,
      serving_size: '1个(30g)',
      ingredients: [
        { name: '鸡蛋白', isHarmful: false },
      ],
    },
    {
      name: '豆浆',
      brand: '九阳',
      category: '豆制品',
      description: '无糖豆浆，植物蛋白来源',
      image: 'https://images.unsplash.com/photo-1622205313162-be1d57147749?w=400',
      calories: 80,
      sugar: 0,
      fat: 4,
      sodium: 60,
      protein: 6,
      carbohydrates: 5,
      fiber: 2,
      serving_size: '250ml',
      ingredients: [
        { name: '大豆', isHarmful: false },
        { name: '水', isHarmful: false },
      ],
    },
    {
      name: '蓝莓',
      brand: 'Driscolls',
      category: '水果',
      description: '新鲜蓝莓，富含花青素',
      image: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400',
      calories: 57,
      sugar: 10,
      fat: 0.3,
      sodium: 1,
      protein: 0.7,
      carbohydrates: 14,
      fiber: 2.4,
      serving_size: '100g',
      ingredients: [
        { name: '蓝莓', isHarmful: false },
      ],
    },
    {
      name: '燕麦片',
      brand: '桂格',
      category: '谷物',
      description: '即食纯燕麦片，膳食纤维丰富',
      image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400',
      calories: 370,
      sugar: 1,
      fat: 7,
      sodium: 0,
      protein: 15,
      carbohydrates: 60,
      fiber: 10,
      serving_size: '100g',
      ingredients: [
        { name: '燕麦', isHarmful: false },
      ],
    },
    {
      name: '鸡胸肉干',
      brand: '鲨鱼菲特',
      category: '肉制品',
      description: '高蛋白低脂健身零食',
      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400',
      calories: 320,
      sugar: 2,
      fat: 6,
      sodium: 520,
      protein: 55,
      carbohydrates: 8,
      fiber: 0,
      serving_size: '100g',
      ingredients: [
        { name: '鸡胸肉', isHarmful: false },
        { name: '香辛料', isHarmful: false },
        { name: '防腐剂', isHarmful: true },
      ],
    },
    {
      name: '玉米片',
      brand: '家乐氏',
      category: '谷物',
      description: '早餐谷物玉米片',
      image: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400',
      calories: 580,
      sugar: 25,
      fat: 5,
      sodium: 680,
      protein: 6,
      carbohydrates: 85,
      fiber: 3,
      serving_size: '100g',
      ingredients: [
        { name: '玉米', isHarmful: false },
        { name: '白砂糖', isHarmful: false },
        { name: '盐', isHarmful: false },
        { name: '人工香精', isHarmful: true },
      ],
    },
    {
      name: '奇亚籽',
      brand: 'Wonder',
      category: '谷物',
      description: '超级食物，富含Omega-3和膳食纤维',
      image: 'https://images.unsplash.com/photo-1612257416648-ee7a6c6b9b64?w=400',
      calories: 486,
      sugar: 0,
      fat: 31,
      sodium: 16,
      protein: 17,
      carbohydrates: 42,
      fiber: 34,
      serving_size: '100g',
      ingredients: [
        { name: '奇亚籽', isHarmful: false },
      ],
    },
    {
      name: '山楂片',
      brand: '怡达',
      category: '蜜饯',
      description: '传统山楂蜜饯，开胃消食',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
      calories: 350,
      sugar: 70,
      fat: 1,
      sodium: 40,
      protein: 1,
      carbohydrates: 85,
      fiber: 5,
      serving_size: '100g',
      ingredients: [
        { name: '山楂', isHarmful: false },
        { name: '白砂糖', isHarmful: false },
        { name: '防腐剂', isHarmful: true },
      ],
    },
  ];

  const insertSnack = db.prepare(`
    INSERT INTO snacks (
      name, brand, category, description, image, calories, sugar, fat, sodium, protein,
      carbohydrates, fiber, serving_size, health_score, nutrition_grade_calories,
      nutrition_grade_sugar, nutrition_grade_fat, nutrition_grade_sodium, is_approved, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (snack_id, name, is_harmful) VALUES (?, ?, ?)
  `);

  for (const snack of snacks) {
    const hasHarmful = snack.ingredients.some(i => i.isHarmful);
    const healthScore = calculateHealthScore({
      calories: snack.calories,
      sugar: snack.sugar,
      fat: snack.fat,
      sodium: snack.sodium,
      protein: snack.protein,
      hasHarmfulIngredients: hasHarmful,
    });
    const grade = calculateNutritionGrade({
      calories: snack.calories,
      sugar: snack.sugar,
      fat: snack.fat,
      sodium: snack.sodium,
    });

    const info = insertSnack.run(
      snack.name, snack.brand, snack.category, snack.description, snack.image,
      snack.calories, snack.sugar, snack.fat, snack.sodium, snack.protein,
      snack.carbohydrates, snack.fiber, snack.serving_size, healthScore,
      grade.calories, grade.sugar, grade.fat, grade.sodium, adminId
    );
    const snackId = info.lastInsertRowid as number;

    for (const ing of snack.ingredients) {
      insertIngredient.run(snackId, ing.name, ing.isHarmful ? 1 : 0);
    }
  }

  const insertComment = db.prepare(`
    INSERT INTO comments (snack_id, user_id, content, rating) VALUES (?, ?, ?, ?)
  `);
  const comments = [
    { snackId: 1, userId: 2, content: '很好喝，口感醇厚，不甜腻', rating: 5 },
    { snackId: 2, userId: 2, content: '坚果很新鲜，包装也很精美', rating: 4 },
    { snackId: 3, userId: 2, content: '全麦口感不错，很有嚼劲', rating: 4 },
    { snackId: 1, userId: 2, content: '每天早上喝一杯，健康又营养', rating: 5 },
    { snackId: 5, userId: 2, content: '黑巧克力味道很纯，不甜', rating: 5 },
  ];
  for (const c of comments) {
    insertComment.run(c.snackId, c.userId, c.content, c.rating);
  }

  const insertFavorite = db.prepare(`
    INSERT INTO favorites (user_id, snack_id) VALUES (?, ?)
  `);
  insertFavorite.run(2, 1);
  insertFavorite.run(2, 5);
  insertFavorite.run(2, 12);

  const insertDiet = db.prepare(`
    INSERT INTO diet_items (user_id, snack_id, quantity, date, meal_type) VALUES (?, ?, ?, ?, ?)
  `);
  const today = new Date().toISOString().split('T')[0];
  insertDiet.run(2, 1, 1, today, 'breakfast');
  insertDiet.run(2, 2, 1, today, 'snack');
  insertDiet.run(2, 10, 2, today, 'lunch');
}

initTables();
seedData();

export default db;
