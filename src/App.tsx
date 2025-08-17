import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import RecipeGenerator from "./pages/RecipeGenerator";
import Profile from "./pages/Profile";
import IngredientsBank from "./pages/IngredientsBank";
import Subscription from "./pages/Subscription";
import DataBackup from "./pages/DataBackup";
import AdminDashboard from "./pages/AdminDashboard";

import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RecipeDetail from "./pages/RecipeDetail";
import BottomNavigation from "./components/BottomNavigation";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <LanguageProvider>
      <SubscriptionProvider>
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
                      <IngredientsBank />
                    </div>
                  </div>
                } 
              />
              <Route 
                path="/recipes" 
                element={
                  <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                      <RecipeGenerator />
                    </div>
                  </div>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <div className="pb-20">
                    <Profile />
                  </div>
                } 
              />
              <Route 
                path="/subscription" 
                element={
                  <div className="pb-20">
                    <Subscription />
                  </div>
                } 
              />
              <Route 
                path="/backup" 
                element={
                  <div className="pb-20">
                    <DataBackup />
                  </div>
                } 
              />
              <Route 
                path="/admin" 
                element={<AdminDashboard />} 
              />
              <Route 
                path="/recipe/:id" 
                element={
                  <div className="container mx-auto px-4 py-8 pb-20">
                    <div className="max-w-4xl mx-auto">
                      <RecipeDetail />
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
      </SubscriptionProvider>
    </LanguageProvider>
  </AuthProvider>
);

export default App;
