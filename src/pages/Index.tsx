import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { IngredientInput } from '@/components/IngredientInput';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight, Clock, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import heroImage from '@/assets/kitchen-hero.jpg';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const Index = () => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'ingredients' | 'preferences' | 'generating' | 'preview' | 'recipes'>('ingredients');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [allowShopping, setAllowShopping] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [mealType, setMealType] = useState('lunch');
  const [occasionType, setOccasionType] = useState('daily');
  const [cuisineType, setCuisineType] = useState('chinese');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  
  // Hardcoded API key - provided by the service
  const API_KEY = 'AIzaSyC5SRTd-W6TGeiWnSEia1rrzoXRAZl9h2Q';
  const recipeService = new RecipeService(API_KEY);

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const handleContinueToPreferences = () => {
    if (ingredients.length === 0) {
      toast.error(t('addIngredients'));
      return;
    }
    setStep('preferences');
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      toast.error(t('addIngredientsFirst'));
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const generatedRecipes = await recipeService.generateRecipes({
        ingredients,
        skillLevel,
        mealDays: 1, // 固定为一顿饭
        allowShopping,
        peopleCount,
        mealType,
        occasionType,
        cuisineType,
        language,
        apiKey: API_KEY
      });

      setRecipes(generatedRecipes);
      setStep('preview');
      toast.success(t('recipesGenerated'));
    } catch (error) {
      console.error('Error generating recipes:', error);
      toast.error(t('recipesGenerationFailed'));
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
                  {t('continueToPreferences')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{t('preferences')}</h2>
              <p className="text-lg text-muted-foreground">{t('customizeYourMeals')}</p>
            </div>
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <PreferencesSelector
                  skillLevel={skillLevel}
                  onSkillLevelChange={setSkillLevel}
                  allowShopping={allowShopping}
                  onAllowShoppingChange={setAllowShopping}
                  peopleCount={peopleCount}
                  onPeopleCountChange={setPeopleCount}
                  mealType={mealType}
                  onMealTypeChange={setMealType}
                  occasionType={occasionType}
                  onOccasionTypeChange={setOccasionType}
                  cuisineType={cuisineType}
                  onCuisineTypeChange={setCuisineType}
                />
              </CardContent>
            </Card>
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setStep('ingredients')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('backToIngredients')}
              </Button>
              <Button 
                onClick={handleGenerateRecipes} 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('generateMealPlans')}
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg shadow-lg">
              <CardContent className="p-12 text-center space-y-8">
                <div className="relative">
                  <div className="mx-auto w-24 h-24 bg-primary rounded-full flex items-center justify-center animate-pulse">
                    <ChefHat className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">{t('creatingMealPlans')}</h3>
                  <p className="text-lg text-muted-foreground">
                    {t('aiChefAnalyzing')}
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold text-primary">
                {t('recommendMeals')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('foundFor')} {recipes.length} {recipes.length === 1 ? t('foundMealPlans') : t('foundMealPlansPlural')}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe, index) => (
                <Card key={recipe.id} className="group overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer">
                  <CardContent className="p-0">
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-primary opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-6xl opacity-80">
                          {index === 0 ? '🍗' : index === 1 ? '🥗' : index === 2 ? '🍜' : '🍽️'}
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                          <Clock className="w-3 h-3 mr-1" />
                          {recipe.prepTime + recipe.cookTime} {t('min')}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {recipe.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2">{recipe.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-muted/50">
                            <Users className="w-3 h-3 mr-1" />
                            {recipe.servings}
                          </Badge>
                          <Badge variant="secondary" className="bg-muted/50">
                            {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                          </Badge>
                        </div>
                        <ChefHat className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center space-x-6">
              <Button 
                variant="outline" 
                onClick={() => setStep('preferences')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('regeneratePlans')}
              </Button>
              <Button 
                onClick={handleViewFullRecipes} 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('viewDetailedRecipes')}
              </Button>
            </div>
          </div>
        );

      case 'recipes':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep('preview')}
                className="px-6 py-3 text-base font-medium"
              >
                {t('backToPreview')}
              </Button>
            </div>
            <div className="bg-card rounded-2xl p-6 shadow-lg">
              <RecipeDisplay recipes={recipes} />
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={handleStartOver} 
                variant="outline"
                className="px-8 py-3 text-base font-medium"
              >
                {t('createNewMealPlans')}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Food Delivery Style */}
      {step === 'ingredients' && (
        <div className="relative bg-gradient-secondary min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <div className="location-indicator">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm font-medium">Location</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold">👤</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              What are you going<br />to cook today?
            </h1>
          </div>

          {/* Search Bar */}
          <div className="px-6 mb-8">
            <div className="search-bar flex items-center space-x-2">
              <Input
                placeholder="Search ingredients..."
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-0 bg-transparent flex-1"
              />
              <Button onClick={addIngredient} size="icon" variant="ghost">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Discount Banner */}
          <div className="px-6 mb-8">
            <div className="discount-banner relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-foreground mb-1">Big discount</div>
                  <div className="text-2xl font-bold text-foreground">10.10</div>
                  <div className="text-sm text-muted-foreground">Claim your voucher now!</div>
                </div>
                <div className="text-6xl">🍔</div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="px-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Category</h3>
              <span className="text-primary text-sm">See more</span>
            </div>
            <div className="flex space-x-3">
              <div className="category-tag active">All</div>
              <div className="category-tag">🍔 Burger</div>
              <div className="category-tag">🌭 Hotdog</div>
            </div>
          </div>

          {/* Ingredients List or Food Cards */}
          <div className="px-6 space-y-4 flex-1">
            {ingredients.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Your Ingredients</h3>
                <div className="space-y-3">
                  {ingredients.map((ingredient, index) => (
                    <Card key={index} className="food-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">🥗</div>
                          <div>
                            <div className="font-semibold text-foreground">{ingredient}</div>
                            <div className="text-xs text-muted-foreground">Size: Fresh</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold">1</span>
                          <div className="flex flex-col space-y-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">+</Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                            >-</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Card className="food-card p-4 bg-gradient-accent">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">🌭</div>
                    <div className="font-semibold text-foreground">Hotdog Ntap</div>
                    <div className="text-xs text-muted-foreground">Hotdog special with delicious</div>
                    <div className="text-xs text-muted-foreground">vegetables</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-lg font-bold text-foreground">$23.00</div>
                      <div className="text-xs text-muted-foreground line-through">$25.00</div>
                    </div>
                  </div>
                </Card>
                
                <Card className="food-card p-4">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">🍣</div>
                    <div className="font-semibold text-foreground">Salmon Sushi</div>
                    <div className="text-xs text-muted-foreground">Amazing combination salmon</div>
                    <div className="text-xs text-muted-foreground">vegetable</div>
                    <div className="text-lg font-bold text-foreground mt-3">$25.00</div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <div className="absolute top-6 right-16">
            <LanguageToggle />
          </div>

          {/* Continue Button */}
          {ingredients.length > 0 && (
            <div className="px-6 pb-6 mt-auto">
              <Button onClick={handleContinueToPreferences} size="lg" className="w-full">
                {t('continueToPreferences')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Header for other steps */}
      {(step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes') && (
        <div className="bg-card border-b sticky top-0 z-10 shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ChefHat className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold">{t('appTitle')}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm">
                    {t('step1')}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes'
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {t('step2')}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    step === 'generating' || step === 'preview' || step === 'recipes'
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {t('step3')}
                  </div>
                </div>
                <LanguageToggle />
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
