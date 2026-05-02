import { Injectable, inject, signal } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from '@angular/fire/firestore';
import { Team } from '../models/contest.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
    private firestore = inject(Firestore);
    private teamsCollection = collection(this.firestore, 'teams');

    // Signal to hold teams data
    teams = signal<Team[]>([]);

    constructor() {
        this.loadTeams();
    }

    // Load teams from Firestore
    private loadTeams() {
        collectionData(this.teamsCollection, { idField: 'id' }).subscribe((data: any[]) => {
            this.teams.set(data as Team[]);
        });
    }

    // Create a new team
    async createTeam(team: Team): Promise<void> {
        const teamData = {
            ...team,
            createdAt: new Date()
        };
        await addDoc(this.teamsCollection, teamData);
    }

    // Update an existing team
    async updateTeam(id: string, team: Partial<Team>): Promise<void> {
        const teamDoc = doc(this.firestore, 'teams', id);
        await updateDoc(teamDoc, { ...team });
    }

    // Delete a team
    async deleteTeam(id: string): Promise<void> {
        const teamDoc = doc(this.firestore, 'teams', id);
        await deleteDoc(teamDoc);
    }
}
