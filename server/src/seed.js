// Demo data. Run with `npm run seed` (resets users, vehicles, bookings, reviews and saved cars).
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { migrate } from './migrate.js';

const PASSWORD = 'Password123!';

const users = [
  { name: 'Marcus Brown', email: 'marcus@example.com', phone: '876-555-0101', accountType: 'host' },
  { name: 'Keisha Campbell', email: 'keisha@example.com', phone: '876-555-0102', accountType: 'host' },
  { name: 'Devon Reid', email: 'devon@example.com', phone: '876-555-0103', accountType: 'renter' },
];

// Town centres, so every seeded car shows up as a pin on the map.
const TOWNS = {
  Kingston: [18.0179, -76.8099],
  'Spanish Town': [17.9911, -76.9574],
  'Montego Bay': [18.4762, -77.8939],
  'Ocho Rios': [18.4074, -77.103],
  Mandeville: [18.0417, -77.5073],
  Negril: [18.2683, -78.3472],
};

// [owner, make, model, year, plate, color, gearbox, fuel, seats, range mi, location, price/day, weekends, description, photo]
const vehicles = [
  [0, 'Toyota', 'Corolla', 2021, '1234 AB', 'White', 'automatic', 'petrol', 5, null, 'Kingston', 55, true, 'Reliable and economical, ideal for city driving. Air conditioning, Bluetooth audio.', '/assets/demo-cars/toyota-corolla.jpg'],
  [0, 'Honda', 'CR-V', 2020, '5821 CD', 'Grey', 'automatic', 'petrol', 5, null, 'Kingston', 85, true, 'Roomy SUV with a large boot. Great for family trips.', '/assets/demo-cars/honda-cr-v.jpg'],
  [0, 'Suzuki', 'Swift', 2019, '7710 EF', 'Red', 'manual', 'petrol', 5, null, 'Spanish Town', 40, false, 'Small, fun and very fuel efficient. Weekdays only.', '/assets/demo-cars/suzuki-swift.jpg'],
  [1, 'Toyota', 'Hiace', 2018, '3302 GH', 'Silver', 'manual', 'diesel', 12, null, 'Montego Bay', 120, true, 'Twelve-seat minibus for groups and airport transfers.', '/assets/demo-cars/toyota-hiace.jpg'],
  [1, 'Nissan', 'Leaf', 2022, '9045 JK', 'Blue', 'automatic', 'electric', 5, 150, 'Montego Bay', 65, true, 'Quiet electric hatchback, charger included.', '/assets/demo-cars/nissan-leaf.jpg'],
  [1, 'Subaru', 'Forester', 2019, '4418 LM', 'Green', 'automatic', 'petrol', 5, null, 'Ocho Rios', 90, true, 'All-wheel drive, comfortable on country roads.', '/assets/demo-cars/subaru-forester.jpg'],
  [1, 'Toyota', 'Prius', 2017, '2276 NP', 'Black', 'automatic', 'hybrid', 5, null, 'Mandeville', 60, true, 'Excellent mileage for long drives.', '/assets/demo-cars/toyota-prius.jpg'],
  [1, 'Mazda', 'CX-5', 2022, '6639 QR', 'Blue', 'automatic', 'petrol', 5, null, 'Negril', 95, true, 'Stylish crossover, perfect for beach weekends.', '/assets/demo-cars/mazda-cx-5.jpg'],
];

function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Small deterministic offset so cars in the same town don't sit exactly on top of each other.
const jitter = (i, axis) => ((((i * 7 + axis * 3) % 11) - 5) / 5) * 0.012;

async function seed() {
  await migrate();
  await pool.query('TRUNCATE favorites, reviews, payments, bookings, vehicles, users RESTART IDENTITY CASCADE');

  const hash = await bcrypt.hash(PASSWORD, 10);
  const userIds = [];
  for (const u of users) {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, account_type) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [u.name, u.email, hash, u.phone, u.accountType],
    );
    userIds.push(rows[0].id);
  }

  const vehicleIds = [];
  for (const [i, [o, make, model, year, plate, color, transmission, fuel, seats, range, location, price, weekends, description, photo]] of vehicles.entries()) {
    const [lat, lng] = TOWNS[location];
    const { rows } = await pool.query(
      `INSERT INTO vehicles (owner_id, make, model, year, plate, color, transmission, fuel, seats, range_miles,
                             location, lat, lng, price_per_day, available_weekends, description, image_url, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [userIds[o], make, model, year, plate, color, transmission, fuel, seats, range, location, lat + jitter(i, 0), lng + jitter(i, 1), price, weekends, description, photo, [photo]],
    );
    vehicleIds.push(rows[0].id);
  }

  // A finished, paid trip (Devon rented Marcus's Corolla) with reviews both ways.
  const completed = await pool.query(
    `INSERT INTO bookings (vehicle_id, renter_id, start_date, end_date, total_price, status, payment_status)
     VALUES ($1,$2,$3,$4,$5,'completed','paid') RETURNING id`,
    [vehicleIds[0], userIds[2], isoDate(-20), isoDate(-17), 165],
  );
  await pool.query(`INSERT INTO payments (booking_id, amount, card_brand, card_last4) VALUES ($1,165,'Visa','4242')`, [completed.rows[0].id]);
  await pool.query(
    `INSERT INTO reviews (booking_id, vehicle_id, reviewer_id, reviewee_id, role, rating, comment) VALUES
     ($1,$2,$3,$4,'renter',5,'Spotless car and Marcus was easy to deal with. Would rent again.'),
     ($1,$2,$4,$3,'owner',5,'Returned on time and in great shape.')`,
    [completed.rows[0].id, vehicleIds[0], userIds[2], userIds[0]],
  );

  // Give Keisha and Devon a completed trip together as well, so every demo account has history.
  const keishaCompleted = await pool.query(
    `INSERT INTO bookings (vehicle_id, renter_id, start_date, end_date, total_price, status, payment_status)
     VALUES ($1,$2,$3,$4,$5,'completed','paid') RETURNING id`,
    [vehicleIds[4], userIds[2], isoDate(-45), isoDate(-42), 195],
  );
  await pool.query(
    `INSERT INTO payments (booking_id, amount, card_brand, card_last4) VALUES ($1,195,'Visa','4242')`,
    [keishaCompleted.rows[0].id],
  );
  await pool.query(
    `INSERT INTO reviews (booking_id, vehicle_id, reviewer_id, reviewee_id, role, rating, comment) VALUES
     ($1,$2,$3,$4,'renter',5,'The car was clean and easy to pick up.'),
     ($1,$2,$4,$3,'owner',5,'Great communication and returned on time.')`,
    [keishaCompleted.rows[0].id, vehicleIds[4], userIds[2], userIds[1]],
  );

  // A pending request and an upcoming confirmed+paid trip so the dashboard has something to show.
  await pool.query(
    `INSERT INTO bookings (vehicle_id, renter_id, start_date, end_date, total_price) VALUES ($1,$2,$3,$4,$5)`,
    [vehicleIds[1], userIds[2], isoDate(5), isoDate(8), 255],
  );
  const upcoming = await pool.query(
    `INSERT INTO bookings (vehicle_id, renter_id, start_date, end_date, total_price, status, payment_status)
     VALUES ($1,$2,$3,$4,$5,'confirmed','paid') RETURNING id`,
    [vehicleIds[0], userIds[2], isoDate(10), isoDate(12), 110],
  );
  await pool.query(`INSERT INTO payments (booking_id, amount, card_brand, card_last4) VALUES ($1,110,'Mastercard','4444')`, [upcoming.rows[0].id]);

  // Devon has saved two cars.
  await pool.query('INSERT INTO favorites (user_id, vehicle_id) VALUES ($1,$2), ($1,$3)', [userIds[2], vehicleIds[4], vehicleIds[5]]);

  console.log(`Seeded ${users.length} users and ${vehicles.length} vehicles.`);
  console.log(`Demo logins: ${users.map((u) => u.email).join(', ')}  (password: ${PASSWORD})`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
