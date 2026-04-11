const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const DiscordEvent = sequelize.define('DiscordEvent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    eventType: {
        type: DataTypes.ENUM('user_registered', 'user_updated', 'tournament_created', 'tournament_updated', 'match_scheduled', 'match_started', 'match_finished', 'tournament_completed', 'user_ranking_updated'),
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    tournamentId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    matchId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    discordMessageId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    discordChannelId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    data: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'discord_events',
    hooks: {
        beforeSave: (event) => {
            event.updatedAt = new Date();
        }
    }
    // Indexes removidos - tabela já existe
});

module.exports = DiscordEvent;
