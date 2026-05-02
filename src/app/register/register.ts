import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { mustMatch } from '../validators/must-match.validator';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.html',
    styleUrl: './register.css'
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    registerForm: FormGroup;
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor() {
        this.registerForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: mustMatch('password', 'confirmPassword') });
    }

    get f() {
        return this.registerForm.controls;
    }

    get email() {
        return this.registerForm.value.email || '';
    }

    get password() {
        return this.registerForm.value.password || '';
    }

    async register() {
        if (this.registerForm.invalid) {
            Object.keys(this.registerForm.controls).forEach(key => {
                this.registerForm.get(key)?.markAsTouched();
            });
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const result = await this.authService.createAccount(this.email, this.password);

        this.isLoading = false;

        if (result.success) {
            alert('Account created successfully!');
            this.router.navigate(['/login']);
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
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/invalid-email':
                return 'Invalid email format.';
            case 'auth/weak-password':
                return 'Password is too weak. Please use a stronger password.';
            case 'auth/operation-not-allowed':
                return 'Registration is currently disabled.';
            default:
                return 'Registration failed. Please try again.';
        }
    }
}
