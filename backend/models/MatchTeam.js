const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const MatchTeam = sequelize.define('MatchTeam', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    matchId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    teamName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    formation: {
        type: DataTypes.ENUM('4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-2-3-1'),
        defaultValue: '4-4-2'
    },
    playStyle: {
        type: DataTypes.ENUM('attacking', 'balanced', 'defensive'),
        defaultValue: 'balanced'
    },
    tacticsPressing: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
    },
    tacticsWidth: {
        type: DataTypes.ENUM('narrow', 'medium', 'wide'),
        defaultValue: 'medium'
    }
}, {
    tableName: 'match_teams',
    hooks: {
        beforeSave: (team) => {
            team.updatedAt = new Date();
        }
    }
    // Indexes removidos - tabela já existe
});

module.exports = MatchTeam;
