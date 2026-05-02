import { Injectable, inject, signal, computed, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import {
    Auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    browserPopupRedirectResolver,
    GoogleAuthProvider,
    signOut,
    authState,
    User
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private fauth: Auth = inject(Auth);
    private router: Router = inject(Router);

    private googleProvider = (() => {
        const p = new GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        return p;
    })();

    private userSignal = signal<User | null>(null);

    public currentUser = this.userSignal.asReadonly();
    public isAuthenticated = computed(() => !!this.currentUser());

    constructor() {
        afterNextRender(() => {
            authState(this.fauth).subscribe((user) => {
                this.userSignal.set(user);
            });

            getRedirectResult(this.fauth, browserPopupRedirectResolver)
                .then((result) => {
                    if (result?.user) {
                        this.router.navigate(['/home']);
                    }
                })
                .catch((error) => {
                    console.error('Redirect sign-in error:', error);
                });
        });
    }

    // Create account with email and password
    async createAccount(email: string, password: string) {
        try {
            const result = await createUserWithEmailAndPassword(this.fauth, email, password);
            console.log('Account created:', result.user);
            return { success: true, user: result.user };
        } catch (error: any) {
            console.error('Create account error:', error);
            return {
                success: false,
                errorCode: error.code,
                errorMessage: error.message
            };
        }
    }

    // Login with email and password
    async login(email: string, password: string) {
        try {
            const result = await signInWithEmailAndPassword(this.fauth, email, password);
            console.log('Login successful:', result.user);
            return { success: true, user: result.user };
        } catch (error: any) {
            console.error('Login error:', error);
            return {
                success: false,
                errorCode: error.code,
                errorMessage: error.message
            };
        }
    }

    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(this.fauth, this.googleProvider, browserPopupRedirectResolver);
            this.router.navigate(['/home']);
            return { success: true, user: result.user };
        } catch (error: any) {
            const code = error?.code as string | undefined;
            if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
                try {
                    await signInWithRedirect(this.fauth, this.googleProvider, browserPopupRedirectResolver);
                    return { success: true, user: null as any };
                } catch (redirectError: any) {
                    return {
                        success: false,
                        errorCode: redirectError?.code,
                        errorMessage: redirectError?.message,
                    };
                }
            }
            console.error('Google login error:', error);
            return {
                success: false,
                errorCode: code,
                errorMessage: error?.message,
            };
        }
    }

    // Logout
    async logout() {
        await signOut(this.fauth);
        this.router.navigate(['/login']);
    }
}
