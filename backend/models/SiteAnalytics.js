/**
 * PSO Brasil - Site Analytics Model
 * Rastreamento de usuários e análise de comportamento
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    if (!sequelize) {
        throw new Error('Sequelize instance is required');
    }
    
    const SiteAnalytics = sequelize.define('SiteAnalytics', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ID do usuário se logado, null se visitante'
        },
        session_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'ID único da sessão'
        },
        page_visited: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Página/aba visitada (home, ranking, perfil, etc)'
        },
        entry_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'Horário de entrada na página'
        },
        exit_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Horário de saída da página'
        },
        device_type: {
            type: DataTypes.ENUM('mobile', 'desktop', 'tablet'),
            allowNull: false,
            defaultValue: 'desktop',
            comment: 'Tipo de dispositivo'
        },
        last_action: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Última ação do usuário antes de sair'
        },
        time_spent_seconds: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Tempo gasto na página em segundos'
        },
        referrer: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'De onde o usuário veio'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User agent do navegador'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'Endereço IP do usuário (anonymized)'
        },
        is_new_user: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Se é primeira visita do usuário'
        }
    }, {
        tableName: 'site_analytics',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
        // Indexes removidos - tabela já existe
    });

    return SiteAnalytics;
};
