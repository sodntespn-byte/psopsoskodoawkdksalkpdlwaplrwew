const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// DATABASE_URL configurada diretamente para Square Cloud
const DATABASE_URL = 'postgresql://squarecloud:t6eNrMqqk2z5Nx4pklIRA07T@square-cloud-db-ecd0071f6934489597ad31c462ce83f0.squareweb.app:7196/squarecloud';

console.log('📝 Usando DATABASE_URL configurada no código');

// SSL Certificate paths for Square Cloud PostgreSQL
const certsDir = path.join(__dirname, '..', 'certs');
let sslConfig = {};

try {
    const ca = fs.readFileSync(path.join(certsDir, 'ca-certificate.crt')).toString();
    const cert = fs.readFileSync(path.join(certsDir, 'certificate.pem')).toString();
    const key = fs.readFileSync(path.join(certsDir, 'private-key.key')).toString();
    
    sslConfig = {
        require: true,
        rejectUnauthorized: true,
        ca,
        cert,
        key
    };
    console.log('✅ Certificados SSL carregados com sucesso');
} catch (err) {
    console.log('⚠️  Certificados não encontrados, usando SSL sem verificação');
    sslConfig = {
        require: true,
        rejectUnauthorized: false
    };
}

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
        ssl: sslConfig
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
