import { createClient } from "@supabase/supabase-js";
import { createStorefrontApi } from "../../../backend/supabase/storefrontApi";

const api = createStorefrontApi({
  createClient,
  env: import.meta.env,
});

export default api;
