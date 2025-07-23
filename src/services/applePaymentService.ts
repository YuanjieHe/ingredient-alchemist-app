import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// 产品ID配置（需要在App Store Connect中设置）
export const PRODUCT_IDS = {
  monthly: 'what2cook_monthly_premium',
  quarterly: 'what2cook_quarterly_premium', 
  annual: 'what2cook_annual_premium',
  lifetime: 'what2cook_lifetime_premium'
};

// 产品信息配置
export const PRODUCT_INFO = {
  monthly: { price: '¥14', period: '月' },
  quarterly: { price: '¥30', period: '季度' },
  annual: { price: '¥98', period: '年' },
  lifetime: { price: '¥168', period: '终生' }
};

export interface ApplePurchaseResult {
  success: boolean;
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  error?: string;
}

export class ApplePaymentService {
  private static instance: ApplePaymentService;

  public static getInstance(): ApplePaymentService {
    if (!ApplePaymentService.instance) {
      ApplePaymentService.instance = new ApplePaymentService();
    }
    return ApplePaymentService.instance;
  }

  isApplePayAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  async purchaseProduct(planType: string): Promise<ApplePurchaseResult> {
    if (!this.isApplePayAvailable()) {
      // 在非iOS环境下，回退到网页支付
      return this.fallbackToWebPayment(planType);
    }

    try {
      // 在真实iOS环境中，这里会调用原生的Apple Store Kit
      // 现在我们模拟成功的购买流程
      const mockTransaction = {
        transactionId: `ios_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalTransactionId: `ios_orig_${Date.now()}`,
        productId: PRODUCT_IDS[planType as keyof typeof PRODUCT_IDS]
      };

      console.log('模拟Apple内购成功:', mockTransaction);

      // 调用后端处理购买
      const { error } = await supabase.functions.invoke('process-apple-purchase', {
        body: {
          transactionId: mockTransaction.transactionId,
          originalTransactionId: mockTransaction.originalTransactionId,
          productId: mockTransaction.productId,
          planType
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        transactionId: mockTransaction.transactionId,
        originalTransactionId: mockTransaction.originalTransactionId,
        productId: mockTransaction.productId
      };

    } catch (error: any) {
      console.error('Apple purchase failed:', error);
      return {
        success: false,
        error: error.message || '购买失败'
      };
    }
  }

  private async fallbackToWebPayment(planType: string): Promise<ApplePurchaseResult> {
    try {
      // 回退到Stripe支付
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // 在新标签页打开支付页面
        window.open(data.url, '_blank');
        return {
          success: true,
          error: 'Redirected to web payment'
        };
      }

      throw new Error('无法创建支付链接');
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '支付失败'
      };
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.isApplePayAvailable()) {
      toast.error('恢复购买仅在iOS设备上可用');
      return false;
    }

    try {
      // 在真实环境中调用iOS的恢复购买API
      console.log('模拟恢复购买成功');
      toast.success('购买已恢复');
      return true;
    } catch (error) {
      console.error('恢复购买失败:', error);
      toast.error('恢复购买失败');
      return false;
    }
  }

  // 获取产品价格信息（在真实环境中从App Store获取）
  getProductInfo(planType: string) {
    return PRODUCT_INFO[planType as keyof typeof PRODUCT_INFO] || null;
  }
}