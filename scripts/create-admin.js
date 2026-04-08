const { sequelize } = require('../db/database');
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        console.log('Conectando ao banco de dados...');
        await sequelize.authenticate();
        console.log('Conectado com sucesso!');

        console.log('Verificando se usuário admin já existe...');
        
        // Verificar se admin já existe
        const existingAdmin = await User.findOne({
            where: {
                username: 'admin'
            }
        });

        if (existingAdmin) {
            console.log('Usuário admin já existe!');
            console.log('Username: admin');
            console.log('Email:', existingAdmin.email);
            console.log('Role:', existingAdmin.role || 'admin');
            return;
        }

        console.log('Criando usuário admin...');

        // Hash da senha
        const adminPassword = 'admin123@2024';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Criar usuário admin
        const admin = await User.create({
            username: 'admin',
            email: 'admin@pro-soccer-online.com',
            password: hashedPassword,
            role: 'admin',
            rank: 9999,
            status: 'active',
            region: 'BR',
            isActive: true,
            profile: {
                firstName: 'System',
                lastName: 'Administrator',
                bio: 'Administrador do sistema Pro Soccer Online 2'
            },
            stats: {
                wins: 0,
                losses: 0,
                goals: 0,
                assists: 0,
                matches: 0
            },
            preferences: {
                theme: 'dark',
                language: 'pt-BR',
                notifications: true,
                sound: true,
                vibration: true
            }
        });

        console.log('Usuário admin criado com sucesso!');
        console.log('\n=== DADOS DE ACESSO ===');
        console.log('Username: admin');
        console.log('Password: admin123@2024');
        console.log('Email: admin@pro-soccer-online.com');
        console.log('Role: admin');
        console.log('======================');
        console.log('\nIMPORTANTE: Altere a senha após o primeiro login!');
        console.log('URL do painel: http://localhost:5001/admin');

    } catch (error) {
        console.error('Erro ao criar usuário admin:', error);
    } finally {
        await sequelize.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createAdminUser();
}

module.exports = createAdminUser;
