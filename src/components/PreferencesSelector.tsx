import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, ShoppingCart } from 'lucide-react';

interface PreferencesSelectorProps {
  skillLevel: string;
  onSkillLevelChange: (level: string) => void;
  mealDays: number;
  onMealDaysChange: (days: number) => void;
  allowShopping: boolean;
  onAllowShoppingChange: (allow: boolean) => void;
}

export const PreferencesSelector = ({
  skillLevel,
  onSkillLevelChange,
  mealDays,
  onMealDaysChange,
  allowShopping,
  onAllowShoppingChange,
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

  const dayOptions = [1, 2, 3, 5, 7];

  return (
    <Card className="w-full animate-fade-in">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Tell us about your cooking style 👩‍🍳
          </h3>
          <p className="text-muted-foreground text-sm">
            This helps us create the perfect recipes for you
          </p>
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