const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Square Cloud PostgreSQL Configuration - Hardcoded to bypass .env issues
const DATABASE_URL = 'postgresql://squarecloud:VDE1xJURx06DvYZtikq04Amr@square-cloud-db-ecd0071f6934489597ad31c462ce83f0.squareweb.app:7196';
console.log('📝 Usando DATABASE_URL configurada manualmente');

// SSL Certificate paths
const certsDir = path.join(__dirname, '..', 'certs');
let sslConfig = {
    require: true,
    rejectUnauthorized: false  // Always allow SSL without strict cert validation for Square Cloud
};

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
    console.log('ℹ️  Usando SSL sem certificados personalizados (modo Square Cloud)');
}

// Parse database URL manually to ensure correct dialect
const dbUrl = new URL(DATABASE_URL);
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 7196,
    database: dbUrl.pathname.replace('/', ''),
    username: dbUrl.username,
    password: dbUrl.password,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: sslConfig,
        connectTimeout: 60000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
        charset: 'utf8',
        collate: 'utf8_general_ci'
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
