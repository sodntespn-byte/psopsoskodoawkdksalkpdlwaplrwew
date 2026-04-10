const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const Tournament = sequelize.define('Tournament', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            len: [1, 100]
        }
    },
    type: {
        type: DataTypes.ENUM('1v1', '3v3', '5v5', '11v11'),
        allowNull: false
    },
    prize: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'active', 'completed', 'cancelled'),
        defaultValue: 'upcoming'
    },
    maxParticipants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 2,
            max: 1024
        }
    },
    currentParticipants: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    description: {
        type: DataTypes.TEXT,
        maxLength: 500,
        defaultValue: ''
    },
    rules: {
        type: DataTypes.TEXT,
        maxLength: 1000,
        defaultValue: ''
    },
    format: {
        type: DataTypes.ENUM('knockout', 'league', 'group_stage', 'swiss'),
        defaultValue: 'knockout'
    },
    organizer: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    region: {
        type: DataTypes.ENUM('BR', 'US', 'EU', 'ASIA', 'AFRICA', 'GLOBAL'),
        defaultValue: 'BR'
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING(30)),
        defaultValue: []
    },
    minRank: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    maxRank: {
        type: DataTypes.INTEGER,
        defaultValue: 5000
    },
    minAge: {
        type: DataTypes.INTEGER,
        defaultValue: 13
    },
    regionRequirement: {
        type: DataTypes.ENUM('any', 'BR', 'US', 'EU', 'ASIA', 'AFRICA'),
        defaultValue: 'any'
    },
    totalParticipants: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.currentParticipants;
        }
    },
    isFull: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.currentParticipants >= this.maxParticipants;
        }
    },
    isOpen: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.status === 'upcoming' && !this.isFull;
        }
    },
    daysUntilStart: {
        type: DataTypes.VIRTUAL,
        get() {
            const now = new Date();
            const diff = this.startDate - now;
            return Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
    },
    duration: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.endDate && this.startDate) {
                return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
            }
            return 0;
        }
    },
    discordChannelId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    discordRoleId: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    discordAnnouncementId: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'tournaments',
    hooks: {
        beforeSave: (tournament) => {
            tournament.updatedAt = new Date();
        }
    }
    // Indexes removidos - tabela já existe
});

module.exports = Tournament;
