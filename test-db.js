#!/usr/bin/env node
const { testConnection, syncDatabase, sequelize } = require('./db/database');

async function main() {
    console.log('='.repeat(60));
    console.log('🚀 TESTE DE CONEXÃO COM BANCO DE DADOS POSTGRESQL');
    console.log('='.repeat(60));
    
    // Test connection
    const connected = await testConnection();
    
    if (connected) {
        console.log('\n📦 Sincronizando modelos com o banco de dados...');
        await syncDatabase();
        console.log('\n✅ Tudo pronto! Banco de dados conectado e sincronizado.');
    } else {
        console.error('\n❌ Falha na conexão. Verifique as credenciais e certificados.');
        process.exit(1);
    }
    
    await sequelize.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
