const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/database');
const jornalWebhookService = require('../services/jornalWebhookService');

const Noticia = sequelize.define('Noticia', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    conteudo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    categoria: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'COMUNICADO'
    },
    autor: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'REDAÇÃO PSO BRASIL'
    },
    imagem_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    enviado_discord: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'noticias',
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    hooks: {
        afterCreate: async (noticia, options) => {
            // Enviar notificação para o Discord automaticamente
            try {
                if (jornalWebhookService.isConfigured()) {
                    await jornalWebhookService.notificarJornalPSO(noticia.toJSON());
                    // Atualizar flag de envio
                    await noticia.update({ enviado_discord: true });
                }
            } catch (error) {
                console.error('[NOTICIA HOOK] Erro ao enviar para Discord:', error.message);
            }
        }
    }
});

module.exports = Noticia;
