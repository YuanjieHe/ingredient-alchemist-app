import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface IngredientInputProps {
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
}

export const IngredientInput = ({ ingredients, onIngredientsChange }: IngredientInputProps) => {
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
      toast.error('Please upload an image file');
      return;
    }

    setIsProcessingImage(true);
    
    try {
      // Here we would typically use AI to analyze the image
      // For now, we'll simulate with a mock response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockIngredients = [
        'Tomatoes', 'Onions', 'Garlic', 'Bell peppers', 
        'Carrots', 'Potatoes', 'Lettuce', 'Eggs'
      ];
      
      const detectedIngredients = mockIngredients.slice(0, Math.floor(Math.random() * 4) + 3);
      
      const newIngredients = detectedIngredients.filter(ing => 
        !ingredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
      );
      
      if (newIngredients.length > 0) {
        onIngredientsChange([...ingredients, ...newIngredients]);
        toast.success(`Found ${newIngredients.length} ingredients in your photo!`);
      } else {
        toast.info('No new ingredients detected in this photo');
      }
    } catch (error) {
      toast.error('Failed to analyze image. Please try again.');
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
            What's in your kitchen? 🥗
          </h3>
          <p className="text-muted-foreground text-sm">
            Take a photo of your ingredients or add them manually
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
            {isProcessingImage ? 'Analyzing...' : 'Take Photo'}
          </Button>
          
          <Button
            variant="fresh"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="w-full"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Photo
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
              placeholder="Type an ingredient (e.g., chicken, rice, tomatoes...)"
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
        </div>

        {/* Ingredients List */}
        {ingredients.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Your Ingredients:</h4>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-cooking-warm text-foreground hover:bg-cooking-spice hover:text-white transition-colors px-3 py-1 text-sm"
                >
                  {ingredient}
                  <button
                    onClick={() => removeIngredient(ingredient)}
                    className="ml-2 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isProcessingImage && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Analyzing your ingredients...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};