# Frontend Admin

Admin panel duoc xay bang React + Vite + Tailwind CSS.

## Tinh nang da co

- Giao dien admin responsive theo phong cach liquid glass.
- Sidebar an/hien theo role.
- Route guard theo module: `dashboard`, `analytics`, `pos`, `users`, `customers`, `products`, `coupons`.
- Dang nhap Supabase Auth.
- Service layer san sang cho `profiles`, `customers`, `products`, `coupons`, `orders`.
- Demo mode neu chua co `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY`.

## Chay local

1. Tao file `.env` tu `.env.example`.
2. Cai dependency:

```bash
npm install
```

3. Chay dev:

```bash
npm run dev
```

4. Build production:

```bash
npm run build
```

## Luu y

- Man `Nguoi dung` dung edge function `admin-invite-user` de moi tai khoan moi.
- Man `POS` goi RPC `create_pos_order` de xu ly don hang va ton kho trong mot luong backend.
- Khi chua noi Supabase, app se tu dong hien du lieu demo de duyet UI.
