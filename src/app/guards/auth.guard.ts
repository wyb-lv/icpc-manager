import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(Auth);
    const router = inject(Router);

    // authState returns an Observable with user state (null or User object)
    return authState(auth).pipe(
        // Important: take(1) to complete Observable after first value
        take(1),
        map(user => {
            const isLoggedIn = !!user;

            if (isLoggedIn) {
                return true; // Allow access
            } else {
                // Not logged in - redirect to login with return URL
                return router.createUrlTree(['/login'], {
                    queryParams: { returnUrl: state.url }
                });
            }
        })
    );
};
