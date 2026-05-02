export type ProblemState = 'AC' | 'WA' | 'PENDING' | 'NONE';

export interface ProblemResult {
  status: ProblemState;
  attempts: number;
  timestamp?: number;
}

// Single Team interface used everywhere
export interface Team {
  id?: string;
  name: string;
  university: string;
  members?: string[];
  coach?: string;
  createdAt?: Date;
  problems?: Record<string, ProblemResult>;
  totalSolved?: number;
  totalPenalty?: number;
}

export interface Contest {
  id: string;
  name: string;
  description: string;
  date: string;
  status: 'upcoming' | 'active' | 'completed';
  teamResults?: Record<string, Team>;  // Map of teamId to Team
  createdAt: string;
  updatedAt: string;
}
