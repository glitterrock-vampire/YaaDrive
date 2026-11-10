import { Routes } from '@angular/router';
import { authGuard, entryGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'YaadDrive · Car sharing made simple',
    loadComponent: () => import('./pages/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'explore',
    title: 'Explore cars · YaadDrive',
    canActivate: [entryGuard],
    loadComponent: () => import('./pages/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'vehicles/:id',
    title: 'Vehicle · YaadDrive',
    loadComponent: () => import('./pages/vehicle-detail.component').then((m) => m.VehicleDetailComponent),
  },
  {
    path: 'login',
    title: 'Sign in · YaadDrive',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Create account · YaadDrive',
    loadComponent: () => import('./pages/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    title: 'Verify email · YaadDrive',
    loadComponent: () => import('./pages/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'trips',
    title: 'My trips · YaadDrive',
    canActivate: [authGuard, roleGuard('renter')],
    loadComponent: () => import('./pages/trips.component').then((m) => m.TripsComponent),
  },
  {
    path: 'profile',
    title: 'Profile · YaadDrive',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'host',
    title: 'Host dashboard · YaadDrive',
    canActivate: [authGuard, roleGuard('host')],
    loadComponent: () => import('./pages/host-dashboard.component').then((m) => m.HostDashboardComponent),
    // The list/edit sheet renders inside the dashboard's <router-outlet>, so the dashboard shows (dimmed) behind it.
    children: [
      {
        path: 'vehicles/new',
        title: 'List your car · YaadDrive',
        loadComponent: () => import('./pages/vehicle-form.component').then((m) => m.VehicleFormComponent),
      },
      {
        path: 'vehicles/:id/edit',
        title: 'Edit your car · YaadDrive',
        loadComponent: () => import('./pages/vehicle-form.component').then((m) => m.VehicleFormComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
