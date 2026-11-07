import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { ApiService, Vehicle } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Theme, ThemeService } from '../core/theme.service';
import { errorMessage, initials } from '../core/util';
import { VehicleCardComponent } from '../shared/vehicle-card.component';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, FormsModule, VehicleCardComponent],
  template: `
    <div class="pad">
      <header class="page-title"><h1>Profile</h1></header>

      @if (auth.user(); as u) {
        <section class="card profile-card">
          <span class="avatar lg" aria-hidden="true">{{ initialsOf(u.name) }}</span>
          <div>
            <h2>{{ u.name }}</h2>
            <p class="muted">{{ u.email }}</p>
            @if (u.phone) {
              <p class="muted">{{ u.phone }}</p>
            }
            @if (u.parish) {
              <p class="muted">{{ u.parish }}, Jamaica</p>
            }
            <p class="badge">{{ u.accountType === 'host' ? 'Host mode' : 'Renter mode' }}</p>
            <p class="muted small">Member since {{ u.createdAt | date: 'MMM y' }}</p>
          </div>
        </section>

        <section class="card profile-settings stack">
          <div>
            <h2>Edit your profile</h2>
            <p class="muted small">Update your contact details and Jamaican parish.</p>
          </div>
          <form class="stack" (ngSubmit)="saveProfile()">
            <div class="row">
              <label class="field">
                <span>First name</span>
                <input name="firstName" [(ngModel)]="form.firstName" required minlength="1" maxlength="39" autocomplete="given-name" />
              </label>
              <label class="field">
                <span>Last name</span>
                <input name="lastName" [(ngModel)]="form.lastName" required minlength="1" maxlength="39" autocomplete="family-name" />
              </label>
            </div>
            <label class="field">
              <span>Email</span>
              <input type="email" name="email" [(ngModel)]="form.email" required maxlength="200" autocomplete="email" />
            </label>
            <label class="field">
              <span>Mobile number</span>
              <input type="tel" name="phone" [(ngModel)]="form.phone" required minlength="7" maxlength="30"
                pattern="[+0-9(). -]{7,30}" autocomplete="tel" />
            </label>
            <label class="field">
              <span>Parish in Jamaica <span class="muted">(optional)</span></span>
              <select name="parish" [(ngModel)]="form.parish" autocomplete="address-level1">
                <option value="">Select a parish</option>
                @for (parish of parishes; track parish) {
                  <option [value]="parish">{{ parish }}</option>
                }
              </select>
            </label>
            @if (profileError()) {
              <p class="alert alert-error" role="alert">{{ profileError() }}</p>
            }
            @if (profileMessage()) {
              <p class="alert alert-success" role="status">{{ profileMessage() }}</p>
            }
            <button type="submit" class="btn btn-primary btn-block" [disabled]="savingProfile()">
              {{ savingProfile() ? 'Saving…' : 'Save changes' }}
            </button>
          </form>
        </section>

        <section class="card profile-settings stack">
          <div>
            <h2>Switch your mode</h2>
            <p class="muted small">Your listings, bookings, and profile stay on this account. You can switch back anytime.</p>
          </div>
          <div class="row mode-switch" role="group" aria-label="Choose account mode">
            <button type="button" class="btn" [class.btn-primary]="u.accountType === 'renter'" [class.btn-gray]="u.accountType !== 'renter'"
              [attr.aria-pressed]="u.accountType === 'renter'" [disabled]="switchingMode() || u.accountType === 'renter'" (click)="switchMode('renter')">
              Renter
            </button>
            <button type="button" class="btn" [class.btn-primary]="u.accountType === 'host'" [class.btn-gray]="u.accountType !== 'host'"
              [attr.aria-pressed]="u.accountType === 'host'" [disabled]="switchingMode() || u.accountType === 'host'" (click)="switchMode('host')">
              Host
            </button>
          </div>
          @if (modeError()) {
            <p class="alert alert-error" role="alert">{{ modeError() }}</p>
          }
          @if (switchingMode()) {
            <p class="muted small" role="status">Switching mode…</p>
          }
        </section>

        <section class="card profile-settings stack">
          <div>
            <h2>Appearance</h2>
            <p class="muted small">Choose the look that works best for you.</p>
          </div>
          <div class="row mode-switch" role="group" aria-label="Choose appearance">
            <button type="button" class="btn" [class.btn-primary]="theme.theme() === 'light'"
              [class.btn-gray]="theme.theme() !== 'light'" [attr.aria-pressed]="theme.theme() === 'light'"
              (click)="setTheme('light')">Light</button>
            <button type="button" class="btn" [class.btn-primary]="theme.theme() === 'dark'"
              [class.btn-gray]="theme.theme() !== 'dark'" [attr.aria-pressed]="theme.theme() === 'dark'"
              (click)="setTheme('dark')">Dark</button>
          </div>
        </section>
      }

      <section>
        <header class="section-head"><h2>Saved cars</h2></header>
        @if (error()) {
          <p class="alert alert-error" role="alert">{{ error() }}</p>
        }
        @if (loading()) {
          <p class="muted center">Loading…</p>
        } @else if (saved().length === 0) {
          <p class="card note">Tap the heart on a car to save it here.</p>
        } @else {
          <div class="vc-list stack-list">
            @for (v of saved(); track v.id) {
              <app-vehicle-card [vehicle]="v" />
            }
          </div>
        }
      </section>

      <button type="button" class="btn btn-gray btn-block btn-lg" (click)="auth.logout()">Sign out</button>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  protected auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly initialsOf = initials;
  protected readonly parishes = [
    'Clarendon', 'Hanover', 'Kingston', 'Manchester', 'Portland', 'Saint Andrew', 'Saint Ann',
    'Saint Catherine', 'Saint Elizabeth', 'Saint James', 'Saint Mary', 'Saint Thomas', 'Trelawny', 'Westmoreland',
  ];

  protected form = { firstName: '', lastName: '', email: '', phone: '', parish: '' };
  protected readonly saved = signal<Vehicle[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal('');
  protected readonly profileMessage = signal('');
  protected readonly switchingMode = signal(false);
  protected readonly modeError = signal('');

  ngOnInit(): void {
    this.auth.sessionReady.pipe(take(1)).subscribe(() => this.resetForm());
    this.api.favorites().subscribe({
      next: (res) => {
        this.saved.set(res.vehicles);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected saveProfile(): void {
    this.savingProfile.set(true);
    this.profileError.set('');
    this.profileMessage.set('');
    this.auth.updateProfile({
      name: `${this.form.firstName} ${this.form.lastName}`.trim(),
      email: this.form.email,
      phone: this.form.phone,
      parish: this.form.parish,
    }).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileMessage.set('Your profile has been updated.');
        this.resetForm();
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.profileError.set(errorMessage(err));
      },
    });
  }

  protected switchMode(accountType: 'renter' | 'host'): void {
    this.switchingMode.set(true);
    this.modeError.set('');
    this.auth.updateAccountType(accountType).subscribe({
      next: () => this.router.navigateByUrl(accountType === 'host' ? '/host' : '/trips'),
      error: (err) => {
        this.switchingMode.set(false);
        this.modeError.set(errorMessage(err));
      },
    });
  }

  protected setTheme(theme: Theme): void {
    this.theme.setTheme(theme);
  }

  private resetForm(): void {
    const user = this.auth.user();
    if (!user) return;
    const [firstName = '', ...lastName] = user.name.split(' ');
    this.form = {
      firstName,
      lastName: lastName.join(' '),
      email: user.email,
      phone: user.phone ?? '',
      parish: user.parish ?? '',
    };
  }
}
