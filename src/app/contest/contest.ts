import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContestService } from '../services/contest.service';
import { Contest, Team } from '../models/contest.model';

@Component({
  selector: 'app-contest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contest.html',
  styleUrl: './contest.css',
})
export class ContestComponent {
  private contestService = inject(ContestService);
  private router = inject(Router);

  // Get contests from service
  contests = this.contestService.contests;

  // Get teams from Firebase (for adding to contest)
  availableTeams = this.contestService.teams;

  // Modal state
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingContestId = signal<string | null>(null);

  // Teams modal state
  isTeamsModalOpen = signal(false);
  selectedContestForTeams = signal<Contest | null>(null);
  selectedTeamIds = signal<Set<string>>(new Set());

  // Form fields
  formName = signal('');
  formDescription = signal('');
  formDate = signal('');

  // Open modal for creating new contest
  openCreateModal() {
    this.isEditing.set(false);
    this.editingContestId.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  // Open modal for editing existing contest
  openEditModal(contest: Contest) {
    this.isEditing.set(true);
    this.editingContestId.set(contest.id);
    this.formName.set(contest.name);
    this.formDescription.set(contest.description || '');
    this.formDate.set(contest.date ? contest.date.split('T')[0] : '');
    this.isModalOpen.set(true);
  }

  // Close modal
  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  // Reset form fields
  resetForm() {
    this.formName.set('');
    this.formDescription.set('');
    this.formDate.set('');
  }

  // Save contest (create or update)
  saveContest() {
    const contestData: Partial<Contest> = {
      name: this.formName(),
      description: this.formDescription(),
      date: this.formDate()
    };

    if (this.isEditing() && this.editingContestId()) {
      this.contestService.updateContest(this.editingContestId()!, contestData).subscribe({
        next: () => {
          console.log('Contest updated successfully');
          this.closeModal();
        },
        error: (err) => console.error('Error updating contest:', err)
      });
    } else {
      this.contestService.createContest(contestData).subscribe({
        next: () => {
          console.log('Contest created successfully');
          this.closeModal();
        },
        error: (err) => console.error('Error creating contest:', err)
      });
    }
  }

  // Navigate to scoreboard for selected contest
  viewScoreboard(contest: Contest) {
    this.router.navigate(['/contest', contest.id, 'scoreboard']);
  }

  // --- TEAMS MODAL ---

  // Open teams modal
  openTeamsModal(contest: Contest) {
    this.selectedContestForTeams.set(contest);

    // Pre-select teams already in the contest
    const existingTeamIds = contest.teamResults
      ? new Set(Object.keys(contest.teamResults))
      : new Set<string>();
    this.selectedTeamIds.set(existingTeamIds);

    this.isTeamsModalOpen.set(true);
  }

  // Close teams modal
  closeTeamsModal() {
    this.isTeamsModalOpen.set(false);
    this.selectedContestForTeams.set(null);
    this.selectedTeamIds.set(new Set());
  }

  // Toggle team selection
  toggleTeamSelection(teamId: string | undefined) {
    if (!teamId) return;
    const current = this.selectedTeamIds();
    const newSet = new Set(current);
    if (newSet.has(teamId)) {
      newSet.delete(teamId);
    } else {
      newSet.add(teamId);
    }
    this.selectedTeamIds.set(newSet);
  }

  // Check if team is selected
  isTeamSelected(teamId: string | undefined): boolean {
    if (!teamId) return false;
    return this.selectedTeamIds().has(teamId);
  }

  // Save selected teams to contest
  saveTeamsToContest() {
    const contest = this.selectedContestForTeams();
    if (!contest) return;

    const teams = this.availableTeams()
      .filter(team => team.id && this.selectedTeamIds().has(team.id))
      .map(team => ({
        teamId: team.id!,
        teamName: team.name,
        university: team.university
      }));

    if (teams.length === 0) {
      alert('Please select at least one team');
      return;
    }

    console.log('Saving teams to contest:', contest.id, teams);

    this.contestService.addTeamsToContest(contest.id, teams).subscribe({
      next: (response) => {
        console.log('Teams saved successfully:', response);
        alert(`Successfully added ${teams.length} teams to the contest!`);
        this.closeTeamsModal();
        // Reload contests to get updated data
        this.contestService.loadContests();
      },
      error: (err) => {
        console.error('Error adding teams to contest:', err);
        alert('Error adding teams: ' + (err.message || 'Server error. Make sure the server is running.'));
      }
    });
  }

  // Get team count for a contest
  getTeamCount(contest: Contest): number {
    return contest.teamResults ? Object.keys(contest.teamResults).length : 0;
  }

  // Get status badge class
  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'badge bg-success';
      case 'completed': return 'badge bg-secondary';
      case 'upcoming': return 'badge bg-warning text-dark';
      default: return 'badge bg-info';
    }
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
