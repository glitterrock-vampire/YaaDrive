import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { User } from './api.service';
import { AuthService, getToken } from './auth.service';

/** Sends signed-out visitors to the login page, then back to where they were headed. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (getToken()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps Explore available to signed-in members after the public welcome screen. */
export const entryGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return auth.sessionReady.pipe(
    take(1),
    map(() => auth.user() ? true : router.createUrlTree(['/'], { queryParams: { returnUrl: state.url } })),
  );
};

/** Allows protected screens only to the account type responsible for them. */
export function roleGuard(accountType: User['accountType']): CanActivateFn {
  return (_route, state) => {
    const router = inject(Router);
    const auth = inject(AuthService);
    if (!getToken()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    return auth.sessionReady.pipe(
      take(1),
      map(() => {
        const user = auth.user();
        if (user?.accountType === accountType) return true;
        return router.createUrlTree(['/']);
      }),
    );
  };
}
