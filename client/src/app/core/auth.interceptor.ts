import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService, getToken } from './auth.service';
import { API_URL } from './util';

/** Adds the bearer token to API calls and signs the user out if the token is rejected. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  // AuthService itself makes API calls, so it is looked up lazily (only once an error arrives)
  // to avoid a circular dependency.
  const injector = inject(Injector);
  const token = getToken();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      // login/register: 401 just means wrong credentials. /auth/me is handled by AuthService.
      const handledElsewhere = /\/auth\/(login|register|me)$/.test(req.url);
      if (err instanceof HttpErrorResponse && err.status === 401 && token && !handledElsewhere) {
        injector.get(AuthService).sessionExpired();
      }
      return throwError(() => err);
    }),
  );
};
