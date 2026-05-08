# uriPos

Monorepo POS da duoc don lai theo huong:

- `react-admin/`: giao dien quan tri, giu layout va visual language cu.
- `react-frontend/`: storefront cho khach hang, giu giao dien cu.
- `backend/supabase/`: schema, seed va data layer Supabase thay cho backend REST.

## Cai dat nhanh

1. Chay file `backend/supabase/schema.sql` tren Supabase SQL Editor.
2. Tao bucket `app-media` neu chua co, hoac de schema tao san.
3. Cau hinh bien moi truong cho `react-admin` va `react-frontend`.
4. Chay hai app React nhu binh thuong.

Neu upload anh bang Cloudinary, tao unsigned upload preset trong Cloudinary va dien
`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` vao
`react-admin/.env.local`. Thu vien anh van luu metadata trong bang
`product_media`, nen neu gap loi RLS hay chay `backend/supabase/fix-media.sql`.

## Tai khoan mac dinh

- Email: `hoanganmsc@gmail.com`
- Password: `123456`

## Ghi chu

Data layer hien tai di truc tiep tu browser vao Supabase bang publishable key de giu kien truc don gian va bo hẳn backend Laravel cu. Neu can hardening production, buoc tiep theo nen dua auth/mutation nhay cam sang Edge Functions va bat RLS chi tiet hon.
