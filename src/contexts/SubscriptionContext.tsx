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
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      setSubscription(data as SubscriptionData);
    } catch (error) {
      console.error('Error fetching subscription:', error);
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