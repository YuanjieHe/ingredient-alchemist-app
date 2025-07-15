import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, ShoppingCart, Users, Coffee, Globe, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PreferencesSelectorProps {
  skillLevel: string;
  onSkillLevelChange: (level: string) => void;
  mealDays: number;
  onMealDaysChange: (days: number) => void;
  allowShopping: boolean;
  onAllowShoppingChange: (allow: boolean) => void;
  peopleCount: number;
  onPeopleCountChange: (count: number) => void;
  mealType: string;
  onMealTypeChange: (type: string) => void;
  occasionType: string;
  onOccasionTypeChange: (type: string) => void;
  cuisineType: string;
  onCuisineTypeChange: (type: string) => void;
}

export const PreferencesSelector = ({
  skillLevel,
  onSkillLevelChange,
  mealDays,
  onMealDaysChange,
  allowShopping,
  onAllowShoppingChange,
  peopleCount,
  onPeopleCountChange,
  mealType,
  onMealTypeChange,
  occasionType,
  onOccasionTypeChange,
  cuisineType,
  onCuisineTypeChange,
}: PreferencesSelectorProps) => {
  const { t } = useLanguage();
  const skillLevels = [
    { 
      value: 'beginner', 
      label: t('beginner'), 
      description: t('beginnerDesc'),
      emoji: '🌱'
    },
    { 
      value: 'intermediate', 
      label: t('intermediate'), 
      description: t('intermediateDesc'),
      emoji: '👩‍🍳'
    },
    { 
      value: 'advanced', 
      label: t('advanced'), 
      description: t('advancedDesc'),
      emoji: '⭐'
    },
  ];

  const peopleOptions = [1, 2, 3, 4, 5, 6, 8, 10];

  const mealTypeOptions = [
    { value: 'breakfast', label: t('breakfast'), emoji: '🌅' },
    { value: 'brunch', label: t('brunch'), emoji: '🥐' },
    { value: 'lunch', label: t('lunch'), emoji: '🌞' },
    { value: 'dinner', label: t('dinner'), emoji: '🌙' },
    { value: 'snack', label: t('snack'), emoji: '🍪' },
  ];

  const occasionOptions = [
    { 
      value: 'daily', 
      label: t('dailyMeal'), 
      description: t('dailyMealDesc'),
      emoji: '🏠'
    },
    { 
      value: 'gathering', 
      label: t('gatheringParty'), 
      description: t('gatheringPartyDesc'),
      emoji: '🎉'
    },
  ];

  const cuisineOptions = [
    { value: 'chinese', label: t('chinese'), emoji: '🥢' },
    { value: 'american', label: t('american'), emoji: '🍔' },
    { value: 'korean', label: t('korean'), emoji: '🥘' },
    { value: 'japanese', label: t('japanese'), emoji: '🍱' },
    { value: 'italian', label: t('italian'), emoji: '🍝' },
    { value: 'mexican', label: t('mexican'), emoji: '🌮' },
    { value: 'indian', label: t('indian'), emoji: '🍛' },
    { value: 'thai', label: t('thai'), emoji: '🍜' },
    { value: 'mediterranean', label: t('mediterranean'), emoji: '🫒' },
    { value: 'fusion', label: t('fusion'), emoji: '🌍' },
  ];

  const dayOptions = [1, 2, 3, 5, 7];

  return (
    <div className="w-full p-8 space-y-8">
      <div className="text-center space-y-3">
        <h3 className="text-2xl font-bold text-foreground">
          {t('cookingPreferences')}
        </h3>
        <p className="text-lg text-muted-foreground">
          {t('cookingPreferencesDesc')}
        </p>
      </div>

      {/* Number of People */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('howManyPeople')}</h4>
        </div>
        <div className="flex flex-wrap gap-3">
          {peopleOptions.map((count) => (
            <button
              key={count}
              onClick={() => onPeopleCountChange(count)}
              className={`
                px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105
                ${peopleCount === count 
                  ? 'bg-primary text-white shadow-button' 
                  : 'bg-soft-white text-foreground hover:bg-soft-blue border border-border'
                }
              `}
            >
              {count} {count === 1 ? t('person') : t('people')}
            </button>
          ))}
        </div>
      </div>

      {/* Meal Type */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('whatMeal')}</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {mealTypeOptions.map((meal) => (
            <button
              key={meal.value}
              onClick={() => onMealTypeChange(meal.value)}
              className={`
                rounded-2xl p-6 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
                ${mealType === meal.value 
                  ? 'bg-gradient-blue text-white shadow-elegant' 
                  : 'bg-soft-white hover:bg-soft-blue border border-border'
                }
              `}
            >
              <div className="text-center space-y-3">
                <div className="text-3xl">{meal.emoji}</div>
                <div className="font-semibold text-lg">{meal.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Occasion Type */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('whatsOccasion')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {occasionOptions.map((occasion) => (
            <button
              key={occasion.value}
              onClick={() => onOccasionTypeChange(occasion.value)}
              className={`
                rounded-2xl p-6 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
                ${occasionType === occasion.value 
                  ? 'bg-gradient-blue text-white shadow-elegant' 
                  : 'bg-soft-white hover:bg-soft-blue border border-border'
                }
              `}
            >
              <div className="text-center space-y-3">
                <div className="text-3xl">{occasion.emoji}</div>
                <div className="font-semibold text-lg">{occasion.label}</div>
                <div className="text-sm opacity-80">{occasion.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine Type */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('whatCuisine')}</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cuisineOptions.map((cuisine) => (
            <button
              key={cuisine.value}
              onClick={() => onCuisineTypeChange(cuisine.value)}
              className={`
                rounded-xl p-4 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
                ${cuisineType === cuisine.value 
                  ? 'bg-primary text-white shadow-button' 
                  : 'bg-soft-white hover:bg-soft-blue border border-border'
                }
              `}
            >
              <div className="text-center space-y-2">
                <div className="text-2xl">{cuisine.emoji}</div>
                <div className="text-sm font-medium">{cuisine.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Skill Level */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('cookingSkillLevel')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {skillLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => onSkillLevelChange(level.value)}
              className={`
                rounded-2xl p-6 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
                ${skillLevel === level.value 
                  ? 'bg-gradient-blue text-white shadow-elegant' 
                  : 'bg-soft-white hover:bg-soft-blue border border-border'
                }
              `}
            >
              <div className="text-center space-y-3">
                <div className="text-3xl">{level.emoji}</div>
                <div className="font-semibold text-lg">{level.label}</div>
                <div className="text-sm opacity-80">{level.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Meal Planning Days */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('planMealsDays')}</h4>
        </div>
        <div className="flex flex-wrap gap-3">
          {dayOptions.map((days) => (
            <button
              key={days}
              onClick={() => onMealDaysChange(days)}
              className={`
                px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105
                ${mealDays === days 
                  ? 'bg-primary text-white shadow-button' 
                  : 'bg-soft-white text-foreground hover:bg-soft-blue border border-border'
                }
              `}
            >
              {days} {days === 1 ? t('day') : t('days')}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping Preference */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{t('shoppingPreference')}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => onAllowShoppingChange(false)}
            className={`
              rounded-2xl p-6 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
              ${!allowShopping 
                ? 'bg-gradient-blue text-white shadow-elegant' 
                : 'bg-soft-white hover:bg-soft-blue border border-border'
              }
            `}
          >
            <div className="text-center space-y-3">
              <div className="text-3xl">🏠</div>
              <div className="font-semibold text-lg">{t('useWhatIHave')}</div>
              <div className="text-sm opacity-80">{t('useWhatIHaveDesc')}</div>
            </div>
          </button>
          
          <button
            onClick={() => onAllowShoppingChange(true)}
            className={`
              rounded-2xl p-6 transition-all duration-200 hover:shadow-card transform hover:scale-[1.02]
              ${allowShopping 
                ? 'bg-gradient-blue text-white shadow-elegant' 
                : 'bg-soft-white hover:bg-soft-blue border border-border'
              }
            `}
          >
            <div className="text-center space-y-3">
              <div className="text-3xl">🛒</div>
              <div className="font-semibold text-lg">{t('iCanShop')}</div>
              <div className="text-sm opacity-80">{t('iCanShopDesc')}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};