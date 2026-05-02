import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { TeamService } from '../services/team.service';
import { Team } from '../models/contest.model';

@Component({
    selector: 'app-teams',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './teams.html',
    styleUrl: './teams.scss'
})
export class TeamsComponent {
    private fb = inject(FormBuilder);
    private teamService = inject(TeamService);

    // Signals
    teams = this.teamService.teams;
    isEditing = signal(false);
    editingTeamId = signal<string | null>(null);
    showForm = signal(false);

    // Reactive Form
    teamForm: FormGroup;

    constructor() {
        this.teamForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            university: ['', [Validators.required, Validators.minLength(3)]],
            coach: [''],
            members: this.fb.array([
                this.fb.control('', Validators.required),
                this.fb.control('', Validators.required),
                this.fb.control('', Validators.required)
            ])
        });
    }

    // Getter for members FormArray
    get members(): FormArray {
        return this.teamForm.get('members') as FormArray;
    }

    // Show the form for creating a new team
    showCreateForm() {
        this.showForm.set(true);
        this.isEditing.set(false);
        this.editingTeamId.set(null);
        this.teamForm.reset();
        // Reset to exactly 3 empty member controls
        this.members.clear();
        for (let i = 0; i < 3; i++) {
            this.members.push(this.fb.control('', Validators.required));
        }
    }

    // Show the form for editing an existing team
    editTeam(team: Team) {
        this.showForm.set(true);
        this.isEditing.set(true);
        this.editingTeamId.set(team.id || null);

        // Clear existing members
        this.members.clear();

        // Populate form with team data
        this.teamForm.patchValue({
            name: team.name,
            university: team.university,
            coach: team.coach || ''
        });

        // Add members to FormArray - ensure exactly 3 members
        for (let i = 0; i < 3; i++) {
            const memberName = team.members && team.members[i] ? team.members[i] : '';
            this.members.push(this.fb.control(memberName, Validators.required));
        }

        // Scroll to top to show the edit form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Cancel form and hide it
    cancelForm() {
        this.showForm.set(false);
        this.isEditing.set(false);
        this.editingTeamId.set(null);
        this.teamForm.reset();
    }

    // Submit the form (create or update)
    async onSubmit() {
        if (this.teamForm.valid) {
            const formValue = this.teamForm.value;
            const teamData: Team = {
                name: formValue.name,
                university: formValue.university,
                coach: formValue.coach,
                members: formValue.members.filter((m: string) => m.trim() !== '')
            };

            try {
                if (this.isEditing() && this.editingTeamId()) {
                    await this.teamService.updateTeam(this.editingTeamId()!, teamData);
                    alert('Team updated successfully!');
                } else {
                    await this.teamService.createTeam(teamData);
                    alert('Team created successfully!');
                }
                this.cancelForm();
            } catch (error) {
                console.error('Error saving team:', error);
                alert('Error saving team. Please try again.');
            }
        } else {
            // Mark all fields as touched to show validation errors
            Object.keys(this.teamForm.controls).forEach(key => {
                this.teamForm.get(key)?.markAsTouched();
            });
            this.members.controls.forEach(control => control.markAsTouched());
        }
    }

    // Delete a team
    async deleteTeam(team: Team) {
        if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
            try {
                await this.teamService.deleteTeam(team.id!);
                alert('Team deleted successfully!');
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Error deleting team. Please try again.');
            }
        }
    }

    // Helper method to check if a field has an error
    hasError(fieldName: string, errorType: string): boolean {
        const field = this.teamForm.get(fieldName);
        return !!(field?.hasError(errorType) && field?.touched);
    }
}
