import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './util';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  parish: string | null;
  accountType: 'renter' | 'host';
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegistrationResponse {
  email: string;
  emailSent: boolean;
  message: string;
}

export type Transmission = 'automatic' | 'manual';
export type Fuel = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export interface Vehicle {
  id: number;
  ownerId: number;
  ownerName: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  transmission: Transmission;
  fuel: Fuel;
  seats: number;
  location: string;
  lat: number | null;
  lng: number | null;
  pricePerDay: number;
  rangeMiles: number | null;
  availableWeekends: boolean;
  /** Only present for the owner's own vehicles. */
  plate?: string | null;
  description: string | null;
  imageUrl: string | null;
  photos: string[];
  active: boolean;
  rating: number;
  reviewCount: number;
  trips: number;
  createdAt: string;
}

export interface VehicleInput {
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  transmission: Transmission;
  fuel: Fuel;
  seats: number;
  rangeMiles: number | null;
  location: string;
  lat: number | null;
  lng: number | null;
  pricePerDay: number;
  description: string;
  photos: string[];
  availableWeekends: boolean;
  active: boolean;
}

export interface VehicleDetail {
  vehicle: Vehicle;
  owner: { id: number; name: string; memberSince: string; rating: number; vehicleCount: number };
  reviews: { id: number; rating: number; comment: string | null; createdAt: string; reviewerName: string }[];
  unavailable: { start: string; end: string }[];
}

export interface SearchFilters {
  q?: string;
  location?: string;
  start?: string;
  end?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  transmission?: string;
  fuel?: string;
  seats?: number | null;
  lat?: number | null;
  lng?: number | null;
  radiusMiles?: number | null;
  sort?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Booking {
  id: number;
  vehicleId: number;
  vehicle: { make: string; model: string; year: number; location: string; imageUrl: string | null; pricePerDay: number };
  ownerId: number;
  ownerName: string;
  renterId: number;
  renterName: string;
  renterEmail: string | null;
  renterPhone: string | null;
  renterRating: number;
  startDate: string;
  endDate: string;
  days: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  cardBrand: string | null;
  cardLast4: string | null;
  reviewedByMe: boolean;
  createdAt: string;
}

export interface PaymentInput {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface Dashboard {
  listedVehicles: number;
  pendingRequests: number;
  upcomingTrips: number;
  earned: number;
  upcomingEarnings: number;
  rating: number;
  reviewCount: number;
  monthly: { month: string; amount: number }[];
  thisMonth: number;
  lastMonth: number;
  /** null when last month had no earnings to compare against */
  changePct: number | null;
  vehicles: {
    id: number;
    make: string;
    model: string;
    year: number;
    active: boolean;
    status: 'listed' | 'booked' | 'unlisted';
    pricePerDay: number;
    imageUrl: string | null;
    trips: number;
    earnings: number;
    rating: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = `${API_URL}/api`;

  // --- auth
  register(body: { accountType: User['accountType']; name: string; email: string; password: string; phone: string; parish: string }): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${this.base}/auth/register`, body);
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/verify-email`, { token });
  }

  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/verify-email/resend`, { email });
  }
  login(body: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, body);
  }
  me(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.base}/auth/me`);
  }
  updateProfile(body: Pick<User, 'name' | 'email' | 'phone' | 'parish'>): Observable<{ user: User }> {
    return this.http.patch<{ user: User }>(`${this.base}/auth/me`, body);
  }
  updateAccountType(accountType: User['accountType']): Observable<{ user: User }> {
    return this.http.patch<{ user: User }>(`${this.base}/auth/account-type`, { accountType });
  }

  // --- vehicles
  searchVehicles(filters: SearchFilters): Observable<{ vehicles: Vehicle[] }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<{ vehicles: Vehicle[] }>(`${this.base}/vehicles`, { params });
  }
  getVehicle(id: number): Observable<VehicleDetail> {
    return this.http.get<VehicleDetail>(`${this.base}/vehicles/${id}`);
  }
  myVehicles(): Observable<{ vehicles: Vehicle[] }> {
    return this.http.get<{ vehicles: Vehicle[] }>(`${this.base}/vehicles/mine`);
  }
  createVehicle(body: VehicleInput): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/vehicles`, body);
  }
  updateVehicle(id: number, body: VehicleInput): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/vehicles/${id}`, body);
  }
  setVehicleActive(id: number, active: boolean): Observable<{ ok: boolean; active: boolean }> {
    return this.http.patch<{ ok: boolean; active: boolean }>(`${this.base}/vehicles/${id}/status`, { active });
  }
  unlistVehicle(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/vehicles/${id}`);
  }
  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<{ url: string }>(`${this.base}/uploads`, form);
  }

  // --- bookings
  requestBooking(body: { vehicleId: number; startDate: string; endDate: string }): Observable<{ id: number; totalPrice: number; days: number }> {
    return this.http.post<{ id: number; totalPrice: number; days: number }>(`${this.base}/bookings`, body);
  }
  myTrips(): Observable<{ bookings: Booking[] }> {
    return this.http.get<{ bookings: Booking[] }>(`${this.base}/bookings/mine`);
  }
  incomingRequests(): Observable<{ bookings: Booking[] }> {
    return this.http.get<{ bookings: Booking[] }>(`${this.base}/bookings/incoming`);
  }
  respond(id: number, action: 'accept' | 'decline'): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/bookings/${id}/respond`, { action });
  }
  pay(id: number, body: PaymentInput): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/bookings/${id}/pay`, body);
  }
  cancel(id: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/bookings/${id}/cancel`, {});
  }
  complete(id: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/bookings/${id}/complete`, {});
  }

  // --- saved cars
  favoriteIds(): Observable<{ ids: number[] }> {
    return this.http.get<{ ids: number[] }>(`${this.base}/favorites/ids`);
  }
  favorites(): Observable<{ vehicles: Vehicle[] }> {
    return this.http.get<{ vehicles: Vehicle[] }>(`${this.base}/favorites`);
  }
  addFavorite(vehicleId: number): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/favorites/${vehicleId}`, {});
  }
  removeFavorite(vehicleId: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/favorites/${vehicleId}`);
  }

  // --- reviews & dashboard
  review(body: { bookingId: number; rating: number; comment: string }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/reviews`, body);
  }
  ownerDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard/owner`);
  }
}
