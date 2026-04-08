const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuração do banco de dados PostgreSQL
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pro_soccer_online',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false,
            cert: process.env.SSL_CERT_PATH,
            key: process.env.SSL_KEY_PATH,
            ca: process.env.SSL_CA_PATH
        } : false
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
        await sequelize.authenticate();
        console.log('Conexão com PostgreSQL estabelecida com sucesso!');
        console.log(`Banco de dados: ${process.env.DB_NAME}`);
        console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    } catch (error) {
        console.error('Erro ao conectar com PostgreSQL:', error);
        process.exit(1);
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
