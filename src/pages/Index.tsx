import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IngredientInput } from '@/components/IngredientInput';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import heroImage from '@/assets/kitchen-hero.jpg';

const Index = () => {
  const [step, setStep] = useState<'ingredients' | 'preferences' | 'generating' | 'preview' | 'recipes'>('ingredients');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [mealDays, setMealDays] = useState(3);
  const [allowShopping, setAllowShopping] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Hardcoded API key - provided by the service
  const API_KEY = 'AIzaSyBqc53GHt1LfXyvYaD4XZm99XLCQ9vtLu0';
  const recipeService = new RecipeService(API_KEY);

  const handleContinueToPreferences = () => {
    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }
    setStep('preferences');
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      toast.error('Please add some ingredients first');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const generatedRecipes = await recipeService.generateRecipes({
        ingredients,
        skillLevel,
        mealDays,
        allowShopping,
        apiKey: API_KEY
      });

      setRecipes(generatedRecipes);
      setStep('preview');
      toast.success('Recipes generated successfully!');
    } catch (error) {
      console.error('Error generating recipes:', error);
      toast.error('Failed to generate recipes. Please try again.');
      setStep('preferences');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setIngredients([]);
    setRecipes([]);
    setStep('ingredients');
  };

  const handleViewFullRecipes = () => {
    setStep('recipes');
  };

  const renderContent = () => {
    switch (step) {
      case 'ingredients':
        return (
          <div className="space-y-6">
            <IngredientInput 
              ingredients={ingredients} 
              onIngredientsChange={setIngredients} 
            />
            {ingredients.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleContinueToPreferences} size="lg">
                  Continue to Preferences
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <PreferencesSelector
              skillLevel={skillLevel}
              onSkillLevelChange={setSkillLevel}
              mealDays={mealDays}
              onMealDaysChange={setMealDays}
              allowShopping={allowShopping}
              onAllowShoppingChange={setAllowShopping}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('ingredients')}>
                Back to Ingredients
              </Button>
              <Button onClick={handleGenerateRecipes} size="lg" variant="spice">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate My Recipes!
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-cooking-warm rounded-full flex items-center justify-center animate-pulse">
                <ChefHat className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Creating your recipes...</h3>
              <p className="text-muted-foreground">
                Our AI chef is analyzing your ingredients and preferences to create the perfect meals for you!
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        );

      case 'preview':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                我们为您推荐这些美味菜品！ 🍽️
              </h2>
              <p className="text-muted-foreground">
                找到了 {recipes.length} 道适合您的食谱
              </p>
            </div>

            <div className="grid gap-4">
              {recipes.map((recipe, index) => (
                <Card key={recipe.id} className="overflow-hidden shadow-warm hover:shadow-primary transition-all duration-300 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{recipe.title}</h3>
                        <p className="text-muted-foreground mb-3">{recipe.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            {recipe.prepTime + recipe.cookTime} 分钟
                          </Badge>
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {recipe.servings} 人份
                          </Badge>
                          <Badge className="bg-cooking-herb text-white">
                            <ChefHat className="w-3 h-3 mr-1" />
                            {recipe.difficulty === 'beginner' ? '初级' : recipe.difficulty === 'intermediate' ? '中级' : '高级'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-4xl ml-4">
                        {index === 0 ? '🍗' : index === 1 ? '🥗' : index === 2 ? '🍜' : '🍽️'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep('preferences')}>
                重新生成
              </Button>
              <Button onClick={handleViewFullRecipes} size="lg" variant="spice">
                <Sparkles className="w-4 h-4 mr-2" />
                查看详细食谱
              </Button>
            </div>
          </div>
        );

      case 'recipes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                ← 返回菜品预览
              </Button>
            </div>
            <RecipeDisplay recipes={recipes} />
            <div className="flex justify-center">
              <Button onClick={handleStartOver} variant="outline">
                制作新的食谱
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      {step === 'ingredients' && (
        <div className="relative h-64 mb-8 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Fresh ingredients and cooking" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold">CookSmart AI</h1>
              <p className="text-lg md:text-xl opacity-90">Your friendly kitchen companion</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      {(step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes') && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChefHat className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">CookSmart AI</h1>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  1. 食材 ✓
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'preferences' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  2. 偏好设置
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'recipes' || step === 'generating' || step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  3. 食谱
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
