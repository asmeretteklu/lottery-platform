-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'player');
CREATE TYPE lottery_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Tables
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone varchar UNIQUE NOT NULL,
    full_name varchar NOT NULL,
    role user_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE lotteries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
    title varchar NOT NULL,
    ticket_price decimal(10,2) NOT NULL,
    max_tickets integer NOT NULL,
    tickets_sold integer DEFAULT 0,
    status lottery_status DEFAULT 'draft',
    seed_hash varchar,
    draw_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lottery_id uuid REFERENCES lotteries(id) ON DELETE CASCADE,
    player_id uuid REFERENCES users(id) ON DELETE CASCADE,
    ticket_number varchar UNIQUE NOT NULL,
    qr_hash varchar UNIQUE NOT NULL,
    is_winner boolean DEFAULT false,
    purchased_at timestamptz DEFAULT now()
);

CREATE TABLE prizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lottery_id uuid REFERENCES lotteries(id) ON DELETE CASCADE,
    title varchar NOT NULL,
    description text,
    photo_url varchar,
    value_etb decimal(15,2),
    claimed boolean DEFAULT false,
    claimed_at timestamptz
);

CREATE TABLE draws (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lottery_id uuid UNIQUE REFERENCES lotteries(id) ON DELETE CASCADE,
    winner_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
    -- WARNING: secret_seed is stored in plain text. Consider encrypting at rest if threat model requires it.
    secret_seed varchar NOT NULL,
    seed_hash varchar NOT NULL,
    drawn_at timestamptz DEFAULT now(),
    verified boolean DEFAULT false
);

CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action varchar NOT NULL,
    resource varchar NOT NULL,
    resource_id uuid,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tickets_lottery_id ON tickets(lottery_id);
CREATE INDEX idx_tickets_player_id ON tickets(player_id);
CREATE INDEX idx_lotteries_admin_id ON lotteries(admin_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper Function for Policies (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- RLS Policies

-- 1. users
CREATE POLICY "super_admin_all_users" ON users
  FOR ALL USING (get_auth_user_role() = 'super_admin');

CREATE POLICY "users_read_self" ON users
  FOR SELECT USING (id = auth.uid());

-- 2. lotteries
CREATE POLICY "super_admin_all_lotteries" ON lotteries
  FOR ALL USING (get_auth_user_role() = 'super_admin');

CREATE POLICY "admin_own_lotteries" ON lotteries
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY "player_active_lotteries" ON lotteries
  FOR SELECT USING (status IN ('active', 'completed'));

-- 3. tickets
CREATE POLICY "super_admin_all_tickets" ON tickets
  FOR ALL USING (get_auth_user_role() = 'super_admin');

CREATE POLICY "admin_lottery_tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lotteries 
      WHERE lotteries.id = tickets.lottery_id 
      AND lotteries.admin_id = auth.uid()
    )
  );

CREATE POLICY "player_own_tickets" ON tickets
  FOR SELECT USING (player_id = auth.uid());

-- 4. prizes
CREATE POLICY "super_admin_all_prizes" ON prizes
  FOR ALL USING (get_auth_user_role() = 'super_admin');

CREATE POLICY "admin_lottery_prizes" ON prizes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lotteries 
      WHERE lotteries.id = prizes.lottery_id 
      AND lotteries.admin_id = auth.uid()
    )
  );

CREATE POLICY "player_active_lotteries_prizes" ON prizes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lotteries
      WHERE lotteries.id = prizes.lottery_id
      AND lotteries.status IN ('active', 'completed')
    )
  );

-- 5. draws
CREATE POLICY "super_admin_all_draws" ON draws
  FOR ALL USING (get_auth_user_role() = 'super_admin');

CREATE POLICY "admin_lottery_draws" ON draws
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lotteries 
      WHERE lotteries.id = draws.lottery_id 
      AND lotteries.admin_id = auth.uid()
    )
  );

CREATE POLICY "player_active_lotteries_draws" ON draws
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lotteries
      WHERE lotteries.id = draws.lottery_id
      AND lotteries.status IN ('active', 'completed')
    )
  );

-- 6. audit_log
CREATE POLICY "super_admin_all_audit_log" ON audit_log
  FOR ALL USING (get_auth_user_role() = 'super_admin');
