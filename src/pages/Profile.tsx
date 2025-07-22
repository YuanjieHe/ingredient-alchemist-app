import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, Trash2, Clock, Users, ChefHat, Utensils, User, LogOut, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  imageUrl?: string;
  ingredients: Array<{
    item: string;
    amount: string;
    needed?: boolean;
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

interface FavoriteRecipe {
  id: string;
  recipe_id: string;
  recipe_data: any; // Use any to handle JSONB data from Supabase
  created_at: string;
}

export default function Profile() {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorite_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites((data || []) as FavoriteRecipe[]);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error(t('loadFavoritesFailed') || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorite_recipes')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast.success(t('removedFromFavorites') || 'Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error(t('removeFavoriteFailed') || 'Failed to remove favorite');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`
          }
        });
        if (error) throw error;
        toast.success(t('signUpSuccess') || 'Account created successfully! Please check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast.success(t('loginSuccess') || 'Logged in successfully');
        setShowLogin(false);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || (isSignUp ? t('signUpFailed') : t('loginFailed')) || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setFavorites([]);
      toast.success(t('logoutSuccess') || 'Logged out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(t('logoutFailed') || 'Failed to log out');
    }
  };

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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="w-6 h-6" />
              {t('myProfile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showLogin ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {t('loginToViewFavorites')}
                </p>
                <Button onClick={() => navigate('/auth')} className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('login')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? t('loading') : 
                   isSignUp ? t('signUp') : t('login')}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowLogin(false)}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              {t('myProfile')}
            </CardTitle>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('totalFavorites')}: {favorites.length} {t('recipes')}
          </p>
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            {t('myFavorites')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              {t('loading')}
            </p>
          ) : favorites.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {t('noFavorites')}
            </p>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => {
                const recipe = favorite.recipe_data;
                return (
                  <Card key={favorite.id} className="overflow-hidden">
                    {recipe.imageUrl && (
                      <div className="w-full h-48 overflow-hidden">
                        <img 
                          src={recipe.imageUrl} 
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{recipe.title}</h3>
                          <p className="text-sm text-muted-foreground">{recipe.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFavorite(favorite.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          <ChefHat className="w-3 h-3 mr-1" />
                          {recipe.difficulty === 'beginner' ? t('beginner') : 
                           recipe.difficulty === 'intermediate' ? t('intermediate') : t('advanced')}
                        </Badge>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          {recipe.prepTime + recipe.cookTime} {t('min')}
                        </Badge>
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {recipe.servings} {t('servings')}
                        </Badge>
                      </div>

                      <Separator className="my-3" />

                      {/* 简化的食材列表 */}
                      <div className="mb-3">
                        <h4 className="font-medium mb-2 flex items-center">
                          <Utensils className="w-4 h-4 mr-1" />
                          {t('ingredients')}
                        </h4>
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          {recipe.ingredients.slice(0, 6).map((ingredient, index) => (
                            <div key={index} className="text-muted-foreground">
                              {ingredient.item}
                            </div>
                          ))}
                          {recipe.ingredients.length > 6 && (
                            <div className="text-muted-foreground">
                              +{recipe.ingredients.length - 6} {t('more')}
                            </div>
                          )}
                        </div>
                      </div>

                      {recipe.nutritionInfo && (
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.calories}</div>
                            <div className="text-muted-foreground">{t('calories')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.protein}</div>
                            <div className="text-muted-foreground">{t('protein')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.carbs}</div>
                            <div className="text-muted-foreground">{t('carbs')}</div>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <div className="font-bold text-primary">{recipe.nutritionInfo.fat}</div>
                            <div className="text-muted-foreground">{t('fat')}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}