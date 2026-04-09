/**
 * PSO BRASIL - Discord Bot Central
 * Bot de Controle Visual para gerenciamento do site
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ==========================================
// CONFIGURAÇÃO
// ==========================================
const CONFIG = {
    BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    ADMIN_USER_ID: process.env.ADMIN_USER_ID || '123456789',
    ADMIN_ROLE_NAME: 'Admin',
    NEON_GREEN: '#00FF00',
    NEON_BLUE: '#0099FF',
    NEON_RED: '#FF4444',
    STAGING_URL: process.env.STAGING_URL || 'https://staging.psobrasil.com',
    PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://psobrasil.com',
    DATABASE_URL: process.env.DATABASE_URL
};

// ==========================================
// BANCO DE DADOS
// ==========================================
let sequelize;
let SiteConfig, SiteConfigStaging;

async function initializeDatabase() {
    try {
        // Conexão PostgreSQL
        sequelize = new Sequelize(CONFIG.DATABASE_URL, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            }
        });

        // Modelo de Configuração Oficial
        SiteConfig = sequelize.define('SiteConfig', {
            key: {
                type: DataTypes.STRING(100),
                primaryKey: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            type: {
                type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'color'),
                defaultValue: 'string'
            },
            category: {
                type: DataTypes.ENUM('appearance', 'content', 'feature', 'security'),
                defaultValue: 'content'
            },
            description: {
                type: DataTypes.STRING(255)
            },
            lastModifiedBy: {
                type: DataTypes.STRING(100)
            }
        }, {
            tableName: 'site_configs',
            timestamps: true,
            updatedAt: 'modified_at',
            createdAt: false
        });

        // Modelo de Configuração Staging
        SiteConfigStaging = sequelize.define('SiteConfigStaging', {
            key: {
                type: DataTypes.STRING(100),
                primaryKey: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            type: {
                type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'color'),
                defaultValue: 'string'
            },
            category: {
                type: DataTypes.ENUM('appearance', 'content', 'feature', 'security'),
                defaultValue: 'content'
            },
            description: {
                type: DataTypes.STRING(255)
            },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected'),
                defaultValue: 'pending'
            },
            proposedBy: {
                type: DataTypes.STRING(100)
            },
            proposedAt: {
                type: DataTypes.DATE,
                defaultValue: Sequelize.NOW
            }
        }, {
            tableName: 'site_configs_staging',
            timestamps: false
        });

        await sequelize.sync({ alter: true });
        
        // Inicializar configurações padrão
        await initializeDefaultConfigs();
        
        console.log('✅ Banco de dados conectado e tabelas sincronizadas');
    } catch (error) {
        console.error('❌ Erro ao conectar banco de dados:', error);
        throw error;
    }
}

async function initializeDefaultConfigs() {
    const defaults = [
        { key: 'hero_title', value: 'PSO BRASIL', type: 'string', category: 'content', description: 'Título principal do Hero' },
        { key: 'hero_subtitle', value: 'A MAIOR LIGA DE PRO SOCCER ONLINE DO BRASIL', type: 'string', category: 'content', description: 'Subtítulo do Hero' },
        { key: 'neon_color', value: '#22C55E', type: 'color', category: 'appearance', description: 'Cor principal neon do site' },
        { key: 'flag_animation', value: 'true', type: 'boolean', category: 'feature', description: 'Ativar/desativar animação da bandeira' },
        { key: 'imprensa_title', value: 'JORNAL PSO', type: 'string', category: 'content', description: 'Título da seção Imprensa' },
        { key: 'torneios_title', value: 'TORNEIOS PSO', type: 'string', category: 'content', description: 'Título da seção Torneios' },
        { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'security', description: 'Modo de manutenção' }
    ];

    for (const config of defaults) {
        await SiteConfig.findOrCreate({
            where: { key: config.key },
            defaults: config
        });
    }
}

// ==========================================
// CLIENT DISCORD
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// UTILITÁRIOS
// ==========================================
function isAdmin(interaction) {
    const member = interaction.member;
    const isUserAdmin = interaction.user.id === CONFIG.ADMIN_USER_ID;
    const hasAdminRole = member?.roles?.cache?.some(role => 
        role.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase()
    );
    return isUserAdmin || hasAdminRole;
}

function requireAdmin(interaction) {
    if (!isAdmin(interaction)) {
        interaction.reply({
            content: '⚠️ **ACESSO NEGADO**\n\nApenas administradores podem usar este comando.',
            ephemeral: true
        });
        return false;
    }
    return true;
}

async function captureScreenshot() {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        const siteUrl = CONFIG.PRODUCTION_URL;
        await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Aguardar renderização completa
        await page.waitForTimeout(2000);
        
        const screenshotPath = path.join(__dirname, 'screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        
        await browser.close();
        
        return screenshotPath;
    } catch (error) {
        console.error('Erro ao capturar screenshot:', error);
        return null;
    }
}

// ==========================================
// COMANDO /PAINEL-PSO
// ==========================================
async function handlePainelPSO(interaction) {
    if (!requireAdmin(interaction)) return;

    await interaction.deferReply();

    try {
        // Capturar screenshot do site
        const screenshotPath = await captureScreenshot();
        
        // Buscar configurações atuais
        const configs = await SiteConfig.findAll();
        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);

        // Criar embed principal
        const embed = new EmbedBuilder()
            .setTitle('🎮 PAINEL DE CONTROLE PSO BRASIL')
            .setDescription('Sistema de gerenciamento visual do site')
            .setColor(parseInt(CONFIG.NEON_GREEN.replace('#', ''), 16))
            .setImage('attachment://screenshot.png')
            .addFields(
                { 
                    name: '📊 Configurações Atuais', 
                    value: `
                    **Título Hero:** ${configMap.hero_title || 'N/A'}
                    **Cor Neon:** ${configMap.neon_color || '#22C55E'}
                    **Bandeira:** ${configMap.flag_animation === 'true' ? '✅ Ativa' : '❌ Inativa'}
                    **Manutenção:** ${configMap.maintenance_mode === 'true' ? '🔴 Ativa' : '🟢 Inativa'}
                    `,
                    inline: false 
                }
            )
            .setFooter({ 
                text: `Imprensa PSO • ${new Date().toLocaleString('pt-BR')}`, 
                iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' 
            });

        // Criar botões de ação
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_content')
                    .setLabel('📝 Editar Conteúdo')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('visual_settings')
                    .setLabel('🎨 Ajustes Visuais')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('apply_changes')
                    .setLabel('🚀 Aplicar Alterações')
                    .setStyle(ButtonStyle.Danger)
            );

        const files = screenshotPath ? [{ attachment: screenshotPath, name: 'screenshot.png' }] : [];

        await interaction.editReply({
            embeds: [embed],
            components: [row1],
            files: files
        });

    } catch (error) {
        console.error('Erro no painel:', error);
        await interaction.editReply({
            content: '❌ Erro ao carregar painel. Verifique os logs.',
            components: []
        });
    }
}

// ==========================================
// HANDLERS DE BOTÕES
// ==========================================
async function handleEditContent(interaction) {
    if (!requireAdmin(interaction)) return;

    const modal = new ModalBuilder()
        .setCustomId('edit_content_modal')
        .setTitle('Editar Conteúdo do Site');

    const heroTitleInput = new TextInputBuilder()
        .setCustomId('hero_title')
        .setLabel('Título do Hero (PSO BRASIL)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Digite o título principal...')
        .setMaxLength(50)
        .setRequired(false);

    const heroSubtitleInput = new TextInputBuilder()
        .setCustomId('hero_subtitle')
        .setLabel('Subtítulo do Hero')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Digite o subtítulo...')
        .setMaxLength(200)
        .setRequired(false);

    const imprensaTitleInput = new TextInputBuilder()
        .setCustomId('imprensa_title')
        .setLabel('Título da seção Imprensa')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('JORNAL PSO')
        .setRequired(false);

    const torneiosTitleInput = new TextInputBuilder()
        .setCustomId('torneios_title')
        .setLabel('Título da seção Torneios')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('TORNEIOS PSO')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(heroTitleInput),
        new ActionRowBuilder().addComponents(heroSubtitleInput),
        new ActionRowBuilder().addComponents(imprensaTitleInput),
        new ActionRowBuilder().addComponents(torneiosTitleInput)
    );

    await interaction.showModal(modal);
}

async function handleVisualSettings(interaction) {
    if (!requireAdmin(interaction)) return;

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('neon_color_select')
        .setPlaceholder('Selecione a cor Neon')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Verde Neon (Padrão)')
                .setValue('#22C55E')
                .setDescription('Cor verde vibrante')
                .setEmoji('🟢'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Azul Neon')
                .setValue('#0099FF')
                .setDescription('Cor azul elétrica')
                .setEmoji('🔵'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Vermelho Neon')
                .setValue('#FF4444')
                .setDescription('Cor vermelha intensa')
                .setEmoji('🔴'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Amarelo Neon')
                .setValue('#FACC15')
                .setDescription('Cor amarela vibrante')
                .setEmoji('🟡'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Roxo Neon')
                .setValue('#A855F7')
                .setDescription('Cor roxa elétrica')
                .setEmoji('🟣')
        );

    const flagToggle = new StringSelectMenuBuilder()
        .setCustomId('flag_toggle')
        .setPlaceholder('Animação da Bandeira')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Ativar Animação')
                .setValue('true')
                .setDescription('Bandeira balançando ao vento')
                .setEmoji('✅'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Desativar Animação')
                .setValue('false')
                .setDescription('Bandeira estática')
                .setEmoji('❌')
        );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(flagToggle);

    await interaction.reply({
        content: '🎨 **Ajustes Visuais**\n\nSelecione as opções desejadas:',
        components: [row1, row2],
        ephemeral: true
    });
}

async function handleApplyChanges(interaction) {
    if (!requireAdmin(interaction)) return;

    await interaction.reply({
        content: '⏳ **Processando alterações...**\n\nSalvando em staging para revisão.',
        ephemeral: true
    });

    try {
        // Buscar configurações pendentes (staging)
        const stagingConfigs = await SiteConfigStaging.findAll({
            where: { status: 'pending' }
        });

        if (stagingConfigs.length === 0) {
            await interaction.editReply({
                content: '⚠️ **Nenhuma alteração pendente**\n\nFaça alterações usando os botões de edição primeiro.'
            });
            return;
        }

        // Criar embed de confirmação
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🚀 ALTERAÇÕES EM STAGING')
            .setDescription('As seguintes alterações estão aguardando aprovação:')
            .setColor(parseInt(CONFIG.NEON_BLUE.replace('#', ''), 16))
            .addFields(
                stagingConfigs.map(c => ({
                    name: `${c.category.toUpperCase()}: ${c.key}`,
                    value: `**Novo valor:** ${c.value}\n**Proposto por:** ${c.proposedBy}`,
                    inline: false
                }))
            )
            .setFooter({ text: 'Confirme ou descarte as alterações' });

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_publish')
                    .setLabel('✅ CONFIRMAR PUBLICAÇÃO')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('discard_changes')
                    .setLabel('❌ DESCARTAR')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('view_staging')
                    .setLabel('🔗 Ver Staging')
                    .setStyle(ButtonStyle.Link)
                    .setURL(CONFIG.STAGING_URL)
            );

        await interaction.editReply({
            content: '📋 **Revisão de Alterações**',
            embeds: [confirmEmbed],
            components: [confirmRow]
        });

    } catch (error) {
        console.error('Erro ao aplicar alterações:', error);
        await interaction.editReply({
            content: '❌ Erro ao processar alterações.'
        });
    }
}

// ==========================================
// HANDLERS DE MODAIS E SELECTS
// ==========================================
async function handleModalSubmit(interaction) {
    if (interaction.customId === 'edit_content_modal') {
        const heroTitle = interaction.fields.getTextInputValue('hero_title');
        const heroSubtitle = interaction.fields.getTextInputValue('hero_subtitle');
        const imprensaTitle = interaction.fields.getTextInputValue('imprensa_title');
        const torneiosTitle = interaction.fields.getTextInputValue('torneios_title');

        // Salvar alterações em staging
        const updates = [
            { key: 'hero_title', value: heroTitle, category: 'content' },
            { key: 'hero_subtitle', value: heroSubtitle, category: 'content' },
            { key: 'imprensa_title', value: imprensaTitle, category: 'content' },
            { key: 'torneios_title', value: torneiosTitle, category: 'content' }
        ];

        for (const update of updates) {
            if (update.value) {
                await SiteConfigStaging.upsert({
                    key: update.key,
                    value: update.value,
                    type: 'string',
                    category: update.category,
                    status: 'pending',
                    proposedBy: interaction.user.tag,
                    proposedAt: new Date()
                });
            }
        }

        await interaction.reply({
            content: `✅ **Alterações salvas em staging!**\n\nUse o botão **🚀 Aplicar Alterações** no painel para revisar e publicar.`,
            ephemeral: true
        });
    }
}

async function handleSelectMenu(interaction) {
    if (interaction.customId === 'neon_color_select') {
        const color = interaction.values[0];
        
        await SiteConfigStaging.upsert({
            key: 'neon_color',
            value: color,
            type: 'color',
            category: 'appearance',
            status: 'pending',
            proposedBy: interaction.user.tag,
            proposedAt: new Date()
        });

        await interaction.reply({
            content: `🎨 **Cor Neon alterada para:** \`${color}\`\n\nAlteração salva em staging. Use **🚀 Aplicar Alterações** para publicar.`,
            ephemeral: true
        });
    }

    if (interaction.customId === 'flag_toggle') {
        const enabled = interaction.values[0];
        
        await SiteConfigStaging.upsert({
            key: 'flag_animation',
            value: enabled,
            type: 'boolean',
            category: 'feature',
            status: 'pending',
            proposedBy: interaction.user.tag,
            proposedAt: new Date()
        });

        const status = enabled === 'true' ? '✅ Ativada' : '❌ Desativada';
        await interaction.reply({
            content: `🇧🇷 **Animação da bandeira:** ${status}\n\nAlteração salva em staging.`,
            ephemeral: true
        });
    }
}

// ==========================================
// CONFIRMAÇÃO E PUBLICAÇÃO
// ==========================================
async function handleConfirmPublish(interaction) {
    if (!requireAdmin(interaction)) return;

    await interaction.reply({
        content: '⏳ **Publicando alterações...**',
        ephemeral: true
    });

    try {
        const stagingConfigs = await SiteConfigStaging.findAll({
            where: { status: 'pending' }
        });

        // Mover para configurações oficiais
        for (const staging of stagingConfigs) {
            await SiteConfig.upsert({
                key: staging.key,
                value: staging.value,
                type: staging.type,
                category: staging.category,
                lastModifiedBy: staging.proposedBy
            });

            // Marcar como aprovado
            await staging.update({ status: 'approved' });
        }

        // Limpar staging aprovado
        await SiteConfigStaging.destroy({
            where: { status: 'approved' }
        });

        await interaction.editReply({
            content: `✅ **Alterações publicadas com sucesso!**\n\n**${stagingConfigs.length}** configurações atualizadas no site oficial.`,
            embeds: []
        });

        // Notificar webhook #jornal-pso
        await notifyJornalPSO(interaction.user.tag, stagingConfigs);

    } catch (error) {
        console.error('Erro ao publicar:', error);
        await interaction.editReply({
            content: '❌ Erro ao publicar alterações.'
        });
    }
}

async function handleDiscardChanges(interaction) {
    if (!requireAdmin(interaction)) return;

    await SiteConfigStaging.destroy({
        where: { status: 'pending' }
    });

    await interaction.reply({
        content: '🗑️ **Alterações descartadas.**\n\nO staging foi limpo.',
        ephemeral: true
    });
}

// ==========================================
// NOTIFICAÇÃO WEBHOOK
// ==========================================
async function notifyJornalPSO(adminTag, configs) {
    try {
        const webhookUrl = process.env.JORNAL_WEBHOOK_URL;
        if (!webhookUrl) return;

        const changes = configs.map(c => `- ${c.key}: ${c.value}`).join('\n');

        const payload = {
            embeds: [{
                title: 'SITE ATUALIZADO',
                description: `O site PSO Brasil foi atualizado por **${adminTag}**`,
                color: parseInt(CONFIG.NEON_GREEN.replace('#', ''), 16),
                fields: [{
                    name: 'Alterações',
                    value: changes || 'Configurações atualizadas'
                }],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Imprensa PSO - Sistema de Notificações'
                }
            }]
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Erro ao notificar webhook:', error);
    }
}

// ==========================================
// EVENTOS DO BOT
// ==========================================
client.on('ready', async () => {
    console.log(`🤖 Bot logado como ${client.user.tag}`);
    
    // Inicializar banco de dados
    await initializeDatabase();
    
    // Registrar comandos
    const commands = [
        {
            name: 'painel-pso',
            description: 'Painel de controle visual do site PSO Brasil'
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ Comandos registrados');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // Slash commands
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'painel-pso') {
                await handlePainelPSO(interaction);
            }
        }

        // Botões
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'edit_content':
                    await handleEditContent(interaction);
                    break;
                case 'visual_settings':
                    await handleVisualSettings(interaction);
                    break;
                case 'apply_changes':
                    await handleApplyChanges(interaction);
                    break;
                case 'confirm_publish':
                    await handleConfirmPublish(interaction);
                    break;
                case 'discard_changes':
                    await handleDiscardChanges(interaction);
                    break;
            }
        }

        // Modais
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }

        // Select menus
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }

    } catch (error) {
        console.error('Erro na interação:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocorreu um erro ao processar sua solicitação.',
                ephemeral: true
            });
        }
    }
});

// ==========================================
// INICIAR BOT
// ==========================================
client.login(CONFIG.BOT_TOKEN).catch(error => {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
});

// Exportar para uso externo
module.exports = { client, SiteConfig, SiteConfigStaging };
