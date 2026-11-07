// Shared vehicle SELECT + response mapper (used by vehicles and favorites routes).
export const SELECT_CARD = `
  SELECT v.id, v.owner_id, v.make, v.model, v.year, v.color, v.transmission, v.fuel, v.seats,
         v.location, v.lat, v.lng, v.price_per_day, v.range_miles, v.available_weekends, v.plate,
         v.description, v.image_url, v.photos, v.active, v.created_at,
         u.name AS owner_name,
         COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.vehicle_id = v.id AND r.role = 'renter'), 0) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.vehicle_id = v.id AND r.role = 'renter') AS review_count,
         (SELECT COUNT(*) FROM bookings b WHERE b.vehicle_id = v.id AND b.status = 'completed') AS trips
  FROM vehicles v
  JOIN users u ON u.id = v.owner_id`;

/** The licence plate is only returned to the vehicle's owner. */
export const toVehicle = (r, { includePlate = false } = {}) => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  make: r.make,
  model: r.model,
  year: r.year,
  color: r.color,
  transmission: r.transmission,
  fuel: r.fuel,
  seats: r.seats,
  location: r.location,
  lat: r.lat,
  lng: r.lng,
  pricePerDay: r.price_per_day,
  rangeMiles: r.range_miles,
  availableWeekends: r.available_weekends,
  plate: includePlate ? r.plate : undefined,
  description: r.description,
  imageUrl: r.photos?.[0] ?? r.image_url ?? null,
  photos: r.photos ?? [],
  active: r.active,
  rating: r.rating,
  reviewCount: r.review_count,
  trips: r.trips,
  createdAt: r.created_at,
});
