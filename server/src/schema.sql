CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  phone         TEXT,
  parish        TEXT,
  account_type  TEXT        NOT NULL DEFAULT 'renter' CHECK (account_type IN ('renter', 'host')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS parish TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'renter' CHECK (account_type IN ('renter', 'host'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  user_id    INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id            SERIAL PRIMARY KEY,
  owner_id      INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make          TEXT          NOT NULL,
  model         TEXT          NOT NULL,
  year          INT           NOT NULL CHECK (year BETWEEN 1980 AND 2100),
  color         TEXT,
  transmission  TEXT          NOT NULL DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual')),
  fuel          TEXT          NOT NULL DEFAULT 'petrol' CHECK (fuel IN ('petrol', 'diesel', 'hybrid', 'electric')),
  seats         INT           NOT NULL DEFAULT 5 CHECK (seats BETWEEN 1 AND 15),
  location      TEXT          NOT NULL,
  price_per_day NUMERIC(10,2) NOT NULL CHECK (price_per_day > 0),
  description   TEXT,
  image_url     TEXT,
  active        BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_owner_idx ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS vehicles_location_idx ON vehicles(lower(location));

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'v3_account_types') THEN
    UPDATE users AS u SET account_type = 'host'
    WHERE u.account_type = 'renter' AND EXISTS (SELECT 1 FROM vehicles v WHERE v.owner_id = u.id);
    INSERT INTO schema_migrations (version) VALUES ('v3_account_types');
  END IF;
END
$migration$;

-- A booking holds the dates [start_date, end_date): the car is returned on end_date,
-- so another trip may start that same day.
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  vehicle_id     INT           NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  renter_id      INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date     DATE          NOT NULL,
  end_date       DATE          NOT NULL,
  total_price    NUMERIC(10,2) NOT NULL,
  status         TEXT          NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  payment_status TEXT          NOT NULL DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (end_date > start_date),
  -- The database itself guarantees a car can never be double-booked.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    vehicle_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed', 'completed'))
);
CREATE INDEX IF NOT EXISTS bookings_renter_idx ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS bookings_vehicle_idx ON bookings(vehicle_id);

-- Mock payments. Only the last four digits of a card are ever stored.
CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL PRIMARY KEY,
  booking_id INT           NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL,
  card_brand TEXT,
  card_last4 CHAR(4),
  status     TEXT          NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'refunded')),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Two-way reviews. `role` is the role of the reviewer on that trip.
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INT         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id  INT         NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  reviewer_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('renter', 'owner')),
  rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS reviews_vehicle_idx ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON reviews(reviewee_id);

-- v2: map pins, photo gallery, plate, range, weekend availability, saved cars
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS range_miles INT CHECK (range_miles IS NULL OR range_miles > 0);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN -90 AND 90);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN -180 AND 180);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_weekends BOOLEAN NOT NULL DEFAULT true;
UPDATE vehicles SET photos = ARRAY[image_url] WHERE image_url IS NOT NULL AND cardinality(photos) = 0;

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INT         NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vehicle_id)
);
