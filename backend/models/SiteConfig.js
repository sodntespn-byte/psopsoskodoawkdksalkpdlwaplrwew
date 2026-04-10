const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SiteConfig = sequelize.define('SiteConfig', {
        key: {
            type: DataTypes.STRING(100),
            primaryKey: true
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'color'),
            defaultValue: 'string'
        },
        category: {
            type: DataTypes.ENUM('appearance', 'content', 'feature', 'security'),
            defaultValue: 'content'
        },
        description: {
            type: DataTypes.STRING(255)
        },
        lastModifiedBy: {
            type: DataTypes.STRING(100)
        }
    }, {
        tableName: 'site_configs',
        timestamps: true,
        updatedAt: 'modified_at',
        createdAt: false
    });

    return SiteConfig;
};
