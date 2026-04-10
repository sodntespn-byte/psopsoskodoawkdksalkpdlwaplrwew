/**
 * Database Sync Script
 * Sincroniza todas as tabelas do banco de dados
 */

const { sequelize } = require('../server');
const models = require('../models');

async function syncDatabase() {
    try {
        console.log('🔄 Iniciando sincronização do banco de dados...');
        
        // Sincronizar todos os modelos
        await sequelize.sync({ alter: true });
        
        console.log('✅ Banco de dados sincronizado com sucesso!');
        console.log('📊 Tabelas criadas/atualizadas:');
        
        // Listar tabelas
        const [results] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
        results.forEach(row => {
            console.log(`   • ${row.tablename}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao sincronizar banco de dados:', error);
        process.exit(1);
    }
}

syncDatabase();
