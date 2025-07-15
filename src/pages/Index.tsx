import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IngredientInput } from '@/components/IngredientInput';
import { PreferencesSelector } from '@/components/PreferencesSelector';
import { RecipeDisplay } from '@/components/RecipeDisplay';
import { RecipeService, Recipe } from '@/services/recipeService';
import { ChefHat, Search, Heart } from 'lucide-react';
import { toast } from 'sonner';
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

  // Mock recipe data that matches the UI design
  const mockRecipes = [
    {
      id: '1',
      name: 'Crisp Beef Tendon',
      calories: '325cl',
      image: '🥩',
      category: 'dinner'
    },
    {
      id: '2', 
      name: 'Stake Portohouse',
      calories: '800cl',
      image: '🥩',
      category: 'dinner'
    },
    {
      id: '3',
      name: 'Valley Farm Eggs',
      calories: '150cl',
      image: '🍳',
      category: 'breakfast'
    },
    {
      id: '4',
      name: 'Clams and Mussels',
      calories: '350cl', 
      image: '🦪',
      category: 'dinner'
    }
  ];

  const [selectedMeal, setSelectedMeal] = useState('dinner');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const renderMobileApp = () => {
    if (selectedRecipe) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
          {/* Back Button */}
          <button 
            onClick={() => setSelectedRecipe(null)}
            className="absolute top-6 left-6 z-10 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <span className="text-white text-lg">←</span>
          </button>

          {/* Heart Icon */}
          <button className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </button>

          {/* Main Content */}
          <div className="pt-20 px-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Valley Farm</h1>
            <h2 className="text-3xl font-bold mb-6">Eggs</h2>
            
            <p className="text-lg opacity-90 mb-8 leading-relaxed">
              Warm flour tortillas filled with crispy fried North Atlantic cod, fresh cabbage
            </p>

            {/* Food Image */}
            <div className="flex justify-center mb-12">
              <div className="w-64 h-64 rounded-full bg-white/10 flex items-center justify-center">
                <div className="text-8xl">🍳</div>
              </div>
            </div>

            {/* Calories */}
            <div className="text-6xl font-bold text-center mb-16">150cl</div>

            {/* Ingredients Section */}
            <div className="bg-white rounded-t-3xl p-6 absolute bottom-0 left-0 right-0">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Ingredients</h3>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🥚</span>
                  </div>
                  <span className="text-sm text-gray-600">Eggs</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🥩</span>
                  </div>
                  <span className="text-sm text-gray-600">Beef</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🧅</span>
                  </div>
                  <span className="text-sm text-gray-600">Onion</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🥕</span>
                  </div>
                  <span className="text-sm text-gray-600">Carrot</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile App Header */}
        <div className="bg-white px-6 py-4">
          {/* Meal Type Navigation */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            {['breakfast', 'dinner', 'evening'].map((meal) => (
              <button
                key={meal}
                onClick={() => setSelectedMeal(meal)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedMeal === meal 
                    ? 'bg-orange-400 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {meal.charAt(0).toUpperCase() + meal.slice(1)}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Search className="w-5 h-5 text-orange-400" />
            </div>
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-gray-50 rounded-full py-3 pl-12 pr-4 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Recipe Cards */}
        <div className="px-6 py-4 space-y-4">
          {mockRecipes
            .filter(recipe => recipe.category === selectedMeal)
            .map((recipe) => (
            <Card 
              key={recipe.id} 
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="flex items-center p-6">
                {/* Food Image Circle */}
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl">{recipe.image}</span>
                </div>
                
                {/* Recipe Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{recipe.name}</h3>
                  <p className="text-gray-500 text-sm">{recipe.calories}</p>
                </div>

                {/* Book Button */}
                <button className="bg-orange-400 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-orange-500 transition-colors">
                  BOOK
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Language Toggle */}
        <div className="fixed bottom-6 right-6">
          <LanguageToggle />
        </div>
      </div>
    );
  };

  return renderMobileApp();
};

export default Index;
