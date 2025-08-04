// 数据导出工具
import { supabase } from '@/integrations/supabase/client';

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
  exportType?: string;
  stats?: any;
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

// 管理员级别的完整数据导出
export async function exportAllDataAdmin(apiKey?: string): Promise<BackupData> {
  console.log('调用管理员数据导出边缘函数...');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // 如果提供了API密钥，添加到请求头
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const { data, error } = await supabase.functions.invoke('export-all-data', {
    headers
  });

  if (error) {
    console.error('边缘函数调用失败:', error);
    throw new Error(`管理员导出失败: ${error.message}`);
  }

  if (!data) {
    throw new Error('边缘函数返回空数据');
  }

  console.log('管理员导出成功，统计信息:', data.stats);
  return data;
}