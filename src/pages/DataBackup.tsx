import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { downloadBackupFile, createBackupData } from '@/utils/dataExport';
import { toast } from 'sonner';

export default function DataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStats, setExportStats] = useState<any>(null);

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      console.log('开始导出数据...');

      // 获取所有表的数据
      const [
        profilesResult,
        subscriptionsResult,
        ingredientsResult,
        favoritesResult,
        recipesHistoryResult,
        dishesResult,
        techniquesResult,
        ordersResult,
        dishIngredientsResult,
        dishTechniquesResult
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('ingredients_bank').select('*'),
        supabase.from('favorite_recipes').select('*'),
        supabase.from('recipes_history').select('*'),
        supabase.from('dishes_knowledge_base').select('*'),
        supabase.from('cooking_techniques').select('*'),
        supabase.from('zpay_orders').select('*'),
        supabase.from('dish_ingredients').select('*'),
        supabase.from('dish_techniques').select('*')
      ]);

      // 检查错误
      const results = [
        profilesResult,
        subscriptionsResult,
        ingredientsResult,
        favoritesResult,
        recipesHistoryResult,
        dishesResult,
        techniquesResult,
        ordersResult,
        dishIngredientsResult,
        dishTechniquesResult
      ];

      for (const result of results) {
        if (result.error) {
          throw new Error(`数据库查询错误: ${result.error.message}`);
        }
      }

      // 统计数据
      const stats = {
        profiles: profilesResult.data?.length || 0,
        subscriptions: subscriptionsResult.data?.length || 0,
        ingredients: ingredientsResult.data?.length || 0,
        favorites: favoritesResult.data?.length || 0,
        recipesHistory: recipesHistoryResult.data?.length || 0,
        dishes: dishesResult.data?.length || 0,
        techniques: techniquesResult.data?.length || 0,
        orders: ordersResult.data?.length || 0,
        dishIngredients: dishIngredientsResult.data?.length || 0,
        dishTechniques: dishTechniquesResult.data?.length || 0
      };

      setExportStats(stats);

      // 创建备份数据
      const backupData = createBackupData(
        profilesResult.data || [],
        subscriptionsResult.data || [],
        ingredientsResult.data || [],
        favoritesResult.data || [],
        recipesHistoryResult.data || [],
        dishesResult.data || [],
        techniquesResult.data || [],
        ordersResult.data || [],
        dishIngredientsResult.data || [],
        dishTechniquesResult.data || []
      );

      // 下载备份文件
      downloadBackupFile(backupData);

      toast.success('数据备份导出成功！');
      console.log('数据导出完成，统计信息:', stats);

    } catch (error) {
      console.error('导出数据时出错:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">数据备份导出</h1>
          <p className="text-lg text-muted-foreground">
            导出您的What2Cook应用的所有数据，为迁移做准备
          </p>
        </div>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            此操作将导出您的所有应用数据，包括用户档案、食材库、收藏菜谱、订阅信息等。
            导出的文件将以JSON格式保存，可用于数据迁移或恢复。
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>开始备份</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              备份将包含以下数据表：
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Badge variant="outline">用户档案 (profiles)</Badge>
              <Badge variant="outline">订阅信息 (subscriptions)</Badge>
              <Badge variant="outline">食材银行 (ingredients)</Badge>
              <Badge variant="outline">收藏菜谱 (favorites)</Badge>
              <Badge variant="outline">菜谱历史 (recipes_history)</Badge>
              <Badge variant="outline">知识库 (dishes_knowledge)</Badge>
              <Badge variant="outline">烹饪技法 (cooking_techniques)</Badge>
              <Badge variant="outline">支付订单 (zpay_orders)</Badge>
              <Badge variant="outline">菜品食材 (dish_ingredients)</Badge>
              <Badge variant="outline">菜品技法 (dish_techniques)</Badge>
            </div>

            <Button 
              onClick={exportAllData} 
              disabled={isExporting}
              size="lg"
              className="w-full"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                  正在导出数据...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  开始导出所有数据
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {exportStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>导出完成</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.profiles}</div>
                  <div className="text-sm text-muted-foreground">用户档案</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.subscriptions}</div>
                  <div className="text-sm text-muted-foreground">订阅记录</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.ingredients}</div>
                  <div className="text-sm text-muted-foreground">食材记录</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.favorites}</div>
                  <div className="text-sm text-muted-foreground">收藏菜谱</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.dishes}</div>
                  <div className="text-sm text-muted-foreground">知识库菜品</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exportStats.orders}</div>
                  <div className="text-sm text-muted-foreground">支付订单</div>
                </div>
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  备份文件已下载到您的设备。请妥善保存此文件，它包含了您的所有应用数据。
                  建议将文件保存在安全的位置，如云存储服务。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}