import { Component, inject, computed } from '@angular/core';
import { TeamService } from '../services/team.service';
import { ContestService } from '../services/contest.service';

@Component({
    selector: 'app-home',
    standalone: true,
    templateUrl: './home.html',
    styleUrl: './home.css'
})
export class HomeComponent {
    private teamService = inject(TeamService);
    private contestService = inject(ContestService);

    // Computed property for total teams count
    totalTeams = computed(() => this.teamService.teams().length);

    // Computed property for total solved problems (AC)
    solvedProblems = computed(() => {
        return this.teamService.teams().reduce((total: number, team: any) => {
            return total + (team.totalSolved || 0);
        }, 0);
    });

    // Computed property for wrong answers (WA) count
    wrongAnswers = computed(() => {
        return this.contestService.teams().reduce((totalWA: number, team: any) => {
            if (!team.problems) return totalWA;
            return totalWA + Object.values(team.problems).reduce((sum: number, problem: any) => {
                return sum + (problem.status === 'WA' ? problem.attempts : 0);
            }, 0);
        }, 0);
    });

    // Top 12 teams sorted by totalSolved (desc), then totalPenalty (asc)
    top12Teams = computed(() => {
        const allTeams = this.contestService.teams();
        const sorted = [...allTeams].sort((a, b) => {
            if ((b.totalSolved || 0) !== (a.totalSolved || 0)) {
                return (b.totalSolved || 0) - (a.totalSolved || 0);
            }
            return (a.totalPenalty || 0) - (b.totalPenalty || 0);
        });
        return sorted.slice(0, 12);
    });

    // Get medal title based on rank (1-indexed)
    getMedalTitle(rank: number): string {
        if (rank === 1) return '🏆 Champion';
        if (rank >= 2 && rank <= 4) return '🥇 Gold Medal';
        if (rank >= 5 && rank <= 8) return '🥈 Silver Medal';
        if (rank >= 9 && rank <= 12) return '🥉 Bronze Medal';
        return '';
    }

    // Get medal CSS class based on rank
    getMedalClass(rank: number): string {
        if (rank === 1) return 'champion';
        if (rank >= 2 && rank <= 4) return 'gold';
        if (rank >= 5 && rank <= 8) return 'silver';
        if (rank >= 9 && rank <= 12) return 'bronze';
        return '';
    }
}
