const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const TournamentParticipant = sequelize.define('TournamentParticipant', {
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
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    teamName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('registered', 'confirmed', 'disqualified', 'withdrawn'),
        defaultValue: 'registered'
    },
    seed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    registeredAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'tournament_participants',
    hooks: {
        beforeSave: (participant) => {
            participant.updatedAt = new Date();
        }
    },
    indexes: [
        { fields: ['tournamentId'] },
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['registeredAt'] }
    ]
});

module.exports = TournamentParticipant;
