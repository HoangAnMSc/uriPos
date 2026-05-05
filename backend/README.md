# Supabase Backend

Backend nay duoc thiet ke de di cung voi `frontend-admin`.

## Thanh phan

- `supabase/schema.sql`: tao bang, role permission, trigger profile, RLS, va ham `create_pos_order`.
- `supabase/seed.sql`: du lieu mau cho san pham, khach hang, voucher.
- `supabase/functions/admin-invite-user/index.ts`: edge function moi nguoi dung tu giao dien admin.

## Cach dung

1. Tao project Supabase moi.
2. Chay `supabase/schema.sql` trong SQL editor.
3. Chay tiep `supabase/seed.sql` neu muon co du lieu mau.
4. Deploy edge function `admin-invite-user`.
5. Them `SUPABASE_SERVICE_ROLE_KEY` cho edge function.
6. Lay `Project URL` va `anon key` de dien vao `frontend-admin/.env`.

## Luu y

- Tao user trong frontend duoc thuc hien qua edge function vi client anon key khong duoc phep goi `auth.admin`.
- POS thanh toan dung `rpc create_pos_order` de tranh tao `orders` va `order_items` roi le.
- Sidebar frontend va RLS backend dang dung chung cung ma module: `dashboard`, `analytics`, `pos`, `users`, `customers`, `products`, `coupons`.
