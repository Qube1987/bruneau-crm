-- Table dediee pour les push subscriptions du CRM
-- (table separee pour eviter les fuites cross-app comme avec le stock/SAV)

CREATE TABLE IF NOT EXISTS public.crm_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.crm_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs gerent leurs propres subscriptions
CREATE POLICY "Users manage own crm push subscriptions"
  ON public.crm_push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- Index pour les lookups
CREATE INDEX IF NOT EXISTS idx_crm_push_subs_user_email
  ON public.crm_push_subscriptions(user_email);

CREATE INDEX IF NOT EXISTS idx_crm_push_subs_user_id
  ON public.crm_push_subscriptions(user_id);
