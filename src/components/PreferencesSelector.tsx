import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, ShoppingCart, Users, Coffee, Globe, Calendar } from 'lucide-react';

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
  const skillLevels = [
    { 
      value: 'beginner', 
      label: 'Beginner', 
      description: 'Simple recipes with basic techniques',
      emoji: '🌱'
    },
    { 
      value: 'intermediate', 
      label: 'Intermediate', 
      description: 'Some cooking experience required',
      emoji: '👩‍🍳'
    },
    { 
      value: 'advanced', 
      label: 'Advanced', 
      description: 'Complex techniques and ingredients',
      emoji: '⭐'
    },
  ];

  const peopleOptions = [1, 2, 3, 4, 5, 6, 8, 10];

  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'brunch', label: 'Brunch', emoji: '🥐' },
    { value: 'lunch', label: 'Lunch', emoji: '🌞' },
    { value: 'dinner', label: 'Dinner', emoji: '🌙' },
    { value: 'snack', label: 'Snack', emoji: '🍪' },
  ];

  const occasionOptions = [
    { 
      value: 'daily', 
      label: 'Daily Meal', 
      description: 'Regular everyday cooking',
      emoji: '🏠'
    },
    { 
      value: 'gathering', 
      label: 'Gathering/Party', 
      description: 'Special occasion or entertaining guests',
      emoji: '🎉'
    },
  ];

  const cuisineOptions = [
    { value: 'chinese', label: 'Chinese', emoji: '🥢' },
    { value: 'american', label: 'American', emoji: '🍔' },
    { value: 'korean', label: 'Korean', emoji: '🥘' },
    { value: 'japanese', label: 'Japanese', emoji: '🍱' },
    { value: 'italian', label: 'Italian', emoji: '🍝' },
    { value: 'mexican', label: 'Mexican', emoji: '🌮' },
    { value: 'indian', label: 'Indian', emoji: '🍛' },
    { value: 'thai', label: 'Thai', emoji: '🍜' },
    { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
    { value: 'fusion', label: 'Fusion/Mixed', emoji: '🌍' },
  ];

  const dayOptions = [1, 2, 3, 5, 7];

  return (
    <Card className="w-full animate-fade-in">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tell us about your cooking preferences 👩‍🍳
          </h3>
          <p className="text-muted-foreground text-sm">
            This helps us create the perfect meal combinations for you
          </p>
        </div>

        {/* Number of People */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">How many people are eating?</h4>
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
                {count} {count === 1 ? 'person' : 'people'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Meal Type */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Coffee className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">What meal are you planning?</h4>
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
            <h4 className="font-medium text-foreground">What's the occasion?</h4>
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
            <h4 className="font-medium text-foreground">What cuisine do you prefer?</h4>
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
            <h4 className="font-medium text-foreground">Cooking Skill Level</h4>
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
            <h4 className="font-medium text-foreground">Plan meals for how many days?</h4>
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
                {days} {days === 1 ? 'day' : 'days'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Shopping Preference */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">Shopping preference</h4>
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
                <div className="font-medium">Use what I have</div>
                <div className="text-xs text-muted-foreground">
                  Only recipes with my current ingredients
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
                <div className="font-medium">I can shop</div>
                <div className="text-xs text-muted-foreground">
                  Include recipes that need a few extra items
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};