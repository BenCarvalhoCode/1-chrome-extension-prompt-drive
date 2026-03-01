# Supabase Edge Functions

Funções para deploy no Supabase (Edge Functions).

## stripe-webhook

Recebe webhooks do Stripe e atualiza `profiles` e `subscriptions` no Supabase.

### Eventos tratados

- **checkout.session.completed** — Atualiza `profiles.plan` para `premium` e `stripe_customer_id`; insere ou atualiza em `subscriptions`.
- **customer.subscription.updated** — Atualiza a linha em `subscriptions`; se o status não for ativo/trialing, define `profiles.plan` como `free`.
- **customer.subscription.deleted** — Marca a assinatura como encerrada e define `profiles.plan` como `free`.

### Variáveis de ambiente (Supabase)

No dashboard: **Edge Functions** > **stripe-webhook** > **Secrets** (ou via CLI):

- **STRIPE_WEBHOOK_SECRET** — Signing secret do endpoint de webhook no Stripe (whsec_...).
- **STRIPE_SECRET_KEY** — Chave secreta da API do Stripe (sk_test_... ou sk_live_...).

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados pelo Supabase.

### Deploy

Com o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado:

```bash
# Na raiz do projeto Supabase (onde está supabase/config.toml)
# Copie o conteúdo de supabase-functions/stripe-webhook/ para supabase/functions/stripe-webhook/

supabase functions deploy stripe-webhook --project-ref SEU_PROJECT_REF
```

Ou copie a pasta `stripe-webhook` para dentro de `supabase/functions/` do seu repositório Supabase e rode o deploy.

### URL do webhook

Após o deploy, a URL será:

```
https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Use essa URL no Stripe Dashboard em **Developers** > **Webhooks** > **Add endpoint**.

### Stripe Dashboard

1. **Webhooks** > **Add endpoint** > URL da função acima.
2. Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copie o **Signing secret** e configure como `STRIPE_WEBHOOK_SECRET`.
