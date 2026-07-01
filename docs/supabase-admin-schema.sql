create table if not exists categories (
  id text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  category_id text not null references categories(id),
  name text not null,
  description text not null default '',
  shape text not null default 'box',
  color text not null default '#7a3f2a',
  accent text not null default '#fff1d7',
  photo_alt text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_sizes (
  id text primary key,
  product_id text not null references products(id),
  label text not null,
  pieces text,
  diameter_cm numeric not null default 0,
  height_cm numeric not null default 0,
  price numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_photos (
  id text primary key,
  product_id text not null references products(id),
  src text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on products(category_id);
create index if not exists product_sizes_product_id_idx on product_sizes(product_id);
create index if not exists product_photos_product_id_idx on product_photos(product_id);
