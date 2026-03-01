/**
 * Supabase Edge Function: Stripe Webhook
 *
 * Deploy: supabase functions deploy stripe-webhook
 * Env: STRIPE_WEBHOOK_SECRET (Signing secret from Stripe), STRIPE_SECRET_KEY (Stripe API key)
 *
 * Subscribed events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */

// @deno-types="https://esm.sh/v135/stripe@14.28.0/types/Stripe.d.ts"
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-11-20" })
  : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await Stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(message, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (!userId || !customerId) {
          return new Response(
            JSON.stringify({ error: "Missing client_reference_id or customer" }),
            { status: 400 }
          );
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            plan: "premium",
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (profileError) {
          console.error("[stripe-webhook] profiles update", profileError);
          return new Response(
            JSON.stringify({ error: profileError.message }),
            { status: 500 }
          );
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (subscriptionId && stripe) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const item = sub.items?.data?.[0];
          const price = item?.price;

          const { error: subError } = await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_customer_id: customerId,
              status: sub.status,
              price_id: price?.id ?? null,
              product_id: typeof price?.product === "string" ? price.product : (price?.product as Stripe.Product)?.id ?? null,
              currency: price?.currency ?? null,
              interval: price?.recurring?.interval ?? null,
              interval_count: price?.recurring?.interval_count ?? null,
              current_period_start: sub.current_period_start
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
              canceled_at: sub.canceled_at
                ? new Date(sub.canceled_at * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "stripe_subscription_id",
              ignoreDuplicates: false,
            }
          );

          if (subError) {
            console.error("[stripe-webhook] subscriptions upsert", subError);
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const { data: rows } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .limit(1);

        const userId = rows?.[0]?.user_id;

        await supabase
          .from("subscriptions")
          .update({
            status: sub.status,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            canceled_at: sub.canceled_at
              ? new Date(sub.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        const activeStatuses = ["active", "trialing"];
        if (userId && !activeStatuses.includes(sub.status)) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const { data: rows } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .limit(1);

        const userId = rows?.[0]?.user_id;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
