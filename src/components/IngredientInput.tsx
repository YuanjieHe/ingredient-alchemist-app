import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Plus, X, Beef, Fish, Wheat, Apple, Carrot, Egg, Milk } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

// 食材图标映射
const getIngredientIcon = (ingredient: string) => {
  const lowerIngredient = ingredient.toLowerCase();
  
  // 中英文食材映射
  const ingredientIconMap: { [key: string]: any } = {
    // 肉类
    '牛肉': Beef, '猪肉': Beef, '羊肉': Beef, '鸡肉': Beef, '肉': Beef, '肉类': Beef,
    'beef': Beef, 'pork': Beef, 'lamb': Beef, 'chicken': Beef, 'meat': Beef,
    
    // 海鲜
    '鱼': Fish, '虾': Fish, '蟹': Fish, '鱿鱼': Fish, '章鱼': Fish, '海鲜': Fish,
    'fish': Fish, 'shrimp': Fish, 'crab': Fish, 'squid': Fish, 'seafood': Fish,
    
    // 蔬菜
    '胡萝卜': Carrot, '萝卜': Carrot, '白萝卜': Carrot, '青萝卜': Carrot,
    'carrot': Carrot, 'radish': Carrot,
    '土豆': Apple, '番茄': Apple, '西红柿': Apple, '黄瓜': Apple, '茄子': Apple,
    'potato': Apple, 'tomato': Apple, 'cucumber': Apple, 'eggplant': Apple,
    
    // 水果
    '苹果': Apple, '香蕉': Apple, '橙子': Apple, '柠檬': Apple, '葡萄': Apple,
    'apple': Apple, 'banana': Apple, 'orange': Apple, 'lemon': Apple, 'grape': Apple,
    
    // 谷物
    '大米': Wheat, '面粉': Wheat, '小麦': Wheat, '燕麦': Wheat, '玉米': Wheat,
    'rice': Wheat, 'flour': Wheat, 'wheat': Wheat, 'oats': Wheat, 'corn': Wheat,
    
    // 蛋奶类
    '鸡蛋': Egg, '蛋': Egg, '牛奶': Milk, '奶': Milk, '酸奶': Milk, '奶酪': Milk,
    'egg': Egg, 'milk': Milk, 'yogurt': Milk, 'cheese': Milk
  };

  // 寻找匹配的食材
  for (const [key, icon] of Object.entries(ingredientIconMap)) {
    if (lowerIngredient.includes(key) || key.includes(lowerIngredient)) {
      return icon;
    }
  }
  
  return null; // 没有找到匹配的图标
};

interface IngredientInputProps {
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
}

export const IngredientInput = ({ ingredients, onIngredientsChange }: IngredientInputProps) => {
  const { t } = useLanguage();
  const [newIngredient, setNewIngredient] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      onIngredientsChange([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    onIngredientsChange(ingredients.filter(i => i !== ingredient));
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('pleaseUploadImageFile'));
      return;
    }

    setIsProcessingImage(true);
    
    try {
      // Convert file to base64 for OpenAI API
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      console.log('Sending image to GPT-4o for analysis...');
      
      // Call our edge function to analyze the image
      const { data, error } = await supabase.functions.invoke('analyze-ingredients', {
        body: { image: base64 }
      });

      if (error) {
        console.error('Error calling edge function:', error);
        throw new Error(error.message || 'Failed to analyze image');
      }

      console.log('GPT-4o analysis result:', data);

      const detectedIngredients = data.ingredients || [];
      
      const newIngredients = detectedIngredients.filter((ing: string) => 
        !ingredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
      );
      
      if (newIngredients.length > 0) {
        onIngredientsChange([...ingredients, ...newIngredients]);
        toast.success(`🎉 ${t('foundIngredients')} ${newIngredients.length} ${t('ingredientsInPhoto')}`);
      } else if (detectedIngredients.length > 0) {
        toast.info(t('allIngredientsAlreadyInList'));
      } else {
        toast.info(t('noIngredientsDetected'));
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast.error(t('failedToAnalyzeImage'));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    event.target.value = '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('whatsInYourKitchen')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('takePhotoOrAddManually')}
          </p>
        </div>

        {/* Photo Upload Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="warm"
            size="lg"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessingImage}
            className="w-full"
          >
            <Camera className="w-5 h-5 mr-2" />
            {isProcessingImage ? t('analyzing') : t('takePhoto')}
          </Button>
          
          <Button
            variant="fresh"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="w-full"
          >
            <Upload className="w-5 h-5 mr-2" />
            {t('uploadPhoto')}
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Manual Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t('typeIngredientPlaceholder')}
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={addIngredient}
              disabled={!newIngredient.trim()}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('enterKeyTip')} <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">{t('enterKey')}</kbd> {t('toQuicklyAdd')}
          </p>
        </div>

        {/* Ingredients List */}
        {ingredients.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">{t('yourIngredients')}</h4>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => {
                const IconComponent = getIngredientIcon(ingredient);
                return (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-cooking-warm text-foreground hover:bg-cooking-spice hover:text-white transition-colors px-3 py-1 text-sm flex items-center gap-1.5"
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {isProcessingImage && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>{t('analyzingIngredients')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};