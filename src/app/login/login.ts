import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    loginForm: FormGroup;
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    get f() {
        return this.loginForm.controls;
    }

    get email() {
        return this.loginForm.value.email || '';
    }

    get password() {
        return this.loginForm.value.password || '';
    }

    async login() {
        if (this.loginForm.invalid) {
            Object.keys(this.loginForm.controls).forEach(key => {
                this.loginForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const result = await this.authService.login(this.email, this.password);

        this.isLoading = false;

        if (result.success) {
            this.router.navigate(['/home']);
        } else {
            this.errorMessage = this.getErrorMessage(result.errorCode);
        }
    }

    async loginWithGoogle() {
        this.isLoading = true;
        this.errorMessage = '';

        const result = await this.authService.loginWithGoogle();

        this.isLoading = false;

        if (!result.success) {
            this.errorMessage = this.getErrorMessage(result.errorCode);
        }
    }

    private getErrorMessage(errorCode: string): string {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email format.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            default:
                return 'Login failed. Please try again.';
        }
    }
}
