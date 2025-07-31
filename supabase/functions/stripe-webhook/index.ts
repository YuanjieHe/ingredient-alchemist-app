import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature || !endpointSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout completed for session: ${session.id}`);
  
  if (!session.customer_email) {
    console.error("No customer email in session");
    return;
  }

  // Find user by email
  const { data: user, error } = await supabaseClient.auth.admin.getUserByEmail(session.customer_email);
  
  if (error || !user) {
    console.error("User not found:", session.customer_email);
    return;
  }

  // Determine subscription type based on amount
  let subscriptionType = "premium";
  let subscriptionEndDate = new Date();
  
  if (session.amount_total) {
    const amount = session.amount_total;
    if (amount === 12500) { // $125 for 5 years
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 5);
    } else if (amount === 16800) { // $168 lifetime
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 50); // 50 years for lifetime
    } else if (amount === 2000) { // $20 quarterly (3 months)
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3);
    } else if (amount === 800) { // $8 monthly
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      // Default to 1 month for unknown amounts
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    }
  }

  // Update subscription
  const { error: updateError } = await supabaseClient
    .from("user_subscriptions")
    .upsert({
      user_id: user.user.id,
      subscription_type: subscriptionType,
      subscription_status: "active",
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
      free_generations_used: 0,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id"
    });

  if (updateError) {
    console.error("Error updating subscription:", updateError);
  } else {
    console.log(`Successfully upgraded user ${user.user.id} to premium`);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  // Handle one-time payments if needed
}

async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  console.log(`Subscription payment succeeded: ${invoice.id}`);
  // Handle recurring subscription payments
}