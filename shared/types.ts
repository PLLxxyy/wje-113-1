export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  avatar?: string;
  createdAt: string;
}

export interface Ingredient {
  id: number;
  snackId: number;
  name: string;
  isHarmful: boolean;
}

export interface Comment {
  id: number;
  snackId: number;
  userId: number;
  username?: string;
  content: string;
  rating: number;
  createdAt: string;
}

export interface Review {
  id: number;
  snackId: number;
  submittedBy: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewerId?: number;
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface DietItem {
  id: number;
  userId: number;
  snackId: number;
  snackName?: string;
  quantity: number;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
}

export interface Favorite {
  id: number;
  userId: number;
  snackId: number;
  createdAt: string;
}

export interface NutritionGrade {
  calories: 'low' | 'medium' | 'high';
  sugar: 'low' | 'medium' | 'high';
  fat: 'low' | 'medium' | 'high';
  sodium: 'low' | 'medium' | 'high';
}

export interface Snack {
  id: number;
  name: string;
  brand: string;
  category: string;
  description: string;
  image: string;
  calories: number;
  sugar: number;
  fat: number;
  sodium: number;
  protein: number;
  carbohydrates: number;
  fiber: number;
  servingSize: string;
  healthScore: number;
  nutritionGrade: NutritionGrade;
  ingredients?: Ingredient[];
  comments?: Comment[];
  avgRating?: number;
  reviewCount?: number;
  isApproved: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
