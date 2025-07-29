import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log(`Verifying payment for user: ${user.email}`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Find Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log("No Stripe customer found");
      return new Response(JSON.stringify({ hasActivePremium: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log(`Found Stripe customer: ${customerId}`);

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Check for successful one-time payments
    const payments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 20,
    });

    const successfulPayments = payments.data.filter(
      payment => payment.status === "succeeded" && 
      payment.created > (Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
    );

    console.log(`Found ${subscriptions.data.length} active subscriptions`);
    console.log(`Found ${successfulPayments.length} successful payments`);

    let subscriptionType = "free";
    let subscriptionStatus = "active";
    let subscriptionEndDate = null;

    // Check active subscriptions first
    if (subscriptions.data.length > 0) {
      subscriptionType = "premium";
      const subscription = subscriptions.data[0];
      subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
      console.log(`Active subscription found, ends: ${subscriptionEndDate}`);
    } 
    // Check for recent successful payments (one-time)
    else if (successfulPayments.length > 0) {
      subscriptionType = "premium";
      // For one-time payments, set end date based on payment type
      const latestPayment = successfulPayments[0];
      const paymentAmount = latestPayment.amount;
      
      // Determine subscription duration based on amount
      let durationMonths = 1; // Default to 1 month
      if (paymentAmount >= 12500) { // $125 annual
        durationMonths = 12;
      } else if (paymentAmount >= 2000) { // $20 monthly
        durationMonths = 1;
      } else if (paymentAmount >= 800) { // $8 monthly
        durationMonths = 1;
      }
      
      const endDate = new Date(latestPayment.created * 1000);
      endDate.setMonth(endDate.getMonth() + durationMonths);
      subscriptionEndDate = endDate.toISOString();
      
      console.log(`One-time payment found: $${paymentAmount/100}, duration: ${durationMonths} months`);
    }

    // Update or create subscription record
    const { error: upsertError } = await supabaseClient
      .from("user_subscriptions")
      .upsert({
        user_id: user.id,
        subscription_type: subscriptionType,
        subscription_status: subscriptionStatus,
        subscription_start_date: subscriptionType === "premium" ? new Date().toISOString() : null,
        subscription_end_date: subscriptionEndDate,
        free_generations_used: subscriptionType === "premium" ? 0 : undefined, // Reset if premium
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (upsertError) {
      console.error("Error updating subscription:", upsertError);
      throw upsertError;
    }

    console.log(`Updated subscription for user ${user.id}: ${subscriptionType}`);

    return new Response(JSON.stringify({
      hasActivePremium: subscriptionType === "premium",
      subscriptionType,
      subscriptionEndDate,
      message: subscriptionType === "premium" ? "Premium subscription activated!" : "No active premium subscription found"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});