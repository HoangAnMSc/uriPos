# Liquid Commerce Admin Starter

Workspace nay gom 2 phan:

- `frontend-admin`: ReactJS + Tailwind CSS admin panel.
- `backend`: schema Supabase, seed va edge function cho phan quyen va quan ly user.

## Bat dau nhanh

1. Setup backend theo file [backend/README.md](/D:/uriPos/backend/README.md).
2. Copy `frontend-admin/.env.example` thanh `.env` va dien thong tin Supabase.
3. Chay frontend:

```bash
cd frontend-admin
npm install
npm run dev
```

## Module hien tai

- Dashboard
- Thong ke
- POS
- Quan ly nguoi dung
- Quan ly khach hang
- San pham
- Ma giam gia

## Phan quyen

Frontend va backend dang dung chung bo module permission. Sidebar se loc theo role, dong thoi RLS trong Supabase se chan truy cap trai quyen o tang du lieu.
