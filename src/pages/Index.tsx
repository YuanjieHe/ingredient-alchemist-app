import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IngredientInput } from '@/components/IngredientInput';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import heroImage from '@/assets/kitchen-hero.jpg';

const Index = () => {
  const [step, setStep] = useState<'apiKey' | 'ingredients' | 'preferences' | 'generating' | 'recipes'>('apiKey');
  const [apiKey, setApiKey] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [mealDays, setMealDays] = useState(3);
  const [allowShopping, setAllowShopping] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const recipeService = new RecipeService();

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    recipeService.setApiKey(key);
    setStep('ingredients');
    toast.success('API key connected successfully!');
  };

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
        apiKey
      });

      setRecipes(generatedRecipes);
      setStep('recipes');
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

  const renderContent = () => {
    switch (step) {
      case 'apiKey':
        return <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />;

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

      case 'recipes':
        return (
          <div className="space-y-6">
            <RecipeDisplay recipes={recipes} />
            <div className="flex justify-center">
              <Button onClick={handleStartOver} variant="outline">
                Create New Recipes
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Hero Section */}
      {step === 'apiKey' && (
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
      {step !== 'apiKey' && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChefHat className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">CookSmart AI</h1>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className={`px-3 py-1 rounded-full ${step === 'ingredients' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  1. Ingredients
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'preferences' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  2. Preferences
                </div>
                <div className={`px-3 py-1 rounded-full ${step === 'recipes' || step === 'generating' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  3. Recipes
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
