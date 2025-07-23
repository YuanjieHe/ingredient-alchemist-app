import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface SubscriptionData {
  id: string;
  user_id: string;
  subscription_type: 'free' | 'premium';
  subscription_status: 'active' | 'expired' | 'cancelled';
  free_generations_used: number;
  free_generations_limit: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  apple_transaction_id?: string;
  apple_original_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  canGenerate: boolean;
  remainingGenerations: number;
  incrementUsage: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  upgradeSubscription: (appleTransactionId: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        
        // 如果是网络错误或其他严重错误，创建默认订阅记录
        if (error.message.includes('Load failed') || error.code === 'PGRST116') {
          console.log('Creating default subscription due to error:', error.message);
          
          // 创建默认的免费订阅对象，避免显示"加载失败"
          const defaultSubscription = {
            id: 'temp-' + user.id,
            user_id: user.id,
            subscription_type: 'free' as const,
            subscription_status: 'active' as const,
            free_generations_used: 0,
            free_generations_limit: 3,
            subscription_start_date: null,
            subscription_end_date: null,
            apple_transaction_id: null,
            apple_original_transaction_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setSubscription(defaultSubscription);
          setLoading(false);
          return;
        }
        
        // 其他错误仍然设置为null
        setSubscription(null);
        setLoading(false);
        return;
      }

      if (data) {
        setSubscription(data as SubscriptionData);
      } else {
        // 如果没有数据，尝试创建默认记录
        try {
          const { error: insertError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user.id,
              subscription_type: 'free',
              subscription_status: 'active',
              free_generations_used: 0,
              free_generations_limit: 3
            });
          
          if (!insertError) {
            // 重新获取数据
            const { data: newData } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (newData) {
              setSubscription(newData as SubscriptionData);
            }
          } else {
            // 如果插入失败，使用默认对象
            const defaultSubscription = {
              id: 'temp-' + user.id,
              user_id: user.id,
              subscription_type: 'free' as const,
              subscription_status: 'active' as const,
              free_generations_used: 0,
              free_generations_limit: 3,
              subscription_start_date: null,
              subscription_end_date: null,
              apple_transaction_id: null,
              apple_original_transaction_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            setSubscription(defaultSubscription);
          }
        } catch (fallbackError) {
          console.error('Fallback subscription creation failed:', fallbackError);
          setSubscription(null);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // 网络或其他严重错误时，创建默认订阅以避免显示错误
      const defaultSubscription = {
        id: 'temp-' + user.id,
        user_id: user.id,
        subscription_type: 'free' as const,
        subscription_status: 'active' as const,
        free_generations_used: 0,
        free_generations_limit: 3,
        subscription_start_date: null,
        subscription_end_date: null,
        apple_transaction_id: null,
        apple_original_transaction_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setSubscription(defaultSubscription);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [user, authLoading]);

  const canGenerate = subscription ? 
    (subscription.subscription_type === 'premium' && subscription.subscription_status === 'active') ||
    (subscription.subscription_type === 'free' && subscription.free_generations_used < subscription.free_generations_limit)
    : false;

  const remainingGenerations = subscription && subscription.subscription_type === 'free' 
    ? Math.max(0, subscription.free_generations_limit - subscription.free_generations_used)
    : subscription?.subscription_type === 'premium' ? -1 : 0; // -1 means unlimited

  const incrementUsage = async (): Promise<boolean> => {
    if (!user || !subscription) {
      toast.error('请先登录');
      return false;
    }

    // Check if user can generate
    if (!canGenerate) {
      if (subscription.subscription_type === 'free') {
        toast.error('免费次数已用完，请升级到高级版本');
      } else {
        toast.error('订阅已过期，请续费');
      }
      return false;
    }

    // If premium user, no need to increment usage
    if (subscription.subscription_type === 'premium' && subscription.subscription_status === 'active') {
      return true;
    }

    // Increment free usage
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          free_generations_used: subscription.free_generations_used + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error incrementing usage:', error);
        toast.error('更新使用次数失败');
        return false;
      }

      // Update local state
      setSubscription(prev => prev ? {
        ...prev,
        free_generations_used: prev.free_generations_used + 1
      } : null);

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      toast.error('更新使用次数失败');
      return false;
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  const upgradeSubscription = async (appleTransactionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          subscription_type: 'premium',
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          apple_transaction_id: appleTransactionId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error upgrading subscription:', error);
        toast.error('升级订阅失败');
        return;
      }

      await refreshSubscription();
      toast.success('订阅升级成功！');
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.error('升级订阅失败');
    }
  };

  const value = {
    subscription,
    loading: loading || authLoading,
    canGenerate,
    remainingGenerations,
    incrementUsage,
    refreshSubscription,
    upgradeSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};