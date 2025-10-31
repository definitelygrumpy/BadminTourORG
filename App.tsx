
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Player, Tournament, Team, Match, LeaderboardStat, Club } from './types';
import { BadmintonIcon, ChevronLeftIcon, HistoryIcon, LockClosedIcon, PencilIcon, PlusIcon, ShieldIcon, TrashIcon, TrophyIcon, UsersIcon } from './components/icons';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove } from "firebase/database";


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDySZ2ao6BKNBU16jiPcHfxr0iPJLEDndo",
  authDomain: "badmintour-2c4f0.firebaseapp.com",
  databaseURL: "https://badmintour-2c4f0-default-rtdb.firebaseio.com",
  projectId: "badmintour-2c4f0",
  storageBucket: "badmintour-2c4f0.firebasestorage.app",
  messagingSenderId: "121590009561",
  appId: "1:121590009561:web:80b398d8f50265baf338c8",
  measurementId: "G-2SVKYSD73Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Helper Functions ---
const generateRoundRobinMatches = (teams: Team[]): Match[] => {
    const matches: Match[] = [];
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            matches.push({
                id: crypto.randomUUID(),
                teamA: teams[i],
                teamB: teams[j],
                scoreA: 0,
                scoreB: 0,
                status: 'PENDING',
            });
        }
    }
    return matches;
};

// --- Auth & Admin Components ---
type AuthState = { type: 'none' } | { type: 'club', clubId: string } | { type: 'admin' };

interface LoginScreenProps {
    setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
    clubs: Club[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ setAuth, clubs }) => {
    const [activeTab, setActiveTab] = useState<'club' | 'admin'>('club');
    const [clubName, setClubName] = useState('');
    const [clubPassword, setClubPassword] = useState('');
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [error, setError] = useState('');

    const handleClubLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const foundClub = clubs.find(c => c.name.toLowerCase() === clubName.toLowerCase().trim());
        if (foundClub && foundClub.password === clubPassword) {
            if (!foundClub.active) {
                setError('This club account is inactive. Please contact the administrator.');
                return;
            }
            setAuth({ type: 'club', clubId: foundClub.name });
        } else {
            setError('Invalid club name or password.');
        }
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (adminUser === 'ADMIN' && adminPass === 'ADMIN6767') {
            setAuth({ type: 'admin' });
        } else {
            setError('Invalid admin credentials.');
        }
    };

    return (
        <div className="min-h-screen bg-neutral flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                 <BadmintonIcon className="w-24 h-24 mx-auto text-primary mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Badminton Tournament Manager</h1>
                 <div className="bg-base-100 p-6 rounded-lg shadow-2xl mt-8">
                    <div className="flex border-b border-base-300 mb-4">
                        <button onClick={() => { setActiveTab('club'); setError(''); }} className={`flex-1 py-2 font-semibold transition-colors ${activeTab === 'club' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Club Login</button>
                        <button onClick={() => { setActiveTab('admin'); setError(''); }} className={`flex-1 py-2 font-semibold transition-colors ${activeTab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Admin Login</button>
                    </div>
                    {activeTab === 'club' ? (
                        <form onSubmit={handleClubLogin}>
                            <input type="text" value={clubName} onChange={e => setClubName(e.target.value)} placeholder="Club Name" className="w-full bg-base-200 text-white p-3 rounded-md border-2 border-base-300 focus:border-primary focus:outline-none transition mb-4" />
                            <input type="password" value={clubPassword} onChange={e => setClubPassword(e.target.value)} placeholder="Password" className="w-full bg-base-200 text-white p-3 rounded-md border-2 border-base-300 focus:border-primary focus:outline-none transition mb-4" />
                            <button type="submit" className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-md hover:bg-primary-focus transition-colors">Login</button>
                        </form>
                    ) : (
                        <form onSubmit={handleAdminLogin}>
                            <input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" className="w-full bg-base-200 text-white p-3 rounded-md border-2 border-base-300 focus:border-primary focus:outline-none transition mb-4" />
                            <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" className="w-full bg-base-200 text-white p-3 rounded-md border-2 border-base-300 focus:border-primary focus:outline-none transition mb-4" />
                            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-md hover:bg-blue-600 transition-colors">Admin Login</button>
                        </form>
                    )}
                    {error && <p className="text-error text-center mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
};

interface EditClubModalProps {
    club: Club;
    onClose: () => void;
    onSave: (updatedData: { name: string; password: string }) => void;
    externalError: string;
}
const EditClubModal: React.FC<EditClubModalProps> = ({ club, onClose, onSave, externalError }) => {
    const [name, setName] = useState(club.name);
    const [password, setPassword] = useState(club.password);

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, password });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Edit Club: {club.name}</h3>
                <form onSubmit={handleSaveClick}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Club Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-base-300 text-white p-2 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-base-300 text-white p-2 rounded-md" />
                        </div>
                    </div>
                    {externalError && <p className="text-error text-sm mt-4">{externalError}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="bg-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-secondary-focus transition-colors">Cancel</button>
                        <button type="submit" className="bg-primary text-primary-content font-bold py-2 px-4 rounded-md hover:bg-primary-focus transition-colors">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface AdminDashboardProps {
    clubs: Club[];
    tournaments: Tournament[];
    onAddClub: (name: string, password: string) => void;
    onUpdateClub: (clubId: string, data: { name: string; password: string }) => boolean;
    onToggleActive: (clubId: string) => void;
    onDeleteTournament: (tournamentId: string) => void;
    onLogout: () => void;
    onViewTournament: (tournamentId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ clubs, tournaments, onAddClub, onUpdateClub, onToggleActive, onDeleteTournament, onLogout, onViewTournament }) => {
    const [newClubName, setNewClubName] = useState('');
    const [newClubPassword, setNewClubPassword] = useState('');
    const [error, setError] = useState('');
    const [editingClub, setEditingClub] = useState<Club | null>(null);

    const handleAddClub = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newClubName.trim() || !newClubPassword.trim()) {
            setError('Club name and password cannot be empty.');
            return;
        }
        if (clubs.some(c => c.name.toLowerCase() === newClubName.toLowerCase().trim())) {
            setError('A club with this name already exists.');
            return;
        }
        onAddClub(newClubName.trim(), newClubPassword.trim());
        setNewClubName('');
        setNewClubPassword('');
    };

    const handleUpdateClub = (updatedData: {name: string, password: string}) => {
        if (!editingClub) return;
        setError('');
        if (!updatedData.name.trim() || !updatedData.password.trim()) {
            setError('Club name and password cannot be empty.');
            return;
        }
        const success = onUpdateClub(editingClub.id, { name: updatedData.name.trim(), password: updatedData.password.trim() });
        if (success) {
            setEditingClub(null);
        } else {
            setError('Another club with this name already exists.');
        }
    };
    
    const handleDeleteTournament = (tournamentId: string) => {
        if (window.confirm('Are you sure you want to delete this tournament permanently?')) {
            onDeleteTournament(tournamentId);
        }
    };

    return (
        <div className="min-h-screen bg-neutral">
            <header className="bg-base-200 shadow-md p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <ShieldIcon className="w-8 h-8 text-accent"/>
                    <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                </div>
                <button onClick={onLogout} className="text-sm bg-secondary hover:bg-secondary-focus text-white font-semibold py-2 px-4 rounded-md transition-colors">
                    Logout
                </button>
            </header>
            <main className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-base-200 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Manage Clubs</h2>
                    <form onSubmit={handleAddClub} className="flex flex-col sm:flex-row gap-3 mb-6">
                        <input value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="New Club Name" className="flex-grow bg-base-300 p-2 rounded" />
                        <input value={newClubPassword} onChange={e => setNewClubPassword(e.target.value)} placeholder="Password" type="text" className="flex-grow bg-base-300 p-2 rounded" />
                        <button type="submit" className="bg-primary text-white font-bold p-2 rounded hover:bg-primary-focus">Add Club</button>
                    </form>
                    {error && !editingClub && <p className="text-error text-sm mb-4">{error}</p>}
                    <h3 className="font-semibold mb-2">Existing Clubs ({clubs.length})</h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {clubs.map(club => (
                            <li key={club.id} className={`bg-base-300 p-2 rounded flex justify-between items-center transition-opacity ${!club.active ? 'opacity-50' : ''}`}>
                                <span>{club.name} {!club.active && <span className="text-xs text-warning ml-2">(Inactive)</span>}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setEditingClub(club); setError(''); }} className="text-blue-400 hover:text-blue-300" aria-label={`Edit ${club.name}`}>
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => onToggleActive(club.id)} className={`px-2 py-1 text-xs rounded font-semibold ${club.active ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                                        {club.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-base-200 p-6 rounded-lg lg:col-span-1">
                    <h2 className="text-2xl font-bold mb-4">All Tournaments ({tournaments.length})</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {tournaments.length > 0 ? tournaments.map(t => (
                            <div key={t.id} className="bg-base-300 p-3 rounded flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{t.name}</p>
                                    <p className="text-sm text-gray-400">{t.clubId} - {new Date(t.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => onViewTournament(t.id)} 
                                        className="bg-accent text-white font-semibold px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                                    >
                                        View
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTournament(t.id)} 
                                        className="text-error p-2 rounded-md hover:bg-red-900/50 transition-colors"
                                        aria-label={`Delete tournament ${t.name}`}
                                    >
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        )) : <p className="text-gray-400">No tournaments found.</p>}
                    </div>
                </div>
            </main>
            {editingClub && (
                <EditClubModal 
                    club={editingClub}
                    onClose={() => { setEditingClub(null); setError(''); }}
                    onSave={handleUpdateClub}
                    externalError={error}
                />
            )}
        </div>
    );
};

// --- Sub-Components ---

interface PlayerManagementProps {
    clubId: string;
    players: Player[];
    onAddPlayer: (name: string, clubId: string) => void;
}
const PlayerManagement: React.FC<PlayerManagementProps> = ({ clubId, players, onAddPlayer }) => {
    const [newPlayerName, setNewPlayerName] = useState('');

    const handleAddPlayer = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlayerName.trim()) {
            onAddPlayer(newPlayerName.trim(), clubId);
            setNewPlayerName('');
        }
    };
    
    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center"><UsersIcon className="w-8 h-8 mr-3 text-primary"/> Player Management</h2>
            <form onSubmit={handleAddPlayer} className="mb-6 bg-base-200 p-4 rounded-lg flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-grow bg-base-300 text-white p-3 rounded-md border border-gray-600 focus:border-primary focus:outline-none transition"
                    placeholder="Enter new player name"
                />
                <button type="submit" className="bg-primary text-primary-content font-bold py-3 px-5 rounded-md hover:bg-primary-focus transition-colors flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Player
                </button>
            </form>
            <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 border-b border-base-300 pb-2">Player List</h3>
                {players.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No players added yet. Add some players to start a tournament.</p>
                ) : (
                    <ul className="space-y-2">
                        {players.map((player) => (
                            <li key={player.id} className="bg-base-300 p-3 rounded-md text-white">{player.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

interface TournamentWizardProps {
    clubId: string;
    players: Player[];
    onTournamentCreate: (tournament: Omit<Tournament, 'id'>) => void;
}
const TournamentWizard: React.FC<TournamentWizardProps> = ({ clubId, players, onTournamentCreate }) => {
    const [step, setStep] = useState(1);
    const [tournamentName, setTournamentName] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [teamCreationMethod, setTeamCreationMethod] = useState<'random' | 'manual'>('random');
    const [manualTeams, setManualTeams] = useState<[string, string][]>([['', '']]);

    const handlePlayerSelect = (playerId: string) => {
        setSelectedPlayerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(playerId)) {
                newSet.delete(playerId);
            } else {
                newSet.add(playerId);
            }
            return newSet;
        });
    };

    const selectedPlayers = useMemo(() => players.filter(p => selectedPlayerIds.has(p.id)), [players, selectedPlayerIds]);
    
    useEffect(() => {
        // Reset manual teams if player selection changes
        const selectedCount = selectedPlayerIds.size;
        setManualTeams(Array(Math.floor(selectedCount / 2)).fill(['', '']));
    }, [selectedPlayerIds]);

    const handleCreateTeams = () => {
        let teams: Team[] = [];
        if (teamCreationMethod === 'random') {
            const shuffledPlayers = [...selectedPlayers].sort(() => 0.5 - Math.random());
            for (let i = 0; i < shuffledPlayers.length; i += 2) {
                if (!shuffledPlayers[i+1]) continue; // Avoid creating a team with one player
                const playerA = shuffledPlayers[i];
                const playerB = shuffledPlayers[i + 1];
                teams.push({
                    id: crypto.randomUUID(),
                    name: `${playerA.name} / ${playerB.name}`,
                    players: [playerA, playerB],
                });
            }
        } else {
             teams = manualTeams.map(([p1Id, p2Id]) => {
                const playerA = players.find(p => p.id === p1Id)!;
                const playerB = players.find(p => p.id === p2Id)!;
                return {
                    id: crypto.randomUUID(),
                    name: `${playerA.name} / ${playerB.name}`,
                    players: [playerA, playerB]
                }
            });
        }
        
        const newTournament: Omit<Tournament, 'id'> = {
            name: tournamentName,
            clubId,
            players: selectedPlayers,
            teams,
            matches: generateRoundRobinMatches(teams),
            status: 'IN_PROGRESS',
            createdAt: new Date().toISOString()
        };
        onTournamentCreate(newTournament);
    };

    const handleManualTeamPlayerChange = (teamIndex: number, playerIndex: 0 | 1, playerId: string) => {
        const newManualTeams = [...manualTeams];
        newManualTeams[teamIndex][playerIndex] = playerId;
        setManualTeams(newManualTeams);
    };

    const isManualTeamSetupValid = useMemo(() => {
        const allSelectedPlayers = new Set<string>();
        if (manualTeams.length !== selectedPlayerIds.size / 2) return false;
        for (const team of manualTeams) {
            if (!team[0] || !team[1] || team[0] === team[1]) return false;
            if (allSelectedPlayers.has(team[0]) || allSelectedPlayers.has(team[1])) return false;
            allSelectedPlayers.add(team[0]);
            allSelectedPlayers.add(team[1]);
        }
        return allSelectedPlayers.size === selectedPlayerIds.size;
    }, [manualTeams, selectedPlayerIds]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Step 1: Tournament Name</h3>
                        <input
                            type="text"
                            value={tournamentName}
                            onChange={(e) => setTournamentName(e.target.value)}
                            className="w-full bg-base-300 text-white p-3 rounded-md border border-gray-600 focus:border-primary focus:outline-none transition"
                            placeholder="e.g., Summer Championship"
                        />
                        <button onClick={() => setStep(2)} disabled={!tournamentName.trim()} className="mt-4 w-full bg-primary text-primary-content font-bold py-2 px-4 rounded-md hover:bg-primary-focus transition-colors disabled:bg-gray-500">Next</button>
                    </div>
                );
            case 2:
                const selectedCount = selectedPlayerIds.size;
                return (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Step 2: Select Players ({selectedCount} selected)</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
                             {players.map(player => (
                                 <button key={player.id} onClick={() => handlePlayerSelect(player.id)}
                                     className={`p-3 rounded-md text-left transition-colors ${selectedPlayerIds.has(player.id) ? 'bg-primary text-white' : 'bg-base-300 hover:bg-gray-600'}`}>
                                     {player.name}
                                 </button>
                             ))}
                         </div>
                         {selectedCount > 0 && selectedCount % 2 !== 0 && <p className="text-warning mt-2">Please select an even number of players.</p>}
                         <div className="flex justify-between mt-4">
                            <button onClick={() => setStep(1)} className="bg-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-secondary-focus transition-colors">Back</button>
                            <button onClick={() => setStep(3)} disabled={selectedCount < 2 || selectedCount % 2 !== 0} className="bg-primary text-primary-content font-bold py-2 px-4 rounded-md hover:bg-primary-focus transition-colors disabled:bg-gray-500">Next</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">Step 3: Create Teams</h3>
                        <div className="flex gap-4 mb-4">
                            <button onClick={() => setTeamCreationMethod('random')} className={`flex-1 p-3 rounded-md ${teamCreationMethod === 'random' ? 'bg-primary text-white' : 'bg-base-300'}`}>Random</button>
                            <button onClick={() => setTeamCreationMethod('manual')} className={`flex-1 p-3 rounded-md ${teamCreationMethod === 'manual' ? 'bg-primary text-white' : 'bg-base-300'}`}>Manual</button>
                        </div>
                        {teamCreationMethod === 'manual' && (
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {manualTeams.map((team, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-base-300 p-2 rounded-md">
                                        <span className="font-bold">{index + 1}.</span>
                                        <select value={team[0]} onChange={e => handleManualTeamPlayerChange(index, 0, e.target.value)} className="w-1/2 bg-base-100 p-2 rounded">
                                            <option value="">Select Player 1</option>
                                            {selectedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <select value={team[1]} onChange={e => handleManualTeamPlayerChange(index, 1, e.target.value)} className="w-1/2 bg-base-100 p-2 rounded">
                                            <option value="">Select Player 2</option>
                                            {selectedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setStep(2)} className="bg-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-secondary-focus transition-colors">Back</button>
                            <button onClick={handleCreateTeams} disabled={teamCreationMethod === 'manual' && !isManualTeamSetupValid} className="bg-success text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-500">Create Tournament</button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center"><PlusIcon className="w-8 h-8 mr-3 text-primary"/> New Tournament</h2>
            <div className="bg-base-200 p-6 rounded-lg">{renderStep()}</div>
        </div>
    );
};

interface LeaderboardProps {
    teams: Team[];
    matches: Match[];
}
const Leaderboard: React.FC<LeaderboardProps> = ({ teams, matches }) => {
    const stats = useMemo<LeaderboardStat[]>(() => {
        if (!teams || !matches) return [];
        const teamStats: { [key: string]: Omit<LeaderboardStat, 'pointsDifference'> } = {};
        teams.forEach(team => {
            teamStats[team.id] = {
                team: team,
                played: 0,
                wins: 0,
                losses: 0,
                points: 0,
                pointsFor: 0,
                pointsAgainst: 0,
            };
        });

        matches.forEach(match => {
            if (match.status === 'COMPLETED') {
                const statA = teamStats[match.teamA.id];
                const statB = teamStats[match.teamB.id];
                if (!statA || !statB) return; // a team might have been deleted but still in a match
                statA.played++;
                statB.played++;
                statA.pointsFor += match.scoreA;
                statA.pointsAgainst += match.scoreB;
                statB.pointsFor += match.scoreB;
                statB.pointsAgainst += match.scoreA;
                if (match.winnerId === match.teamA.id) {
                    statA.wins++;
                    statA.points += 2;
                    statB.losses++;
                } else {
                    statB.wins++;
                    statB.points += 2;
                    statA.losses++;
                }
            }
        });

        return Object.values(teamStats)
            .map(s => ({ ...s, pointsDifference: s.pointsFor - s.pointsAgainst }))
            .sort((a, b) => b.points - a.points || b.pointsDifference - a.pointsDifference);
    }, [teams, matches]);

    return (
        <div className="bg-base-200 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Leaderboard</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-base-300 text-sm text-gray-400">
                        <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Team</th>
                            <th className="p-2 text-center">P</th>
                            <th className="p-2 text-center">W</th>
                            <th className="p-2 text-center">L</th>
                            <th className="p-2 text-center">Pts</th>
                            <th className="p-2 text-center">+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, index) => (
                            <tr key={stat.team.id} className="border-b border-base-300 last:border-0">
                                <td className="p-2 font-bold">{index + 1}</td>
                                <td className="p-2">{stat.team.name}</td>
                                <td className="p-2 text-center">{stat.played}</td>
                                <td className="p-2 text-center text-success">{stat.wins}</td>
                                <td className="p-2 text-center text-error">{stat.losses}</td>
                                <td className="p-2 text-center font-bold">{stat.points}</td>
                                <td className="p-2 text-center font-mono">{stat.pointsDifference > 0 ? '+' : ''}{stat.pointsDifference}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface TournamentViewProps {
    tournament: Tournament;
    onUpdateTournament: (id: string, updatedTournamentData: Omit<Tournament, 'id'>) => void;
    readOnly?: boolean;
}
const TournamentView: React.FC<TournamentViewProps> = ({ tournament, onUpdateTournament, readOnly = false }) => {
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);

    const updateTournament = (updatedData: Partial<Omit<Tournament, 'id'>>) => {
        const { id, ...currentTournamentData } = tournament;
        onUpdateTournament(id, { ...currentTournamentData, ...updatedData });
    };

    const handleEditScore = (match: Match) => {
        setEditingMatch(match);
        setScoreA(match.scoreA);
        setScoreB(match.scoreB);
    };

    const handleSaveScore = () => {
        if (!editingMatch) return;
        
        const winnerId = scoreA > scoreB ? editingMatch.teamA.id : editingMatch.teamB.id;
        
        const updatedMatch: Match = { ...editingMatch, scoreA, scoreB, status: 'COMPLETED', winnerId };

        const updatedMatches = tournament.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
        
        const partialUpdate: Partial<Omit<Tournament, 'id'>> = { matches: updatedMatches };
        
        if (updatedMatches.every(m => m.status === 'COMPLETED') && !tournament.finalMatch) {
            const standings = calculateStandings(tournament.teams, updatedMatches);
            if (standings.length >= 2) {
                const finalMatch: Match = {
                    id: crypto.randomUUID(),
                    teamA: standings[0].team,
                    teamB: standings[1].team,
                    scoreA: 0,
                    scoreB: 0,
                    status: 'PENDING'
                };
                partialUpdate.finalMatch = finalMatch;
            }
        }
        
        updateTournament(partialUpdate);
        setEditingMatch(null);
    };

    const handleFinalScoreSave = (finalScoreA: number, finalScoreB: number) => {
        if (!tournament.finalMatch) return;
        const winner = finalScoreA > finalScoreB ? tournament.finalMatch.teamA : tournament.finalMatch.teamB;
        const runnerUp = finalScoreA > finalScoreB ? tournament.finalMatch.teamB : tournament.finalMatch.teamA;

        const updatedFinalMatch: Match = {...tournament.finalMatch, scoreA: finalScoreA, scoreB: finalScoreB, status: 'COMPLETED', winnerId: winner.id };

        updateTournament({finalMatch: updatedFinalMatch, winnerId: winner.id, runnerUpId: runnerUp.id, status: 'COMPLETED'});
    };
    
    const calculateStandings = (teams: Team[], matches: Match[]): LeaderboardStat[] => {
         const stats = teams.map(team => ({
            team: team,
            played: 0, wins: 0, losses: 0, points: 0,
            pointsFor: 0, pointsAgainst: 0, pointsDifference: 0,
        }));
        const teamStats = new Map(stats.map(s => [s.team.id, s]));

        matches.filter(m => m.status === 'COMPLETED').forEach(match => {
            const statA = teamStats.get(match.teamA.id)!;
            const statB = teamStats.get(match.teamB.id)!;
            if(!statA || !statB) return;
            
            statA.played++;
            statB.played++;
            statA.pointsFor += match.scoreA;
            statA.pointsAgainst += match.scoreB;
            statB.pointsFor += match.scoreB;
            statB.pointsAgainst += match.scoreA;

            if (match.winnerId === match.teamA.id) {
                statA.wins++;
                statA.points += 2;
                statB.losses++;
            } else {
                statB.wins++;
                statB.points += 2;
                statA.losses++;
            }
        });

        return Array.from(teamStats.values())
             .map(s => ({ ...s, pointsDifference: s.pointsFor - s.pointsAgainst }))
             .sort((a, b) => b.points - a.points || b.pointsDifference - a.pointsDifference);
    };

    const isRoundRobinComplete = tournament.matches.every(m => m.status === 'COMPLETED');
    const winner = tournament.winnerId ? tournament.teams.find(t => t.id === tournament.winnerId) : null;
    const runnerUp = tournament.runnerUpId ? tournament.teams.find(t => t.id === tournament.runnerUpId) : null;
    
    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-white mb-6 truncate">{tournament.name}</h2>
            {tournament.status === 'COMPLETED' && winner && runnerUp && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 p-6 rounded-lg mb-6 text-center shadow-lg">
                    <TrophyIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4"/>
                    <h3 className="text-2xl font-bold text-white">Tournament Complete!</h3>
                    <p className="text-lg mt-2">Winner: <span className="font-bold text-yellow-300">{winner.name}</span></p>
                    <p className="text-md">Runner-up: <span className="font-semibold text-gray-300">{runnerUp.name}</span></p>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     {isRoundRobinComplete && tournament.finalMatch && (
                        <div className="bg-base-200 p-4 rounded-lg">
                            <h3 className="text-xl font-semibold mb-4 text-primary">Final Match</h3>
                            <FinalMatchCard match={tournament.finalMatch} onSave={handleFinalScoreSave} readOnly={readOnly || tournament.status === 'COMPLETED'}/>
                        </div>
                     )}
                     <div className="bg-base-200 p-4 rounded-lg">
                        <h3 className="text-xl font-semibold mb-4">Matches</h3>
                        <div className="space-y-3">
                            {tournament.matches.map(match => (
                                <div key={match.id} className="bg-base-300 p-3 rounded-md flex items-center justify-between">
                                    <div className="text-sm sm:text-base">
                                        <span>{match.teamA.name}</span>
                                        <span className="font-bold text-primary mx-2">vs</span>
                                        <span>{match.teamB.name}</span>
                                    </div>
                                    {match.status === 'COMPLETED' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{match.scoreA} - {match.scoreB}</span>
                                            {!readOnly && tournament.status !== 'COMPLETED' &&
                                            <button onClick={() => handleEditScore(match)} className="text-xs bg-secondary px-2 py-1 rounded">Edit</button>}
                                        </div>
                                    ) : (
                                        !readOnly && <button onClick={() => handleEditScore(match)} className="bg-accent text-white font-semibold px-3 py-1 rounded-md text-sm">Set Score</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <Leaderboard teams={tournament.teams} matches={tournament.matches} />
                </div>
            </div>

            {editingMatch && (
                 <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                     <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
                         <h3 className="text-xl font-semibold mb-4">Update Score</h3>
                         <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                 <label className="text-gray-300 w-2/3">{editingMatch.teamA.name}</label>
                                 <input type="number" value={scoreA} onChange={e => setScoreA(parseInt(e.target.value))} className="w-1/3 bg-base-300 text-white p-2 rounded-md text-center" />
                             </div>
                             <div className="flex items-center justify-between">
                                 <label className="text-gray-300 w-2/3">{editingMatch.teamB.name}</label>
                                 <input type="number" value={scoreB} onChange={e => setScoreB(parseInt(e.target.value))} className="w-1/3 bg-base-300 text-white p-2 rounded-md text-center" />
                             </div>
                         </div>
                         <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setEditingMatch(null)} className="bg-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-secondary-focus transition-colors">Cancel</button>
                            <button onClick={handleSaveScore} className="bg-primary text-primary-content font-bold py-2 px-4 rounded-md hover:bg-primary-focus transition-colors">Save</button>
                         </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

interface FinalMatchCardProps {
    match: Match;
    onSave: (scoreA: number, scoreB: number) => void;
    readOnly: boolean;
}
const FinalMatchCard: React.FC<FinalMatchCardProps> = ({ match, onSave, readOnly }) => {
    const [scoreA, setScoreA] = useState(match.scoreA);
    const [scoreB, setScoreB] = useState(match.scoreB);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        onSave(scoreA, scoreB);
        setIsEditing(false);
    }
    
    if (readOnly || (match.status === 'COMPLETED' && !isEditing)) {
        return (
             <div className="bg-base-300 p-4 rounded-md text-center">
                 <p className="text-gray-400">{match.teamA.name}</p>
                 <p className="text-3xl font-bold my-2">{match.scoreA} - {match.scoreB}</p>
                 <p className="text-gray-400">{match.teamB.name}</p>
                 {!readOnly && <button onClick={() => setIsEditing(true)} className="text-xs mt-2 bg-secondary px-2 py-1 rounded">Edit</button>}
             </div>
        );
    }

    return (
        <div className="bg-base-300 p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
                <span className="w-2/5 text-right">{match.teamA.name}</span>
                <span className="w-1/5 text-center font-bold text-primary">vs</span>
                <span className="w-2/5 text-left">{match.teamB.name}</span>
            </div>
             <div className="flex justify-between items-center gap-2">
                <input type="number" value={scoreA} onChange={e => setScoreA(parseInt(e.target.value))} className="w-2/5 bg-base-100 text-white p-2 rounded-md text-center"/>
                 <span className="w-1/5 text-center">-</span>
                <input type="number" value={scoreB} onChange={e => setScoreB(parseInt(e.target.value))} className="w-2/5 bg-base-100 text-white p-2 rounded-md text-center"/>
             </div>
             <div className="text-right mt-3">
                 <button onClick={handleSave} className="bg-primary text-white font-semibold px-3 py-1 rounded-md text-sm">Save Final Score</button>
             </div>
        </div>
    );
};


interface TournamentHistoryProps {
    tournaments: Tournament[];
    onViewTournament: (tournamentId: string) => void;
}
const TournamentHistory: React.FC<TournamentHistoryProps> = ({ tournaments, onViewTournament }) => {
    const completedTournaments = tournaments.filter(t => t.status === 'COMPLETED');
    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center"><HistoryIcon className="w-8 h-8 mr-3 text-primary"/> Tournament History</h2>
            <div className="bg-base-200 p-4 rounded-lg">
                {completedTournaments.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No completed tournaments yet.</p>
                ) : (
                    <div className="space-y-3">
                        {completedTournaments.map(t => (
                            <div key={t.id} className="bg-base-300 p-4 rounded-md flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg">{t.name}</h3>
                                    <p className="text-sm text-gray-400">Completed on: {new Date(t.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => onViewTournament(t.id)} className="bg-accent text-white font-semibold px-4 py-2 rounded-md text-sm">View Details</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Club Application Component ---
interface ClubApplicationProps {
    clubId: string;
    players: Player[];
    tournaments: Tournament[];
    onAddPlayer: (name: string, clubId: string) => void;
    onAddTournament: (tournament: Omit<Tournament, 'id'>) => Promise<string>;
    onUpdateTournament: (id: string, updatedTournamentData: Omit<Tournament, 'id'>) => void;
    onLogout: () => void;
}
const ClubApplication: React.FC<ClubApplicationProps> = ({ clubId, players, tournaments, onAddPlayer, onAddTournament, onUpdateTournament, onLogout }) => {
    const [view, setView] = useState<'dashboard' | 'players' | 'new_tournament' | 'history'>('dashboard');
    const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

    const clubPlayers = useMemo(() => players.filter(p => p.clubId === clubId), [players, clubId]);
    const clubTournaments = useMemo(() => tournaments.filter(t => t.clubId === clubId), [tournaments, clubId]);
    
    useEffect(() => {
        setActiveTournamentId(null);
        setView('dashboard');
    }, [clubId]);

    const handleTournamentCreate = async (tournament: Omit<Tournament, 'id'>) => {
        const newId = await onAddTournament(tournament);
        setActiveTournamentId(newId);
    };

    const activeTournament = clubTournaments.find(t => t.id === activeTournamentId);
    
    const renderContent = () => {
        if (activeTournament) {
            return <TournamentView tournament={activeTournament} onUpdateTournament={onUpdateTournament}/>
        }
        
        switch (view) {
            case 'players':
                return <PlayerManagement clubId={clubId} players={clubPlayers} onAddPlayer={onAddPlayer}/>;
            case 'new_tournament':
                return <TournamentWizard clubId={clubId} players={clubPlayers} onTournamentCreate={handleTournamentCreate}/>;
            case 'history':
                return <TournamentHistory tournaments={clubTournaments} onViewTournament={setActiveTournamentId} />
            case 'dashboard':
            default:
                const inProgressTournaments = clubTournaments.filter(t => t.status !== 'COMPLETED');
                return (
                    <div className="p-4 md:p-6">
                        <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <button onClick={() => setView('new_tournament')} className="bg-base-200 p-6 rounded-lg text-center hover:bg-base-300 transition-colors">
                                <PlusIcon className="w-12 h-12 mx-auto text-primary mb-3"/>
                                <h3 className="text-xl font-semibold">New Tournament</h3>
                            </button>
                             <button onClick={() => setView('players')} className="bg-base-200 p-6 rounded-lg text-center hover:bg-base-300 transition-colors">
                                <UsersIcon className="w-12 h-12 mx-auto text-primary mb-3"/>
                                <h3 className="text-xl font-semibold">Manage Players</h3>
                            </button>
                             <button onClick={() => setView('history')} className="bg-base-200 p-6 rounded-lg text-center hover:bg-base-300 transition-colors">
                                <HistoryIcon className="w-12 h-12 mx-auto text-primary mb-3"/>
                                <h3 className="text-xl font-semibold">Tournament History</h3>
                            </button>
                        </div>

                        <div className="mt-8 bg-base-200 p-4 rounded-lg">
                            <h3 className="text-2xl font-bold mb-4">Active Tournaments</h3>
                            {inProgressTournaments.length === 0 ? (
                                <p className="text-gray-400">No active tournaments. Create one to get started!</p>
                            ) : (
                                <div className="space-y-3">
                                {inProgressTournaments.map(t => (
                                    <div key={t.id} className="bg-base-300 p-4 rounded-md flex justify-between items-center">
                                        <h4 className="font-semibold">{t.name}</h4>
                                        <button onClick={() => setActiveTournamentId(t.id)} className="bg-primary text-white font-semibold px-4 py-2 rounded-md text-sm">View</button>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="min-h-screen bg-neutral">
            <header className="bg-base-200 shadow-md p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <BadmintonIcon className="w-8 h-8 text-primary"/>
                    <h1 className="text-xl font-bold text-white hidden sm:block">{clubId}</h1>
                </div>
                <button onClick={onLogout} className="text-sm bg-secondary hover:bg-secondary-focus text-white font-semibold py-2 px-4 rounded-md transition-colors">
                    Logout
                </button>
            </header>
            <main>
                {(view !== 'dashboard' || activeTournamentId) && (
                    <div className="p-4 md:px-6">
                        <button onClick={() => { setView('dashboard'); setActiveTournamentId(null); }} className="flex items-center gap-2 text-primary hover:underline">
                            <ChevronLeftIcon className="w-5 h-5"/>
                            Back to Dashboard
                        </button>
                    </div>
                )}
                {renderContent()}
            </main>
        </div>
    );
}

// --- Main App Router ---

export default function App() {
    const [auth, setAuth] = useLocalStorage<AuthState>('badminton-auth', { type: 'none' });
    const [clubs, setClubs] = useState<Club[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [adminViewingTournamentId, setAdminViewingTournamentId] = useState<string | null>(null);
    
    useEffect(() => {
        const transformSnapshot = (snapshot: any) => {
            const data = snapshot.val();
            return data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
        };

        const clubsRef = ref(db, 'clubs');
        const playersRef = ref(db, 'players');
        const tournamentsRef = ref(db, 'tournaments');

        const unsubClubs = onValue(clubsRef, (snapshot) => setClubs(transformSnapshot(snapshot)));
        const unsubPlayers = onValue(playersRef, (snapshot) => setPlayers(transformSnapshot(snapshot)));
        const unsubTournaments = onValue(tournamentsRef, (snapshot) => setTournaments(transformSnapshot(snapshot)));

        return () => {
            unsubClubs();
            unsubPlayers();
            unsubTournaments();
        };
    }, []);

    const handleLogout = () => {
        setAuth({ type: 'none' });
        setAdminViewingTournamentId(null);
    };

    // --- Data Modification Functions ---
    const handleAddClub = (name: string, password: string) => push(ref(db, 'clubs'), { name, password, active: true });
    
    const handleUpdateClub = (clubId: string, data: { name: string; password: string }) => {
        if (clubs.some(c => c.name.toLowerCase() === data.name.toLowerCase() && c.id !== clubId)) {
            return false; // Name already exists
        }
        const clubToUpdate = clubs.find(c => c.id === clubId);
        if (clubToUpdate) {
            set(ref(db, `clubs/${clubId}`), { ...clubToUpdate, name: data.name, password: data.password });
        }
        return true;
    };

    const handleToggleActive = (clubId: string) => {
        const club = clubs.find(c => c.id === clubId);
        if(club) {
            set(ref(db, `clubs/${clubId}/active`), !club.active);
        }
    };
    
    const handleDeleteTournament = (tournamentId: string) => remove(ref(db, `tournaments/${tournamentId}`));

    const handleAddPlayer = (name: string, clubId: string) => push(ref(db, 'players'), { name, clubId });

    const handleAddTournament = async (tournamentData: Omit<Tournament, 'id'>) => {
        const newTournamentRef = await push(ref(db, 'tournaments'), tournamentData);
        return newTournamentRef.key!;
    };
    
    const handleUpdateTournament = (id: string, updatedTournamentData: Omit<Tournament, 'id'>) => {
        set(ref(db, `tournaments/${id}`), updatedTournamentData);
    };
    
    switch (auth.type) {
        case 'admin':
            const adminViewingTournament = adminViewingTournamentId ? tournaments.find(t => t.id === adminViewingTournamentId) : null;
            if (adminViewingTournament) {
                return (
                    <div className="min-h-screen bg-neutral">
                         <header className="bg-base-200 shadow-md p-4">
                            <div className="flex items-center gap-4">
                                <ShieldIcon className="w-8 h-8 text-accent"/>
                                <h1 className="text-xl font-bold text-white">Admin View: Tournament Details</h1>
                            </div>
                        </header>
                        <main>
                             <div className="p-4 md:px-6">
                                <button onClick={() => setAdminViewingTournamentId(null)} className="flex items-center gap-2 text-primary hover:underline">
                                    <ChevronLeftIcon className="w-5 h-5"/>
                                    Back to Admin Dashboard
                                </button>
                            </div>
                            <TournamentView 
                                tournament={adminViewingTournament} 
                                onUpdateTournament={() => {}} // Admin view is read-only
                                readOnly={true} 
                            />
                        </main>
                    </div>
                );
            }
            return <AdminDashboard 
                clubs={clubs} 
                tournaments={tournaments} 
                onAddClub={handleAddClub}
                onUpdateClub={handleUpdateClub}
                onToggleActive={handleToggleActive}
                onDeleteTournament={handleDeleteTournament}
                onLogout={handleLogout} 
                onViewTournament={setAdminViewingTournamentId}
            />;
        case 'club':
            return <ClubApplication
                clubId={auth.clubId}
                players={players}
                tournaments={tournaments}
                onAddPlayer={handleAddPlayer}
                onAddTournament={handleAddTournament}
                onUpdateTournament={handleUpdateTournament}
                onLogout={handleLogout}
            />;
        case 'none':
        default:
            return <LoginScreen setAuth={setAuth} clubs={clubs} />;
    }
}
