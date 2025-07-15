import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, ChefHat, Utensils, Heart, Share, Coffee } from 'lucide-react';
import { toast } from 'sonner';

interface Dish {
  name: string;
  type: 'main' | 'side' | 'soup';
  description: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  mealType?: string;
  dishes?: Dish[];
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
    usedIn?: string;
  }>;
  instructions: string[];
  tips?: string[];
  nutritionInfo?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

interface RecipeDisplayProps {
  recipes: Recipe[];
  onSaveRecipe?: (recipe: Recipe) => void;
  onShareRecipe?: (recipe: Recipe) => void;
}

export const RecipeDisplay = ({ recipes, onSaveRecipe, onShareRecipe }: RecipeDisplayProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-cooking-herb text-white';
      case 'intermediate':
        return 'bg-cooking-spice text-white';
      case 'advanced':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleSave = (recipe: Recipe) => {
    onSaveRecipe?.(recipe);
    toast.success('餐食搭配已保存到收藏！');
  };

  const handleShare = (recipe: Recipe) => {
    onShareRecipe?.(recipe);
    toast.success('餐食搭配链接已复制到剪贴板！');
  };

  const getDishIcon = (type: string) => {
    switch (type) {
      case 'main': return '🍗';
      case 'side': return '🥗';
      case 'soup': return '🍜';
      default: return '🍽️';
    }
  };

  const getDishTypeText = (type: string) => {
    switch (type) {
      case 'main': return '主菜';
      case 'side': return '配菜';
      case 'soup': return '汤品';
      default: return '菜品';
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl text-muted-foreground">还没有生成餐食搭配</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          您的餐食搭配方案 🍽️
        </h2>
        <p className="text-muted-foreground">
          为您推荐了 {recipes.length} 套营养均衡的餐食搭配
        </p>
      </div>

      <div className="grid gap-6">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300">
            <CardHeader className="bg-gradient-warm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{recipe.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">{recipe.description}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSave(recipe)}
                    className="hover:bg-white/20"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShare(recipe)}
                    className="hover:bg-white/20"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  <ChefHat className="w-3 h-3 mr-1" />
                  {recipe.difficulty === 'beginner' ? '初级' : recipe.difficulty === 'intermediate' ? '中级' : '高级'}
                </Badge>
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {recipe.prepTime + recipe.cookTime} 分钟
                </Badge>
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {recipe.servings} 人份
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* 菜品搭配展示 */}
              {recipe.dishes && recipe.dishes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-primary" />
                    餐食搭配
                  </h4>
                  <div className="grid gap-3">
                    {recipe.dishes.map((dish, index) => (
                      <div key={index} className="flex items-center p-3 bg-cooking-cream rounded-lg">
                        <div className="text-2xl mr-3">{getDishIcon(dish.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{dish.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getDishTypeText(dish.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{dish.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* 食材清单 */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <Utensils className="w-4 h-4 mr-2 text-primary" />
                  所需食材
                </h4>
                <div className="grid gap-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className={`
                        flex justify-between items-center p-3 rounded-md
                        ${ingredient.needed 
                          ? 'bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' 
                          : 'bg-muted'
                        }
                      `}
                    >
                      <div className="flex-1">
                        <span className="font-medium">{ingredient.item}</span>
                        {ingredient.usedIn && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({ingredient.usedIn})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">{ingredient.amount}</span>
                        {ingredient.needed && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                            需要购买
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 制作步骤 */}
              <div>
                <h4 className="font-semibold mb-3">制作步骤</h4>
                <ol className="space-y-3">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* 搭配小贴士 */}
              {recipe.tips && recipe.tips.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">💡 搭配小贴士</h4>
                    <ul className="space-y-2">
                      {recipe.tips.map((tip, index) => (
                        <li key={index} className="text-sm bg-cooking-cream p-3 rounded-md">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* 营养信息 */}
              {recipe.nutritionInfo && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">营养成分 (每人份)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.calories}</div>
                        <div className="text-xs text-muted-foreground">卡路里</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.protein}</div>
                        <div className="text-xs text-muted-foreground">蛋白质</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.carbs}</div>
                        <div className="text-xs text-muted-foreground">碳水</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.fat}</div>
                        <div className="text-xs text-muted-foreground">脂肪</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};