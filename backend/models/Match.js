const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const Match = sequelize.define('Match', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tournamentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Tournaments',
            key: 'id'
        }
    },
    round: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled'),
        defaultValue: 'scheduled'
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    winner: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    winnerTeamName: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    winReason: {
        type: DataTypes.ENUM('score', 'walkover', 'disqualification', 'technical'),
        defaultValue: 'score'
    },
    stadiumName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    stadiumCapacity: {
        type: DataTypes.INTEGER,
        defaultValue: 50000
    },
    weather: {
        type: DataTypes.ENUM('sunny', 'cloudy', 'rainy', 'snowy', 'windy'),
        defaultValue: 'sunny'
    },
    condition: {
        type: DataTypes.ENUM('perfect', 'good', 'fair', 'poor'),
        defaultValue: 'good'
    },
    totalGoals: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.teams ? this.teams.reduce((total, team) => total + (team.score || 0), 0) : 0;
        }
    },
    winningTeam: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.status !== 'finished') return null;
            
            const team1Score = this.teams && this.teams[0] ? this.teams[0].score : 0;
            const team2Score = this.teams && this.teams[1] ? this.teams[1].score : 0;
            
            if (team1Score > team2Score) return 0;
            if (team2Score > team1Score) return 1;
            return null; // Empate
        }
    },
    isLive: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.status === 'live' || this.status === 'halftime';
        }
    },
    isFinished: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.status === 'finished';
        }
    },
    discordChannelId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    discordMatchMessageId: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'matches',
    hooks: {
        beforeSave: (match) => {
            match.updatedAt = new Date();
        }
    },
    indexes: [
        { fields: ['tournamentId'] },
        { fields: ['date'] },
        { fields: ['status'] },
        { fields: ['winner'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = Match;
