import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import RecipeGenerator from "./pages/RecipeGenerator";
import IngredientsBank from "./pages/IngredientsBank";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import BottomNavigation from "./components/BottomNavigation";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                path="/" 
                element={
                  <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                      <RecipeGenerator />
                    </div>
                  </div>
                } 
              />
              <Route 
                path="/ingredients" 
                element={
                  <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                      <IngredientsBank />
                    </div>
                  </div>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNavigation />
          </div>
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
