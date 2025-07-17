import { useLanguage } from '@/contexts/LanguageContext';

const IngredientsBank = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t('ingredientsBank') || '食材银行'}</h1>
        <p className="text-muted-foreground">{t('manageYourIngredients') || '管理您的食材库存'}</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <p className="text-lg text-muted-foreground">
          {t('authRequiredForBank') || '需要登录才能使用食材银行功能'}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('bankFeatureTemporarilyDisabled') || '此功能已临时禁用'}
        </p>
      </div>
    </div>
  );
};

export default IngredientsBank;