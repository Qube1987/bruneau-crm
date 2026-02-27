import { createClient } from '@supabase/supabase-js';

export const supabaseCRM = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabaseSAV = createClient(
  import.meta.env.VITE_SAV_SUPABASE_URL,
  import.meta.env.VITE_SAV_SUPABASE_ANON_KEY
);

export const supabaseDEVIS = createClient(
  import.meta.env.VITE_DEVIS_SUPABASE_URL,
  import.meta.env.VITE_DEVIS_SUPABASE_ANON_KEY
);

export const supabaseSTOCK = createClient(
  import.meta.env.VITE_STOCK_SUPABASE_URL,
  import.meta.env.VITE_STOCK_SUPABASE_ANON_KEY
);

export { supabaseCRM as supabase };
