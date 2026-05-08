# Backend

Backend Laravel cu da duoc loai bo.

Thu muc nay chi con phan ha tang Supabase:

- `supabase/schema.sql`: tao bang, seed quyen, seed admin va bucket upload.
- `supabase/fix-login.sql`: seed/fix nhanh tai khoan admin va quyen login.
- `supabase/fix-media.sql`: fix nhanh loi RLS khi thao tac thu vien anh.

Sau khi chay schema, hai app React se noi truc tiep vao Supabase thong qua layer trong `backend/supabase/`.

Neu muon upload anh len Cloudinary, dien `VITE_CLOUDINARY_CLOUD_NAME` va
`VITE_CLOUDINARY_UPLOAD_PRESET` trong `react-admin/.env.local`. Upload preset can
la unsigned preset.
