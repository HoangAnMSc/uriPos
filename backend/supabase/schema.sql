create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'manager', 'cashier', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'discount_type_enum') then
    create type public.discount_type_enum as enum ('percent', 'fixed');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status_enum') then
    create type public.order_status_enum as enum ('draft', 'paid', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method_enum') then
    create type public.payment_method_enum as enum ('cash', 'card', 'banking');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.role_permissions (
  role public.app_role not null,
  module_key text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  primary key (role, module_key)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role public.app_role not null default 'cashier',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  loyalty_points integer not null default 0,
  total_spent numeric(12, 0) not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null,
  description text,
  price numeric(12, 0) not null default 0,
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.discount_type_enum not null,
  discount_value numeric(12, 0) not null,
  min_order_value numeric(12, 0) not null default 0,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  coupon_id uuid references public.coupons (id) on delete set null,
  cashier_id uuid references public.profiles (id) on delete set null,
  subtotal numeric(12, 0) not null default 0,
  discount_total numeric(12, 0) not null default 0,
  grand_total numeric(12, 0) not null default 0,
  payment_method public.payment_method_enum not null default 'cash',
  status public.order_status_enum not null default 'paid',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 0) not null,
  line_total numeric(12, 0) generated always as (quantity * unit_price) stored
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_customers_last_visit on public.customers (last_visit_at desc);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_customer_id on public.orders (customer_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
before update on public.coupons
for each row
execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.has_permission(p_module_key text, p_action text default 'view')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_allowed boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  select current_user_role() into v_role;

  if v_role is null then
    return false;
  end if;

  select case p_action
    when 'view' then can_view
    when 'create' then can_create
    when 'update' then can_update
    when 'delete' then can_delete
    else false
  end
  into v_allowed
  from public.role_permissions
  where role = v_role
    and module_key = p_module_key;

  return coalesce(v_allowed, false);
end;
$$;

create or replace function public.create_pos_order(
  p_customer_id uuid,
  p_coupon_id uuid,
  p_cashier_id uuid,
  p_payment_method public.payment_method_enum,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_item jsonb;
  v_product record;
  v_coupon public.coupons%rowtype;
  v_subtotal numeric(12, 0) := 0;
  v_discount_total numeric(12, 0) := 0;
  v_grand_total numeric(12, 0) := 0;
  v_cashier_id uuid := coalesce(auth.uid(), p_cashier_id);
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('pos', 'create') then
    raise exception 'Role has no permission to create POS order';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required';
  end if;

  if p_coupon_id is not null then
    select *
    into v_coupon
    from public.coupons
    where id = p_coupon_id
      and is_active = true
      and starts_at <= timezone('utc', now())
      and (expires_at is null or expires_at >= timezone('utc', now()));

    if not found then
      raise exception 'Coupon is not available';
    end if;

    if v_coupon.usage_limit > 0 and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'Coupon usage limit reached';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select *
    into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and is_active = true
    for update;

    if not found then
      raise exception 'Product not found or inactive';
    end if;

    if v_product.stock_quantity < (v_item ->> 'quantity')::integer then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * (v_item ->> 'quantity')::integer);
  end loop;

  if p_coupon_id is not null and v_subtotal >= v_coupon.min_order_value then
    if v_coupon.discount_type = 'percent' then
      v_discount_total := round(v_subtotal * (v_coupon.discount_value / 100.0), 0);
    else
      v_discount_total := v_coupon.discount_value;
    end if;
  end if;

  v_grand_total := greatest(v_subtotal - v_discount_total, 0);
  v_order_code := 'POS-' || to_char(timezone('utc', now()), 'MMDDHH24MISS') || '-' || upper(substr(gen_random_uuid()::text, 1, 4));

  insert into public.orders (
    order_code,
    customer_id,
    coupon_id,
    cashier_id,
    subtotal,
    discount_total,
    grand_total,
    payment_method,
    status
  )
  values (
    v_order_code,
    p_customer_id,
    p_coupon_id,
    v_cashier_id,
    v_subtotal,
    v_discount_total,
    v_grand_total,
    p_payment_method,
    'paid'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select *
    into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (
      v_order_id,
      v_product.id,
      (v_item ->> 'quantity')::integer,
      v_product.price
    );

    update public.products
    set stock_quantity = stock_quantity - (v_item ->> 'quantity')::integer
    where id = v_product.id;
  end loop;

  if p_customer_id is not null then
    update public.customers
    set
      total_spent = total_spent + v_grand_total,
      loyalty_points = loyalty_points + floor(v_grand_total / 10000),
      last_visit_at = timezone('utc', now())
    where id = p_customer_id;
  end if;

  if p_coupon_id is not null then
    update public.coupons
    set used_count = used_count + 1
    where id = p_coupon_id;
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'grand_total', v_grand_total
  );
end;
$$;

insert into public.role_permissions (role, module_key, can_view, can_create, can_update, can_delete)
values
  ('admin', 'dashboard', true, false, false, false),
  ('admin', 'analytics', true, false, false, false),
  ('admin', 'pos', true, true, true, false),
  ('admin', 'users', true, true, true, true),
  ('admin', 'customers', true, true, true, true),
  ('admin', 'products', true, true, true, true),
  ('admin', 'coupons', true, true, true, true),
  ('manager', 'dashboard', true, false, false, false),
  ('manager', 'analytics', true, false, false, false),
  ('manager', 'pos', true, true, true, false),
  ('manager', 'users', true, false, true, false),
  ('manager', 'customers', true, true, true, false),
  ('manager', 'products', true, true, true, false),
  ('manager', 'coupons', true, true, true, false),
  ('cashier', 'dashboard', true, false, false, false),
  ('cashier', 'analytics', true, false, false, false),
  ('cashier', 'pos', true, true, false, false),
  ('cashier', 'customers', true, true, true, false),
  ('cashier', 'products', true, false, false, false),
  ('cashier', 'coupons', true, false, false, false),
  ('staff', 'dashboard', true, false, false, false),
  ('staff', 'customers', true, false, false, false),
  ('staff', 'products', true, false, false, false)
on conflict (role, module_key) do update
set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_update = excluded.can_update,
  can_delete = excluded.can_delete;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Profiles read self or users viewers" on public.profiles;
create policy "Profiles read self or users viewers"
on public.profiles
for select
using (auth.uid() = id or public.has_permission('users', 'view'));

drop policy if exists "Profiles update self or users editors" on public.profiles;
create policy "Profiles update self or users editors"
on public.profiles
for update
using (auth.uid() = id or public.has_permission('users', 'update'))
with check (auth.uid() = id or public.has_permission('users', 'update'));

drop policy if exists "Customers are viewable by permission" on public.customers;
create policy "Customers are viewable by permission"
on public.customers
for select
using (public.has_permission('customers', 'view'));

drop policy if exists "Customers can be inserted by permission" on public.customers;
create policy "Customers can be inserted by permission"
on public.customers
for insert
with check (public.has_permission('customers', 'create'));

drop policy if exists "Customers can be updated by permission" on public.customers;
create policy "Customers can be updated by permission"
on public.customers
for update
using (public.has_permission('customers', 'update'))
with check (public.has_permission('customers', 'update'));

drop policy if exists "Customers can be deleted by permission" on public.customers;
create policy "Customers can be deleted by permission"
on public.customers
for delete
using (public.has_permission('customers', 'delete'));

drop policy if exists "Products are viewable by permission" on public.products;
create policy "Products are viewable by permission"
on public.products
for select
using (public.has_permission('products', 'view'));

drop policy if exists "Products can be inserted by permission" on public.products;
create policy "Products can be inserted by permission"
on public.products
for insert
with check (public.has_permission('products', 'create'));

drop policy if exists "Products can be updated by permission" on public.products;
create policy "Products can be updated by permission"
on public.products
for update
using (public.has_permission('products', 'update'))
with check (public.has_permission('products', 'update'));

drop policy if exists "Products can be deleted by permission" on public.products;
create policy "Products can be deleted by permission"
on public.products
for delete
using (public.has_permission('products', 'delete'));

drop policy if exists "Coupons are viewable by permission" on public.coupons;
create policy "Coupons are viewable by permission"
on public.coupons
for select
using (public.has_permission('coupons', 'view'));

drop policy if exists "Coupons can be inserted by permission" on public.coupons;
create policy "Coupons can be inserted by permission"
on public.coupons
for insert
with check (public.has_permission('coupons', 'create'));

drop policy if exists "Coupons can be updated by permission" on public.coupons;
create policy "Coupons can be updated by permission"
on public.coupons
for update
using (public.has_permission('coupons', 'update'))
with check (public.has_permission('coupons', 'update'));

drop policy if exists "Coupons can be deleted by permission" on public.coupons;
create policy "Coupons can be deleted by permission"
on public.coupons
for delete
using (public.has_permission('coupons', 'delete'));

drop policy if exists "Orders are viewable by POS or analytics" on public.orders;
create policy "Orders are viewable by POS or analytics"
on public.orders
for select
using (
  public.has_permission('pos', 'view')
  or public.has_permission('analytics', 'view')
  or cashier_id = auth.uid()
);

drop policy if exists "Order items are viewable by POS or analytics" on public.order_items;
create policy "Order items are viewable by POS or analytics"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and (
        public.has_permission('pos', 'view')
        or public.has_permission('analytics', 'view')
        or orders.cashier_id = auth.uid()
      )
  )
);

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.has_permission(text, text) to authenticated;
grant execute on function public.create_pos_order(uuid, uuid, uuid, public.payment_method_enum, jsonb) to authenticated;
