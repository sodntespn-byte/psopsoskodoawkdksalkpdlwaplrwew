const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Tournament = require('./models/Tournament');
const Match = require('./models/Match');

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pro-soccer-online')
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro de conexão com MongoDB:', err));

// Dados de exemplo
const sampleUsers = [
    { username: 'BrasilKing', email: 'brasilking@prosoccer.com', password: 'senha123', rank: 2847, wins: 423, losses: 189, goals: 156, assists: 89, region: 'BR' },
    { username: 'GingaMaster', email: 'gingamaster@prosoccer.com', password: 'senha123', rank: 2798, wins: 387, losses: 234, goals: 142, assists: 67, region: 'BR' },
    { username: 'NeymarDigital', email: 'neymardigital@prosoccer.com', password: 'senha123', rank: 2756, wins: 412, losses: 167, goals: 189, assists: 98, region: 'BR' },
    { username: 'RonaldinhoBR', email: 'ronaldinhobr@prosoccer.com', password: 'senha123', rank: 2698, wins: 298, losses: 145, goals: 134, assists: 76, region: 'BR' },
    { username: 'PeléLegend', email: 'pelelegend@prosoccer.com', password: 'senha123', rank: 2643, wins: 276, losses: 198, goals: 201, assists: 112, region: 'BR' },
    { username: 'ZicoMagic', email: 'zicomagic@prosoccer.com', password: 'senha123', rank: 2589, wins: 312, losses: 201, goals: 178, assists: 91, region: 'BR' },
    { username: 'RomarioGoal', email: 'romariogoal@prosoccer.com', password: 'senha123', rank: 2543, wins: 289, losses: 178, goals: 267, assists: 87, region: 'BR' },
    { username: 'RonaldoFenomeno', email: 'ronaldofenomeno@prosoccer.com', password: 'senha123', rank: 2498, wins: 267, losses: 156, goals: 289, assists: 94, region: 'BR' },
    { username: 'KakaPlaymaker', email: 'kakaplaymaker@prosoccer.com', password: 'senha123', rank: 2456, wins: 234, losses: 189, goals: 156, assists: 134, region: 'BR' },
    { username: 'JogaBonito', email: 'jogabonito@prosoccer.com', password: 'senha123', rank: 2412, wins: 198, losses: 167, goals: 123, assists: 89, region: 'BR' }
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
        description: 'O maior torneio de futebol digital do Brasil'
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
        description: 'Torneio eliminatório com os melhores times do Brasil'
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
        description: 'Competição individual para encontrar o melhor jogador'
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
        description: 'Torneio sul-americano com equipes de 3 jogadores'
    }
];

const sampleMatches = [
    {
        teams: [
            { name: 'Flamengo Digital', score: 2 },
            { name: 'Palmeiras eSports', score: 1 }
        ],
        date: new Date('2024-01-20T20:00:00'),
        status: 'finished',
        tournament: 'Brasileirão Digital 2024',
        prize: 'R$250.000'
    },
    {
        teams: [
            { name: 'Corinthians Gaming', score: 0 },
            { name: 'São Paulo FC', score: 0 }
        ],
        date: new Date('2024-01-25T18:00:00'),
        status: 'scheduled',
        tournament: 'Brasileirão Digital 2024',
        prize: 'R$250.000'
    },
    {
        teams: [
            { name: 'Vasco Esports', score: 1 },
            { name: 'Botafogo Digital', score: 1 }
        ],
        date: new Date('2024-01-22T19:30:00'),
        status: 'live',
        tournament: 'Copa do Brasil Digital',
        prize: 'R$150.000'
    },
    {
        teams: [
            { name: 'Fluminense FC', score: 3 },
            { name: 'Cruzeiro Gaming', score: 2 }
        ],
        date: new Date('2024-01-21T21:00:00'),
        status: 'finished',
        tournament: 'Campeonato Brasileiro 1v1',
        prize: 'R$50.000'
    },
    {
        teams: [
            { name: 'Atlético MG', score: 0 },
            { name: 'Grêmio Digital', score: 0 }
        ],
        date: new Date('2024-01-28T17:00:00'),
        status: 'scheduled',
        tournament: 'Sul-Americana Esports',
        prize: '$25.000'
    }
];

// Função para limpar o banco de dados
async function clearDatabase() {
    try {
        await User.deleteMany({});
        await Tournament.deleteMany({});
        await Match.deleteMany({});
        console.log('Banco de dados limpo com sucesso!');
    } catch (error) {
        console.error('Erro ao limpar banco de dados:', error);
    }
}

// Função para criar usuários
async function createUsers() {
    try {
        const salt = await bcrypt.genSalt(10);
        
        for (const userData of sampleUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, salt);
            const user = new User({
                ...userData,
                password: hashedPassword,
                lastLogin: new Date(),
                isOnline: Math.random() > 0.5
            });
            await user.save();
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
            const tournament = new Tournament(tournamentData);
            await tournament.save();
        }
        
        console.log(`${sampleTournaments.length} torneios criados com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar torneios:', error);
    }
}

// Função para criar partidas
async function createMatches() {
    try {
        for (const matchData of sampleMatches) {
            const match = new Match(matchData);
            await match.save();
        }
        
        console.log(`${sampleMatches.length} partidas criadas com sucesso!`);
    } catch (error) {
        console.error('Erro ao criar partidas:', error);
    }
}

// Função principal
async function seedDatabase() {
    try {
        console.log('Iniciando seed do banco de dados...');
        
        // Limpar banco de dados
        await clearDatabase();
        
        // Criar dados
        await createUsers();
        await createTournaments();
        await createMatches();
        
        console.log('Seed concluído com sucesso!');
        
        // Exibir estatísticas
        const userCount = await User.countDocuments();
        const tournamentCount = await Tournament.countDocuments();
        const matchCount = await Match.countDocuments();
        
        console.log(`\nEstatísticas finais:`);
        console.log(`- Usuários: ${userCount}`);
        console.log(`- Torneios: ${tournamentCount}`);
        console.log(`- Partidas: ${matchCount}`);
        
    } catch (error) {
        console.error('Erro no processo de seed:', error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}

// Executar seed
seedDatabase();
