import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
}

export const ApiKeyInput = ({ onApiKeySubmit }: ApiKeyInputProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-cooking-warm rounded-full flex items-center justify-center mb-4">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Connect Your AI Assistant</CardTitle>
        <p className="text-muted-foreground text-sm">
          We need your Google AI Studio API key to generate personalized recipes
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google AI Studio API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={!apiKey.trim()}>
            Start Cooking! 🍳
          </Button>
        </form>

        <div className="space-y-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Don't have an API key?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Get Free API Key
            </Button>
          </div>
          
          <div className="bg-cooking-cream p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              🔒 Your API key is stored locally and only used to generate recipes. 
              We recommend using Supabase for secure API key management in production.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};