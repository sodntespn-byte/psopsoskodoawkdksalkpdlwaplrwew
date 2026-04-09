const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');

module.exports = (sequelize) => {
    const SiteSetting = sequelize.define('SiteSetting', {
        key: {
            type: DataTypes.STRING(100),
            primaryKey: true,
            allowNull: false
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
            defaultValue: 'string',
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        category: {
            type: DataTypes.ENUM('general', 'appearance', 'security', 'notifications'),
            defaultValue: 'general',
            allowNull: false
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    }, {
        tableName: 'site_settings',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['key']
            },
            {
                fields: ['category']
            }
        ]
    });

    // Método estático para obter configuração
    SiteSetting.getSetting = async function(key, defaultValue = null) {
        try {
            const setting = await this.findByPk(key);
            return setting ? this.parseValue(setting.value, setting.type) : defaultValue;
        } catch (error) {
            console.error(`Erro ao obter configuração ${key}:`, error);
            return defaultValue;
        }
    };

    // Método estático para definir configuração
    SiteSetting.setSetting = async function(key, value, type = 'string', description = null, category = 'general', isPublic = false) {
        try {
            const stringValue = this.stringifyValue(value, type);
            
            await this.upsert({
                key,
                value: stringValue,
                type,
                description,
                category,
                isPublic
            });

            return true;
        } catch (error) {
            console.error(`Erro ao definir configuração ${key}:`, error);
            return false;
        }
    };

    // Método estático para obter múltiplas configurações
    SiteSetting.getSettings = async function(keys = []) {
        try {
            const settings = await this.findAll({
                where: keys.length > 0 ? { key: keys } : {},
                order: [['category', 'ASC'], ['key', 'ASC']]
            });

            const result = {};
            settings.forEach(setting => {
                result[setting.key] = this.parseValue(setting.value, setting.type);
            });

            return result;
        } catch (error) {
            console.error('Erro ao obter configurações:', error);
            return {};
        }
    };

    // Método estático para obter configurações públicas
    SiteSetting.getPublicSettings = async function() {
        try {
            const settings = await this.findAll({
                where: { isPublic: true },
                order: [['category', 'ASC'], ['key', 'ASC']]
            });

            const result = {};
            settings.forEach(setting => {
                result[setting.key] = this.parseValue(setting.value, setting.type);
            });

            return result;
        } catch (error) {
            console.error('Erro ao obter configurações públicas:', error);
            return {};
        }
    };

    // Método para converter valor para string
    SiteSetting.stringifyValue = function(value, type) {
        switch (type) {
            case 'boolean':
                return value ? 'true' : 'false';
            case 'number':
                return value.toString();
            case 'json':
                return JSON.stringify(value);
            default:
                return value.toString();
        }
    };

    // Método para converter string para valor
    SiteSetting.parseValue = function(value, type) {
        if (value === null || value === undefined) return null;

        switch (type) {
            case 'boolean':
                return value === 'true';
            case 'number':
                return parseFloat(value);
            case 'json':
                try {
                    return JSON.parse(value);
                } catch (e) {
                    return null;
                }
            default:
                return value;
        }
    };

    // Inicializar configurações padrão
    SiteSetting.initializeDefaults = async function() {
        const defaultSettings = [
            {
                key: 'site_name',
                value: 'PSO Brasil',
                type: 'string',
                description: 'Nome do site',
                category: 'general',
                isPublic: true
            },
            {
                key: 'primary_color',
                value: '#00FF00',
                type: 'string',
                description: 'Cor principal do neon',
                category: 'appearance',
                isPublic: true
            },
            {
                key: 'flag_animation_enabled',
                value: 'true',
                type: 'boolean',
                description: 'Ativar animação da bandeira',
                category: 'appearance',
                isPublic: true
            },
            {
                key: 'hero_logo_url',
                value: '/images/logo.png',
                type: 'string',
                description: 'URL da logo do hero',
                category: 'appearance',
                isPublic: true
            },
            {
                key: 'discord_webhook_enabled',
                value: 'true',
                type: 'boolean',
                description: 'Ativar notificações Discord',
                category: 'notifications',
                isPublic: false
            },
            {
                key: 'maintenance_mode',
                value: 'false',
                type: 'boolean',
                description: 'Modo de manutenção',
                category: 'security',
                isPublic: false
            }
        ];

        for (const setting of defaultSettings) {
            await this.setSetting(
                setting.key,
                setting.value,
                setting.type,
                setting.description,
                setting.category,
                setting.isPublic
            );
        }
    };

    return SiteSetting;
};
