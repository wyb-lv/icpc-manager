import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { Team, Contest } from '../models/contest.model';
import { Observable, map, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContestService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);

  // Signal for teams from Firebase (for selection)
  teams = signal<Team[]>([]);

  // Signal for contests (from server/Firebase)
  contests = signal<Contest[]>([]);

  // Signal for current contest's team results
  contestTeamResults = signal<Team[]>([]);

  private nodeApiUrl = 'http://localhost:8000';

  constructor() {
    this.loadTeamsFromFirebase();
    this.loadContests();
  }

  // --- TEAMS (Firebase - for selection) ---
  private loadTeamsFromFirebase() {
    const teamsCollection = collection(this.firestore, 'teams');

    collectionData(teamsCollection, { idField: 'id' }).subscribe((data: any[]) => {
      this.teams.set(data as Team[]);
    });
  }

  // --- CONTESTS (Server API) ---

  loadContests() {
    this.http.get<{ success: boolean; data: Contest[] }>(`${this.nodeApiUrl}/contests`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.contests.set(response.data);
          }
        },
        error: (err) => console.error('Error loading contests:', err)
      });
  }

  getContest(id: string): Observable<Contest> {
    return this.http.get<{ success: boolean; data: Contest }>(`${this.nodeApiUrl}/contests/${id}`)
      .pipe(map(response => response.data));
  }

  createContest(contest: Partial<Contest>): Observable<Contest> {
    return this.http.post<{ success: boolean; data: Contest }>(`${this.nodeApiUrl}/contests`, contest)
      .pipe(
        map(response => response.data),
        tap(() => this.loadContests())
      );
  }

  updateContest(id: string, contest: Partial<Contest>): Observable<Contest> {
    return this.http.put<{ success: boolean; data: Contest }>(`${this.nodeApiUrl}/contests/${id}`, contest)
      .pipe(
        map(response => response.data),
        tap(() => this.loadContests())
      );
  }

  // --- CONTEST-TEAM MANAGEMENT ---

  // Add teams to a contest
  addTeamsToContest(contestId: string, teams: { teamId: string; teamName: string; university: string }[]): Observable<any> {
    return this.http.post(`${this.nodeApiUrl}/contests/${contestId}/teams`, { teams })
      .pipe(tap(() => this.loadContestResults(contestId)));
  }

  // Remove a team from a contest
  removeTeamFromContest(contestId: string, teamId: string): Observable<any> {
    return this.http.delete(`${this.nodeApiUrl}/contests/${contestId}/teams/${teamId}`)
      .pipe(tap(() => this.loadContestResults(contestId)));
  }

  // Get teams with results for a contest
  getContestResults(contestId: string): Observable<Team[]> {
    return this.http.get<{ success: boolean; data: Team[] }>(`${this.nodeApiUrl}/contests/${contestId}/results`)
      .pipe(map(response => response.data || []));
  }

  // Load contest results into signal
  loadContestResults(contestId: string) {
    this.getContestResults(contestId).subscribe({
      next: (results) => this.contestTeamResults.set(results),
      error: (err) => console.error('Error loading contest results:', err)
    });
  }

  // --- JUDGING (per contest) ---

  submitJudge(contestId: string, teamId: string, problemId: string, result: 'AC' | 'WA', timestamp?: number): Observable<any> {
    return this.http.post(`${this.nodeApiUrl}/contests/${contestId}/judge`, { teamId, problemId, result, timestamp })
      .pipe(tap(() => this.loadContestResults(contestId)));
  }

  clearContestResults(contestId: string): Observable<any> {
    return this.http.post(`${this.nodeApiUrl}/contests/${contestId}/clear`, {})
      .pipe(tap(() => this.loadContestResults(contestId)));
  }
}
