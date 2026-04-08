const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 20],
            is: /^[a-zA-Z0-9_]+$/i
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            len: [6, 255]
        }
    },
    rank: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        validate: {
            min: 0,
            max: 5000
        }
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    goals: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    assists: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    region: {
        type: DataTypes.ENUM('BR', 'US', 'EU', 'ASIA', 'AFRICA'),
        defaultValue: 'BR'
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastLogin: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    avatar: {
        type: DataTypes.STRING(255),
        defaultValue: 'default'
    },
    bio: {
        type: DataTypes.TEXT,
        maxLength: 200,
        defaultValue: ''
    },
    favoriteTeam: {
        type: DataTypes.STRING(50),
        defaultValue: ''
    },
    playStyle: {
        type: DataTypes.ENUM('aggressive', 'balanced', 'defensive'),
        defaultValue: 'balanced'
    },
    totalMatches: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.wins + this.losses;
        }
    },
    winRate: {
        type: DataTypes.VIRTUAL,
        get() {
            const total = this.wins + this.losses;
            return total > 0 ? ((this.wins / total) * 100).toFixed(1) : 0;
        }
    },
    goalsPerMatch: {
        type: DataTypes.VIRTUAL,
        get() {
            const total = this.wins + this.losses;
            return total > 0 ? (this.goals / total).toFixed(2) : 0;
        }
    },
    assistsPerMatch: {
        type: DataTypes.VIRTUAL,
        get() {
            const total = this.wins + this.losses;
            return total > 0 ? (this.assists / total).toFixed(2) : 0;
        }
    },
    discordId: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: true
    },
    discordUsername: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    discordAvatar: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'users',
    hooks: {
        beforeSave: (user) => {
            user.updatedAt = new Date();
        }
    },
    indexes: [
        { fields: ['username'] },
        { fields: ['email'] },
        { fields: ['rank'] },
        { fields: ['region'] },
        { fields: ['isOnline'] },
        { fields: ['discordId'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = User;
