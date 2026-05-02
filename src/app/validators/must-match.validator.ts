import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

// Custom validator: Check if two fields match (e.g., password and confirm password)
export function mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
        const control = formGroup.get(controlName);
        const matchingControl = formGroup.get(matchingControlName);

        if (!control || !matchingControl) {
            return null;
        }

        // Return null if matching control is already invalid
        if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
            return null;
        }

        // Check if values match
        if (control.value !== matchingControl.value) {
            matchingControl.setErrors({ mustMatch: true });
            return { mustMatch: true };
        } else {
            matchingControl.setErrors(null);
            return null;
        }
    };
}
