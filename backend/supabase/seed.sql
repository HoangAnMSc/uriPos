insert into public.customers (full_name, email, phone, loyalty_points, total_spent, last_visit_at)
values
  ('Vu Lan Anh', 'lananh@gmail.com', '0911001101', 240, 9200000, timezone('utc', now()) - interval '2 day'),
  ('Nguyen Duc Minh', 'ducminh@gmail.com', '0911001102', 120, 4300000, timezone('utc', now()) - interval '3 day'),
  ('Hoang Kim Ngan', 'kimngan@gmail.com', '0911001103', 95, 2150000, timezone('utc', now()) - interval '6 day')
on conflict do nothing;

insert into public.products (sku, name, category, price, stock_quantity, is_active)
values
  ('MAC-001', 'Macaron Matcha Box', 'Bakery', 189000, 14, true),
  ('TEA-014', 'Cold Brew Peach Tea', 'Beverage', 69000, 43, true),
  ('DST-221', 'Cloud Cheesecake', 'Dessert', 159000, 8, true),
  ('BRD-010', 'Butter Croissant', 'Bakery', 49000, 28, true),
  ('BND-112', 'Signature Brunch Set', 'Combo', 249000, 12, true)
on conflict (sku) do update
set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active;

insert into public.coupons (code, discount_type, discount_value, min_order_value, usage_limit, expires_at, is_active)
values
  ('SPRING10', 'percent', 10, 300000, 200, timezone('utc', now()) + interval '30 day', true),
  ('VIP100K', 'fixed', 100000, 900000, 50, timezone('utc', now()) + interval '45 day', true)
on conflict (code) do update
set
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  min_order_value = excluded.min_order_value,
  usage_limit = excluded.usage_limit,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active;
