import { createClient } from "@supabase/supabase-js";
import { createAdminAxiosClient } from "../../../backend/supabase/adminApi";

const axiosClient = createAdminAxiosClient({
  createClient,
  env: import.meta.env,
});

export default axiosClient;
