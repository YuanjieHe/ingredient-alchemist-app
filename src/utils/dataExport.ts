// 数据导出工具
export interface BackupData {
  profiles: any[];
  user_subscriptions: any[];
  ingredients_bank: any[];
  favorite_recipes: any[];
  recipes_history: any[];
  dishes_knowledge_base: any[];
  cooking_techniques: any[];
  zpay_orders: any[];
  dish_ingredients: any[];
  dish_techniques: any[];
  exportDate: string;
  version: string;
}

export function downloadBackupFile(data: BackupData) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `what2cook-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createBackupData(
  profiles: any[],
  subscriptions: any[],
  ingredients: any[],
  favorites: any[],
  recipesHistory: any[],
  dishes: any[],
  techniques: any[],
  orders: any[],
  dishIngredients: any[],
  dishTechniques: any[]
): BackupData {
  return {
    profiles,
    user_subscriptions: subscriptions,
    ingredients_bank: ingredients,
    favorite_recipes: favorites,
    recipes_history: recipesHistory,
    dishes_knowledge_base: dishes,
    cooking_techniques: techniques,
    zpay_orders: orders,
    dish_ingredients: dishIngredients,
    dish_techniques: dishTechniques,
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };
}