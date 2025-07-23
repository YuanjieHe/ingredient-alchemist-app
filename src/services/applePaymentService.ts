import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Purchases } from '@revenuecat/purchases-capacitor';

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
  private isInitialized = false;

  public static getInstance(): ApplePaymentService {
    if (!ApplePaymentService.instance) {
      ApplePaymentService.instance = new ApplePaymentService();
    }
    return ApplePaymentService.instance;
  }

  isApplePayAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  async initialize(apiKey: string, userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 配置RevenueCat
      await Purchases.configure({
        apiKey,
        appUserID: userId || undefined
      });

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  async getOfferings(): Promise<any> {
    if (!this.isApplePayAvailable()) {
      console.log('RevenueCat not available on this platform');
      return null;
    }

    try {
      const result = await Purchases.getOfferings();
      return result;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async purchaseProduct(planType: string): Promise<ApplePurchaseResult> {
    if (!this.isApplePayAvailable()) {
      // 在非iOS环境下，回退到网页支付
      return this.fallbackToWebPayment(planType);
    }

    try {
      // 获取产品列表
      const offerings = await this.getOfferings();
      if (!offerings?.current?.availablePackages) {
        throw new Error('No products available');
      }

      // 查找对应的产品包
      const targetPackage = offerings.current.availablePackages.find(
        (pkg: any) => pkg.identifier === PRODUCT_IDS[planType as keyof typeof PRODUCT_IDS]
      );

      if (!targetPackage) {
        throw new Error(`Product not found for plan: ${planType}`);
      }

      // 发起购买
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: targetPackage
      });

      const customerInfo = purchaseResult.customerInfo;
      const transaction = purchaseResult.transaction;

      console.log('RevenueCat purchase successful:', {
        customerInfo,
        transaction
      });

      // 调用后端处理购买
      const { error } = await supabase.functions.invoke('process-apple-purchase', {
        body: {
          transactionId: transaction?.transactionIdentifier,
          originalTransactionId: transaction?.transactionIdentifier, // RevenueCat已处理原始ID
          productId: targetPackage.identifier,
          planType,
          revenueCatUserId: customerInfo.originalAppUserId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        transactionId: transaction?.transactionIdentifier,
        originalTransactionId: transaction?.transactionIdentifier,
        productId: targetPackage.identifier
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
      // 调用RevenueCat的恢复购买API
      const result = await Purchases.restorePurchases();
      console.log('恢复购买成功:', result);
      toast.success('购买已恢复');
      return true;
    } catch (error) {
      console.error('恢复购买失败:', error);
      toast.error('恢复购买失败');
      return false;
    }
  }

  async checkSubscriptionStatus(): Promise<any> {
    if (!this.isApplePayAvailable()) {
      return null;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  // 获取产品价格信息（在真实环境中从App Store获取）
  getProductInfo(planType: string) {
    return PRODUCT_INFO[planType as keyof typeof PRODUCT_INFO] || null;
  }
}