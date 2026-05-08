-- Run this in the Supabase SQL Editor for the same project used by react-admin/.env.local.
-- It fixes admin login access without touching product/order/customer data.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.permissions disable row level security;
alter table public.roles disable row level security;
alter table public.role_permissions disable row level security;
alter table public.admin_users disable row level security;
alter table public.user_roles disable row level security;
alter table public.product_media disable row level security;

insert into public.permissions (name)
select unnest(array[
  'dashboard.view',
  'pos.access',
  'order.view',
  'order.create',
  'order.update',
  'order.delete',
  'product.view',
  'product.create',
  'product.update',
  'product.delete',
  'customer.view',
  'customer.create',
  'customer.update',
  'customer.delete',
  'discount.view',
  'discount.create',
  'discount.update',
  'discount.delete',
  'chat.view',
  'chat.reply',
  'chat.delete',
  'notification.view',
  'notification.create',
  'notification.update',
  'notification.delete',
  'content.view',
  'content.create',
  'content.update',
  'content.delete',
  'payment.view',
  'payment.update',
  'user.view',
  'user.create',
  'user.update',
  'user.delete',
  'role.view',
  'role.create',
  'role.update',
  'role.delete'
]::text[])
on conflict (name) do nothing;

insert into public.roles (name)
values ('Owner'), ('Manager'), ('Staff')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on true
where r.name = 'Owner'
on conflict (role_id, permission_id) do nothing;

insert into public.admin_users (
  name,
  email,
  password_hash,
  is_online,
  offline_since
)
values (
  'Administrator',
  'hoanganmsc@gmail.com',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  false,
  now()
)
on conflict (email) do update
set
  name = excluded.name,
  password_hash = excluded.password_hash,
  updated_at = now();

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.admin_users u
join public.roles r on r.name = 'Owner'
where u.email = 'hoanganmsc@gmail.com'
on conflict (user_id, role_id) do nothing;

select
  u.email,
  u.name,
  r.name as role_name,
  count(p.id) as permission_count
from public.admin_users u
left join public.user_roles ur on ur.user_id = u.id
left join public.roles r on r.id = ur.role_id
left join public.role_permissions rp on rp.role_id = r.id
left join public.permissions p on p.id = rp.permission_id
where u.email = 'hoanganmsc@gmail.com'
group by u.email, u.name, r.name;
