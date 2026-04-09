/**
 * PSO BRASIL - Lobby Player Model
 * Sistema de busca de time em tempo real
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const LobbyPlayer = sequelize.define('LobbyPlayer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    discord_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    posicao: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    mensagem: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('searching', 'found', 'expired'),
        defaultValue: 'searching'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    message_id: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    channel_id: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'lobby_players',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Método para limpar jogadores expirados
LobbyPlayer.cleanupExpired = async function() {
    const expired = await this.findAll({
        where: {
            expires_at: {
                [require('sequelize').Op.lt]: new Date()
            },
            status: 'searching'
        }
    });
    
    for (const player of expired) {
        await player.update({ status: 'expired' });
    }
    
    return expired.length;
};

// Método para buscar jogadores ativos
LobbyPlayer.getActive = async function() {
    await this.cleanupExpired();
    
    return await this.findAll({
        where: {
            status: 'searching',
            expires_at: {
                [require('sequelize').Op.gt]: new Date()
            }
        },
        order: [['created_at', 'DESC']]
    });
};

module.exports = LobbyPlayer;
