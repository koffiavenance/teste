-- PostgreSQL 15+. Multi-tenant : toutes les tables métier portent shop_id (+ RLS).
create extension if not exists "pgcrypto";

create type shop_status      as enum ('inactive', 'active', 'suspended');
create type product_status   as enum ('draft', 'active', 'archived');
create type order_status     as enum ('new','confirmed','to_ship','shipping','delivered',
                                      'unreachable','scheduled','returned','delivery_failed','cancelled');
create type member_role      as enum ('owner','admin','confirmer','logistician');

create table shops (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  subdomain     text not null unique check (subdomain ~ '^[a-z0-9-]{3,40}$'),
  country       char(2) not null default 'CI',
  currency      char(3) not null default 'XOF',
  whatsapp      text,                         -- E.164
  status        shop_status not null default 'inactive',
  active_until  timestamptz,                  -- fin d'abonnement
  theme         jsonb not null default '{"primary":"#7C3AED"}',
  created_at    timestamptz not null default now()
);

create table shop_members (
  shop_id uuid references shops on delete cascade,
  user_id uuid not null,                      -- auth.users
  role    member_role not null default 'admin',
  primary key (shop_id, user_id)
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  name text not null, slug text not null,
  unique (shop_id, slug)
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops on delete cascade,
  status        product_status not null default 'draft',
  slug          text not null,
  title         text not null,
  hook          text,                         -- accroche marketing
  description   text,
  price         integer not null check (price >= 0),          -- unité mineure = XOF entier
  compare_at    integer check (compare_at is null or compare_at > price),
  stock         integer,                      -- null = illimité
  low_stock_at  integer default 5,
  images        text[] not null default '{}',
  badges        text[] not null default '{}',
  collection_id uuid references collections on delete set null,
  bundles       jsonb not null default '[{"qty":1,"discount_pct":0},{"qty":2,"discount_pct":10,"badge":"popular"},{"qty":3,"discount_pct":15,"badge":"best"}]',
  page_config   jsonb not null default '{}',  -- toggles des blocs + contenus (FAQ, avis, étapes…)
  created_by_ai boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (shop_id, slug)
);
create index on products (shop_id, status);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops on delete cascade,
  number        bigint generated always as identity,
  status        order_status not null default 'new',
  product_id    uuid not null references products,
  qty           integer not null check (qty between 1 and 20),
  subtotal      integer not null,
  shipping_fee  integer not null default 0,
  total         integer not null,
  customer_name text not null,
  phone         text not null,                -- E.164
  city          text not null,
  address_hint  text,
  scheduled_for date,
  utm           jsonb,
  assigned_to   uuid,
  created_at    timestamptz not null default now()
);
create index on orders (shop_id, status, created_at desc);
create index on orders (shop_id, phone, product_id, created_at desc);   -- anti-doublons

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders on delete cascade,
  from_status order_status, to_status order_status not null,
  actor uuid, note text,
  created_at timestamptz not null default now()
);

create table abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  product_id uuid references products,
  phone text not null, customer_name text, city text, qty int default 1,
  recovered_order_id uuid references orders,
  created_at timestamptz not null default now(),
  unique (shop_id, phone, product_id)
);

create table analytics_events (
  id bigint generated always as identity primary key,
  shop_id uuid not null, product_id uuid, session_id text not null,
  name text not null, props jsonb, created_at timestamptz not null default now()
);
create index on analytics_events (shop_id, name, created_at desc);

create table ai_product_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops on delete cascade,
  image_url text not null,
  state text not null default 'queued' check (state in ('queued','running','done','failed')),
  result jsonb, product_id uuid references products, error text,
  created_at timestamptz not null default now()
);

-- Row Level Security (exemple Supabase : l'utilisateur ne voit que ses boutiques)
alter table products enable row level security;
create policy products_member on products
  using (shop_id in (select shop_id from shop_members where user_id = auth.uid()));
-- Lecture publique des produits actifs pour la page de vente :
create policy products_public on products for select using (status = 'active');
-- (répéter RLS pour orders, abandoned_carts, collections, … )
