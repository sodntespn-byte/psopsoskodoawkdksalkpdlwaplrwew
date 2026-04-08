const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get DATABASE_URL from environment variable (configured in Square Cloud dashboard)
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada! Configure no painel da Square Cloud.');
    console.error('   Vá em: Dashboard → Seu App → Variables → Adicionar DATABASE_URL');
    process.exit(1);
}

// Remove sslmode from URL if present to avoid conflicts with dialectOptions
DATABASE_URL = DATABASE_URL.replace(/\?sslmode=[^&]+/, '').replace(/&sslmode=[^&]+/, '');

console.log('📝 Usando DATABASE_URL das variáveis de ambiente');

// For Square Cloud PostgreSQL with self-signed certificates
// We need to disable certificate verification completely
const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
            ca: null,
            key: null,
            cert: null
        }
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

// Testar conexão
async function testConnection() {
    try {
        console.log('🔌 Tentando conectar ao PostgreSQL...');
        console.log(`📍 URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
        
        await sequelize.authenticate();
        
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        console.log(`📊 Banco de dados conectado via Square Cloud`);
        
        // Test query to verify connection
        const [results] = await sequelize.query('SELECT NOW() as current_time, version() as version');
        console.log(`🕐 Server Time: ${results[0].current_time}`);
        console.log(`🐘 PostgreSQL Version: ${results[0].version}`);
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
        console.error('Detalhes:', error);
        return false;
    }
}

// Sincronizar modelos
async function syncDatabase() {
    try {
        await sequelize.sync({ force: false, alter: true });
        console.log('Banco de dados sincronizado com sucesso!');
    } catch (error) {
        console.error('Erro ao sincronizar banco de dados:', error);
    }
}

module.exports = {
    sequelize,
    testConnection,
    syncDatabase
};
