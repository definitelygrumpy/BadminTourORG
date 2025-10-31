
export interface Player {
  id: string;
  name: string;
  clubId: string;
}

export interface Team {
  id: string;
  name: string;
  players: [Player, Player];
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  winnerId?: string;
  status: 'PENDING' | 'COMPLETED';
}

export type TournamentStatus = 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';

export interface Tournament {
  id: string;
  name: string;
  clubId: string;
  players: Player[];
  teams: Team[];
  matches: Match[];
  finalMatch?: Match;
  winnerId?: string;
  runnerUpId?: string;
  status: TournamentStatus;
  createdAt: string;
}

export interface LeaderboardStat {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
}

export interface Club {
  id: string;
  name: string;
  password: string;
  active: boolean;
}