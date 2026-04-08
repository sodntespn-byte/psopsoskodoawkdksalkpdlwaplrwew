const bcrypt = require('bcryptjs');
const { sequelize } = require('../db/database');
const { User, Tournament, Match, TournamentParticipant, DiscordEvent } = require('../models');

// Dados de exemplo
const sampleUsers = [
    { username: 'BrasilKing', email: 'brasilking@prosoccer.com', password: 'senha123', rank: 2847, wins: 423, losses: 189, goals: 156, assists: 89, region: 'BR', discordUsername: 'BrasilKing#1234' },
    { username: 'GingaMaster', email: 'gingamaster@prosoccer.com', password: 'senha123', rank: 2798, wins: 387, losses: 234, goals: 142, assists: 67, region: 'BR', discordUsername: 'GingaMaster#5678' },
    { username: 'NeymarDigital', email: 'neymardigital@prosoccer.com', password: 'senha123', rank: 2756, wins: 412, losses: 167, goals: 189, assists: 98, region: 'BR', discordUsername: 'Neymar#9012' },
    { username: 'RonaldinhoBR', email: 'ronaldinhobr@prosoccer.com', password: 'senha123', rank: 2698, wins: 298, losses: 145, goals: 134, assists: 76, region: 'BR', discordUsername: 'Ronaldinho#3456' },
    { username: 'PeléLegend', email: 'pelelegend@prosoccer.com', password: 'senha123', rank: 2643, wins: 276, losses: 198, goals: 201, assists: 112, region: 'BR', discordUsername: 'Pelé#7890' },
    { username: 'ZicoMagic', email: 'zicomagic@prosoccer.com', password: 'senha123', rank: 2589, wins: 312, losses: 201, goals: 178, assists: 91, region: 'BR', discordUsername: 'Zico#1234' },
    { username: 'RomarioGoal', email: 'romariogoal@prosoccer.com', password: 'senha123', rank: 2543, wins: 289, losses: 178, goals: 267, assists: 87, region: 'BR', discordUsername: 'Romario#5678' },
    { username: 'RonaldoFenomeno', email: 'ronaldofenomeno@prosoccer.com', password: 'senha123', rank: 2498, wins: 267, losses: 156, goals: 289, assists: 94, region: 'BR', discordUsername: 'Ronaldo#9012' },
    { username: 'KakaPlaymaker', email: 'kakaplaymaker@prosoccer.com', password: 'senha123', rank: 2456, wins: 234, losses: 189, goals: 156, assists: 134, region: 'BR', discordUsername: 'Kaka#3456' },
    { username: 'JogaBonito', email: 'jogabonito@prosoccer.com', password: 'senha123', rank: 2412, wins: 198, losses: 167, goals: 123, assists: 89, region: 'BR', discordUsername: 'Joga#7890' }
];

const sampleTournaments = [
    {
        name: 'Brasileirão Digital 2024',
        type: '11v11',
        prize: 'R$250.000',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-20'),
        status: 'active',
        maxParticipants: 32,
        currentParticipants: 28,
        description: 'O maior torneio de futebol digital do Brasil',
        discordChannelId: null
    },
    {
        name: 'Copa do Brasil Digital',
        type: '5v5',
        prize: 'R$150.000',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-08-31'),
        status: 'active',
        maxParticipants: 64,
        currentParticipants: 45,
        description: 'Torneio eliminatório com os melhores times do Brasil',
        discordChannelId: null
    },
    {
        name: 'Campeonato Brasileiro 1v1',
        type: '1v1',
        prize: 'R$50.000',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-06-30'),
        status: 'upcoming',
        maxParticipants: 128,
        currentParticipants: 67,
        description: 'Competição individual para encontrar o melhor jogador',
        discordChannelId: null
    },
    {
        name: 'Sul-Americana Esports',
        type: '3v3',
        prize: '$25.000',
        startDate: new Date('2024-04-15'),
        endDate: new Date('2024-09-30'),
        status: 'upcoming',
        maxParticipants: 32,
        currentParticipants: 18,
        description: 'Torneio sul-americano com equipes de 3 jogadores',
        discordChannelId: null
    }
];

const sampleMatches = [
    {
        tournamentId: 'uuid-tournament-1',
        round: 1,
        date: new Date('2024-01-20T20:00:00'),
        status: 'finished',
        winnerId: 'uuid-user-1',
        winnerTeamName: 'Flamengo Digital',
        winReason: 'score',
        discordChannelId: 'discord-channel-1'
    },
    {
        tournamentId: 'uuid-tournament-2',
        round: 2,
        date: new Date('2024-01-25T18:00:00'),
        status: 'scheduled',
        winnerId: null,
        winnerTeamName: '',
        winReason: '',
        discordChannelId: 'discord-channel-2'
    },
    {
        tournamentId: 'uuid-tournament-3',
        round: 1,
        date: new Date('2024-01-22T19:30:00'),
        status: 'live',
        winnerId: null,
        winnerTeamName: '',
        winReason: '',
        discordChannelId: 'discord-channel-3'
    },
    {
        tournamentId: 'uuid-tournament-4',
        round: 3,
        date: new Date('2024-01-21T21:00:00'),
        status: 'finished',
        winnerId: 'uuid-user-2',
        winnerTeamName: 'Fluminense FC',
        winReason: 'score',
        discordChannelId: 'discord-channel-4'
    },
    {
        tournamentId: 'uuid-tournament-5',
        round: 1,
        date: new Date('2024-01-28T17:00:00'),
        status: 'scheduled',
        winnerId: null,
        winnerTeamName: '',
        winReason: '',
        discordChannelId: 'discord-channel-5'
    }
];

// Função para limpar o banco de dados
async function clearDatabase() {
    try {
        await User.destroy({ where: {}, truncate: true });
        await Tournament.destroy({ where: {}, truncate: true });
        await Match.destroy({ where: {}, truncate: true });
        await TournamentParticipant.destroy({ where: {}, truncate: true });
        await DiscordEvent.destroy({ where: {}, truncate: true });
        console.log('Banco de dados limpo com sucesso!');
    } catch (error) {
        console.error('Erro ao limpar banco de dados:', error);
    }
}

// Função para criar usuários
async function createUsers() {
    try {
        for (const userData of sampleUsers) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);
            
            const user = await User.create({
                ...userData,
                password: hashedPassword,
                lastLogin: new Date(),
                isOnline: Math.random() > 0.5
            });
        }
        
        console.log(`${sampleUsers.length} usuários criados com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar usuários:', error);
    }
}

// Função para criar torneios
async function createTournaments() {
    try {
        for (const tournamentData of sampleTournaments) {
            const tournament = await Tournament.create(tournamentData);
            
            // Criar participantes
            if (tournamentData.currentParticipants > 0) {
                const participants = sampleUsers.slice(0, tournamentData.currentParticipants).map((user, index) => ({
                    tournamentId: tournament.id,
                    userId: user.id,
                    teamName: `${user.username} Team`,
                    status: 'registered',
                    seed: index + 1
                }));
                
                await TournamentParticipant.bulkCreate(participants);
            }
        }
        
        console.log(`${sampleTournaments.length} torneios criados com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar torneios:', error);
    }
}

// Função para criar partidas
async function createMatches() {
    try {
        const MatchTeam = require('../models/MatchTeam');
        
        for (let i = 0; i < sampleMatches.length; i++) {
            const matchData = sampleMatches[i];
            
            const match = await Match.create({
                ...matchData,
                tournamentId: 'uuid-tournament-' + (i + 1)
            });
            
            // Criar equipes
            const teams = [
                {
                    matchId: match.id,
                    userId: sampleUsers[0]?.id || null,
                    teamName: 'Flamengo Digital',
                    score: 2,
                    formation: '4-4-2',
                    playStyle: 'balanced'
                },
                {
                    matchId: match.id,
                    userId: sampleUsers[1]?.id || null,
                    teamName: 'Palmeiras eSports',
                    score: 1,
                    formation: '4-4-2',
                    playStyle: 'balanced'
                }
            ];
            
            await MatchTeam.bulkCreate(teams);
        }
        
        console.log(`${sampleMatches.length} partidas criadas com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar partidas:', error);
    }
}

// Função principal
async function seedDatabase() {
    try {
        console.log('Iniciando seed do banco de dados PostgreSQL...');
        
        // Limpar banco de dados
        await clearDatabase();
        
        // Criar dados
        await createUsers();
        await createTournaments();
        await createMatches();
        
        console.log('Seed concluído com sucesso!');
        
        // Exibir estatísticas
        const userCount = await User.count();
        const tournamentCount = await Tournament.count();
        const matchCount = await Match.count();
        
        console.log(`\nEstatísticas finais:`);
        console.log(`- Usuários: ${userCount}`);
        console.log(`- Torneios: ${tournamentCount}`);
        console.log(`- Partidas: ${matchCount}`);
        
    } catch (error) {
        console.error('Erro no processo de seed:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Executar seed
seedDatabase();
