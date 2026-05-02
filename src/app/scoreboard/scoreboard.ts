import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContestService } from '../services/contest.service';
import { TimerService } from '../services/timer.service';
import { Contest, Team } from '../models/contest.model';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scoreboard.html',
  styleUrl: './scoreboard.scss'
})
export class ScoreboardComponent implements OnInit {
  private contestService = inject(ContestService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Inject TimerService for persistent timer across pages
  timerService = inject(TimerService);

  // Contest info
  contestId = signal<string | null>(null);
  currentContest = signal<Contest | null>(null);

  // List of problem codes (always 12 problems A-L)
  problems = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Search text binding variable
  searchText = signal('');

  // Get contest team results from Service (Signal)
  teams = this.contestService.contestTeamResults;

  // Modal State Signals
  isModalOpen = signal(false);
  selectedTeam = signal<Team | null>(null);
  selectedProblem = signal<string | null>(null);

  ngOnInit() {
    // Get contest ID from route
    this.route.paramMap.subscribe(params => {
      const id = params.get('contestId');
      this.contestId.set(id);

      if (id) {
        // Load contest details
        this.contestService.getContest(id).subscribe({
          next: (contest) => {
            this.currentContest.set(contest);
          },
          error: (err) => console.error('Error loading contest:', err)
        });

        // Load contest team results
        this.contestService.loadContestResults(id);
      }
    });
  }

  // Navigate back to contest list
  backToContests() {
    this.router.navigate(['/contest']);
  }

  // Computed Signal: Auto filter when typing in Search
  filteredTeams = computed(() => {
    const text = this.searchText().toLowerCase();
    const allTeams = this.teams();

    // Sort by totalSolved (desc), then by totalPenalty (asc)
    const sortedTeams = [...allTeams].sort((a, b) => {
      if ((b.totalSolved || 0) !== (a.totalSolved || 0)) {
        return (b.totalSolved || 0) - (a.totalSolved || 0);
      }
      return (a.totalPenalty || 0) - (b.totalPenalty || 0);
    });

    // Add rank to each team
    const teamsWithRank = sortedTeams.map((team, index) => ({
      ...team,
      rank: index + 1
    }));

    if (!text) return teamsWithRank;

    return teamsWithRank.filter(t =>
      t.name.toLowerCase().includes(text) ||
      t.university.toLowerCase().includes(text)
    );
  });

  // Open Judge Modal
  openJudgeModal(team: Team & { rank: number }, pid: string) {
    if (!this.timerService.isTimerRunning()) {
      console.log('Cannot judge: Contest timer is not running.');
      alert('Please start the contest timer first!');
      return;
    }

    const currentStatus = team.problems?.[pid]?.status;
    if (currentStatus === 'AC') {
      console.log(`Problem ${pid} for team ${team.name} is already accepted.`);
      return;
    }

    this.selectedTeam.set(team);
    this.selectedProblem.set(pid);
    this.isModalOpen.set(true);
  }

  // Close Judge Modal
  closeJudgeModal() {
    this.isModalOpen.set(false);
    this.selectedTeam.set(null);
    this.selectedProblem.set(null);
  }

  // Submit Grade
  submitGrade(result: 'AC' | 'WA' | 'CANCEL') {
    if (result === 'CANCEL') {
      this.closeJudgeModal();
      return;
    }

    const team = this.selectedTeam();
    const pid = this.selectedProblem();
    const contestId = this.contestId();

    if (team && pid && contestId) {
      const timestamp = result === 'AC' ? this.timerService.getElapsedSeconds() : 0;

      console.log(`Submitting grade: contestId=${contestId}, teamId=${team.id}, problemId=${pid}, result=${result}, timestamp=${timestamp}`);

      // Call the new contest-based judge endpoint
      this.contestService.submitJudge(contestId, team.id!, pid, result, timestamp).subscribe({
        next: () => {
          console.log(`Graded ${pid} for ${team.name}: ${result} at ${timestamp}s`);
          this.closeJudgeModal();
        },
        error: (err) => console.error('Error submitting grade:', err)
      });
    }
  }

  // Clear all results for this contest
  clearAllResults() {
    const contestId = this.contestId();
    if (!contestId) {
      alert('No contest selected');
      return;
    }

    if (!confirm('Are you sure you want to clear all AC and WA results for this contest? This action cannot be undone.')) {
      return;
    }

    this.contestService.clearContestResults(contestId).subscribe({
      next: () => {
        console.log('All results cleared successfully');
        this.timerService.resetTimer();
      },
      error: (err: any) => console.error('Error clearing results:', err)
    });
  }

  // Delete a team from the contest
  deleteTeamFromContest(team: Team & { rank: number }) {
    const contestId = this.contestId();
    if (!contestId || !team.id) {
      alert('Cannot delete team: missing contest or team information');
      return;
    }

    if (!confirm(`Are you sure you want to remove "${team.name}" from this contest? This action cannot be undone.`)) {
      return;
    }

    this.contestService.removeTeamFromContest(contestId, team.id).subscribe({
      next: () => {
        console.log(`Team ${team.name} removed from contest successfully`);
      },
      error: (err: any) => {
        console.error('Error removing team from contest:', err);
        alert('Error removing team: ' + (err.message || 'Server error'));
      }
    });
  }
}
