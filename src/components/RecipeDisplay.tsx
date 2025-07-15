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
    toast.success('Meal combination saved to favorites!');
  };

  const handleShare = (recipe: Recipe) => {
    onShareRecipe?.(recipe);
    toast.success('Meal combination link copied to clipboard!');
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
      case 'main': return 'Main';
      case 'side': return 'Side';
      case 'soup': return 'Soup';
      default: return 'Dish';
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl text-muted-foreground">No meal combinations generated yet</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Your Meal Plan Combinations 🍽️
        </h2>
        <p className="text-muted-foreground">
          We've created {recipes.length} balanced meal combination{recipes.length === 1 ? '' : 's'} for you
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
                  {recipe.difficulty === 'beginner' ? 'Beginner' : recipe.difficulty === 'intermediate' ? 'Intermediate' : 'Advanced'}
                </Badge>
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {recipe.prepTime + recipe.cookTime} min
                </Badge>
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {recipe.servings} servings
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* 菜品搭配展示 */}
              {recipe.dishes && recipe.dishes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-primary" />
                    Meal Combination
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
                  Required Ingredients
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
                            Need to buy
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cooking Instructions */}
              <div>
                <h4 className="font-semibold mb-3">Cooking Instructions</h4>
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

              {/* Cooking Tips */}
              {recipe.tips && recipe.tips.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">💡 Cooking Tips</h4>
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

              {/* Nutrition Information */}
              {recipe.nutritionInfo && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Nutrition (per serving)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.calories}</div>
                        <div className="text-xs text-muted-foreground">Calories</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.protein}</div>
                        <div className="text-xs text-muted-foreground">Protein</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.carbs}</div>
                        <div className="text-xs text-muted-foreground">Carbs</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="font-bold text-primary">{recipe.nutritionInfo.fat}</div>
                        <div className="text-xs text-muted-foreground">Fat</div>
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