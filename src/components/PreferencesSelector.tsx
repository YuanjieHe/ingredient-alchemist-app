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
    <Card className="w-full animate-fade-in">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('cookingPreferences')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('cookingPreferencesDesc')}
          </p>
        </div>

        {/* Number of People */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('howManyPeople')}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {peopleOptions.map((count) => (
              <Badge
                key={count}
                variant={peopleCount === count ? "default" : "secondary"}
                className={`
                  cursor-pointer px-4 py-2 text-sm transition-all duration-200
                  ${peopleCount === count 
                    ? 'bg-primary text-primary-foreground shadow-primary' 
                    : 'bg-cooking-warm text-foreground hover:bg-cooking-spice hover:text-white'
                  }
                `}
                onClick={() => onPeopleCountChange(count)}
              >
                {count} {count === 1 ? t('person') : t('people')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Meal Type */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Coffee className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('whatMeal')}</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mealTypeOptions.map((meal) => (
              <div
                key={meal.value}
                onClick={() => onMealTypeChange(meal.value)}
                className={`
                  cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-warm
                  ${mealType === meal.value 
                    ? 'border-primary bg-cooking-cream shadow-primary' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{meal.emoji}</div>
                  <div className="font-medium">{meal.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Occasion Type */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('whatsOccasion')}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {occasionOptions.map((occasion) => (
              <div
                key={occasion.value}
                onClick={() => onOccasionTypeChange(occasion.value)}
                className={`
                  cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-warm
                  ${occasionType === occasion.value 
                    ? 'border-primary bg-cooking-cream shadow-primary' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{occasion.emoji}</div>
                  <div className="font-medium">{occasion.label}</div>
                  <div className="text-xs text-muted-foreground">{occasion.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cuisine Type */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('whatCuisine')}</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cuisineOptions.map((cuisine) => (
              <div
                key={cuisine.value}
                onClick={() => onCuisineTypeChange(cuisine.value)}
                className={`
                  cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-warm
                  ${cuisineType === cuisine.value 
                    ? 'border-primary bg-cooking-cream shadow-primary' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center space-y-1">
                  <div className="text-xl">{cuisine.emoji}</div>
                  <div className="text-sm font-medium">{cuisine.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Level */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ChefHat className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('cookingSkillLevel')}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {skillLevels.map((level) => (
              <div
                key={level.value}
                onClick={() => onSkillLevelChange(level.value)}
                className={`
                  cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-warm
                  ${skillLevel === level.value 
                    ? 'border-primary bg-cooking-cream shadow-primary' 
                    : 'border-border bg-card hover:border-primary/50'
                  }
                `}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl">{level.emoji}</div>
                  <div className="font-medium">{level.label}</div>
                  <div className="text-xs text-muted-foreground">{level.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meal Planning Days */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('planMealsDays')}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((days) => (
              <Badge
                key={days}
                variant={mealDays === days ? "default" : "secondary"}
                className={`
                  cursor-pointer px-4 py-2 text-sm transition-all duration-200
                  ${mealDays === days 
                    ? 'bg-primary text-primary-foreground shadow-primary' 
                    : 'bg-cooking-warm text-foreground hover:bg-cooking-spice hover:text-white'
                  }
                `}
                onClick={() => onMealDaysChange(days)}
              >
                {days} {days === 1 ? t('day') : t('days')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Shopping Preference */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">{t('shoppingPreference')}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onAllowShoppingChange(false)}
              className={`
                cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-warm
                ${!allowShopping 
                  ? 'border-primary bg-cooking-cream shadow-primary' 
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
            >
              <div className="text-center space-y-2">
                <div className="text-2xl">🏠</div>
                <div className="font-medium">{t('useWhatIHave')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('useWhatIHaveDesc')}
                </div>
              </div>
            </div>
            
            <div
              onClick={() => onAllowShoppingChange(true)}
              className={`
                cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-warm
                ${allowShopping 
                  ? 'border-primary bg-cooking-cream shadow-primary' 
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
            >
              <div className="text-center space-y-2">
                <div className="text-2xl">🛒</div>
                <div className="font-medium">{t('iCanShop')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('iCanShopDesc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};