import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import RecipeGenerator from "./pages/RecipeGenerator";
import IngredientsBank from "./pages/IngredientsBank";
import NotFound from "./pages/NotFound";
import BottomNavigation from "./components/BottomNavigation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-background">
      {children}
      {user && <BottomNavigation />}
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/auth" 
          element={<Auth />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                  <RecipeGenerator />
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ingredients" 
          element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                  <IngredientsBank />
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
