import { Link, useLocation } from 'react-router-dom';
import { ChefHat, Package, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const BottomNavigation = () => {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: ChefHat,
      label: t('aiGenerator') || 'AI生成器',
    },
    {
      path: '/ingredients',
      icon: Package,
      label: t('ingredientsBank') || '食材银行',
    },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="flex flex-col items-center space-y-1 py-2 px-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">{t('signOut') || '退出'}</span>
        </Button>
      </div>
    </div>
  );
};

export default BottomNavigation;