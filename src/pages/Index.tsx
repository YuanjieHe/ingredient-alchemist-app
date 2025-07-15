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
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

const Index = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'ingredients' | 'preferences' | 'generating' | 'preview' | 'recipes'>('ingredients');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [mealDays, setMealDays] = useState(3);
  const [allowShopping, setAllowShopping] = useState(false);
  const [peopleCount, setPeopleCount] = useState(4);
  const [mealType, setMealType] = useState('lunch');
  const [occasionType, setOccasionType] = useState('daily');
  const [cuisineType, setCuisineType] = useState('chinese');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Hardcoded API key - provided by the service
  const API_KEY = 'AIzaSyBqc53GHt1LfXyvYaD4XZm99XLCQ9vtLu0';
  const recipeService = new RecipeService(API_KEY);

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
        mealDays,
        allowShopping,
        peopleCount,
        mealType,
        occasionType,
        cuisineType,
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
          <div className="space-y-8 animate-fade-in">
            {/* Ingredients Section */}
            <div className="bg-white rounded-3xl p-8 shadow-card">
              <IngredientInput 
                ingredients={ingredients} 
                onIngredientsChange={setIngredients} 
              />
            </div>
            
            {ingredients.length > 0 && (
              <div className="flex justify-center">
                <Button onClick={handleContinueToPreferences} size="lg" className="px-10">
                  {t('continueToPreferences')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-card overflow-hidden">
              <PreferencesSelector
                skillLevel={skillLevel}
                onSkillLevelChange={setSkillLevel}
                mealDays={mealDays}
                onMealDaysChange={setMealDays}
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
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('ingredients')} className="px-8">
                {t('backToIngredients')}
              </Button>
              <Button onClick={handleGenerateRecipes} size="lg" className="px-10">
                <Sparkles className="w-5 h-5 mr-2" />
                {t('generateMealPlans')}
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl p-12 shadow-elegant text-center space-y-6 max-w-md mx-auto">
              <div className="mx-auto w-20 h-20 bg-gradient-blue rounded-full flex items-center justify-center animate-pulse">
                <ChefHat className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground">{t('creatingMealPlans')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {t('aiChefAnalyzing')}
                </p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-foreground">
                {t('recommendMeals')}
              </h2>
              <p className="text-xl text-muted-foreground">
                {t('foundFor')} {recipes.length} {recipes.length === 1 ? t('foundMealPlans') : t('foundMealPlansPlural')}
              </p>
            </div>

            <div className="grid gap-6">
              {recipes.map((recipe, index) => (
                <div key={recipe.id} className="bg-white rounded-3xl shadow-card overflow-hidden hover:shadow-elegant transition-all duration-300 cursor-pointer group">
                  <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-blue"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white space-y-2">
                        <div className="text-6xl mb-4">
                          {index === 0 ? '🍗' : index === 1 ? '🥗' : index === 2 ? '🍜' : '🍽️'}
                        </div>
                        <h3 className="text-2xl font-bold">{recipe.title}</h3>
                        <p className="text-lg opacity-90 px-6">{recipe.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center px-4 py-2 bg-soft-blue rounded-full">
                        <Clock className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-sm font-medium">{recipe.prepTime + recipe.cookTime} {t('min')}</span>
                      </div>
                      <div className="flex items-center px-4 py-2 bg-warm-cream rounded-full">
                        <Users className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-sm font-medium">{recipe.servings} {t('servings')}</span>
                      </div>
                      <div className="flex items-center px-4 py-2 bg-primary rounded-full text-white">
                        <ChefHat className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">
                          {recipe.difficulty === 'beginner' ? t('beginner') : recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep('preferences')} className="px-8">
                {t('regeneratePlans')}
              </Button>
              <Button onClick={handleViewFullRecipes} size="lg" className="px-10">
                <Sparkles className="w-5 h-5 mr-2" />
                {t('viewDetailedRecipes')}
              </Button>
            </div>
          </div>
        );

      case 'recipes':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('preview')} className="px-6">
                {t('backToPreview')}
              </Button>
            </div>
            <div className="bg-white rounded-3xl shadow-card overflow-hidden">
              <RecipeDisplay recipes={recipes} />
            </div>
            <div className="flex justify-center">
              <Button onClick={handleStartOver} variant="outline" className="px-8">
                {t('createNewMealPlans')}
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
        <div className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={heroImage} 
              alt="Fresh ingredients and cooking" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-overlay"></div>
          </div>
          <div className="relative z-10 text-center text-white space-y-6 px-6 max-w-md mx-auto">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold tracking-tight">{t('appTitle')}</h1>
              <p className="text-xl opacity-90">{t('appSubtitle')}</p>
            </div>
            <div className="pt-4">
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header for other steps */}
      {(step === 'preferences' || step === 'generating' || step === 'preview' || step === 'recipes') && (
        <div className="bg-white/95 backdrop-blur-sm border-b border-border/30 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">{t('appTitle')}</h1>
              </div>
              
              {/* Meal Type Selector */}
              <div className="hidden md:flex items-center space-x-2 bg-soft-white rounded-full p-1 shadow-card">
                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                  <button
                    key={meal}
                    onClick={() => setMealType(meal)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      mealType === meal 
                        ? 'bg-primary text-white shadow-button' 
                        : 'text-elegant-gray hover:text-foreground'
                    }`}
                  >
                    {t(meal)}
                  </button>
                ))}
              </div>
              
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
