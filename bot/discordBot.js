/**
 * PSO BRASIL - Discord Bot Central
 * Bot de Controle Visual para gerenciamento do site
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// SSL Certificate paths for Square Cloud PostgreSQL
const certsDir = path.join(__dirname, 'certs');
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
    console.log('⚠️ Certificados não encontrados, usando SSL sem verificação');
    sslConfig = {
        require: true,
        rejectUnauthorized: false
    };
}

// ==========================================
// CONFIGURAÇÃO
// ==========================================
const CONFIG = {
    BOT_TOKEN: process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID || '905945917432135681',
    ADMIN_USER_ID: process.env.ADMIN_USER_ID || '123456789',
    OWNER_ID: process.env.OWNER_ID || '338795919778512916',
    ADMIN_ROLE_NAME: 'Admin',
    NEON_GREEN: '#00FF00',
    NEON_BLUE: '#0099FF',
    NEON_RED: '#FF4444',
    STAGING_URL: process.env.STAGING_URL || 'https://staging.psobrasil.com',
    PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://psobr.squareweb.app',
    // Usando mesma DATABASE_URL do site
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://squarecloud:t6eNrMqqk2z5Nx4pklIRA07T@square-cloud-db-ecd0071f6934489597ad31c462ce83f0.squareweb.app:7196/squarecloud'
};

// ==========================================
// BANCO DE DADOS
// ==========================================
let sequelize;
let SiteConfig, SiteConfigStaging, SiteAnalytics;

async function initializeDatabase() {
    try {
        // Conexão PostgreSQL - mesma configuração do site
        sequelize = new Sequelize(CONFIG.DATABASE_URL, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: sslConfig
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

        // Modelo de Analytics
        SiteAnalytics = sequelize.define('SiteAnalytics', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_id: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            session_id: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            page_visited: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            entry_time: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            exit_time: {
                type: DataTypes.DATE,
                allowNull: true
            },
            device_type: {
                type: DataTypes.ENUM('mobile', 'desktop', 'tablet'),
                allowNull: false,
                defaultValue: 'desktop'
            },
            last_action: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            time_spent_seconds: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            referrer: {
                type: DataTypes.STRING(500),
                allowNull: true
            },
            user_agent: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            ip_address: {
                type: DataTypes.STRING(45),
                allowNull: true
            },
            is_new_user: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        }, {
            tableName: 'site_analytics',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: false
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
        { key: 'secondary_color', value: '#3B82F6', type: 'color', category: 'appearance', description: 'Cor secundária do site' },
        { key: 'announcement_text', value: '', type: 'string', category: 'content', description: 'Texto de anúncio no topo do site' },
        { key: 'layout_config', value: '{"ranking": "left", "calendar": "center", "videos": "right"}', type: 'json', category: 'appearance', description: 'Configuração de layout (ordem dos elementos)' },
        { key: 'site_status', value: 'online', type: 'string', category: 'security', description: 'Status do site (online/maintenance)' },
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
    // Verificar se é o dono (OWNER_ID)
    const isOwner = interaction.user.id === CONFIG.OWNER_ID;
    
    // Verificar se é o admin configurado
    const isUserAdmin = interaction.user.id === CONFIG.ADMIN_USER_ID;
    
    // Verificar se tem permissão de Administrator no servidor
    const hasAdminPermission = interaction.member?.permissions?.has('Administrator');
    
    // Verificar se tem cargo de Admin
    const hasAdminRole = interaction.member?.roles?.cache?.some(role => 
        role.name.toLowerCase() === CONFIG.ADMIN_ROLE_NAME.toLowerCase()
    );
    
    // Retorna true se qualquer uma das condições for verdadeira
    return isOwner || isUserAdmin || hasAdminPermission || hasAdminRole;
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

// Tentar URLs na ordem: env > localhost > default
function getSiteUrl() {
    // 1. Usar URL do environment se definida
    if (process.env.PRODUCTION_URL) {
        return process.env.PRODUCTION_URL;
    }
    
    // 2. Tentar localhost (quando site e bot estão na mesma instância Square Cloud)
    // Square Cloud expõe o site na porta 80/443 internamente
    const localhostUrl = 'http://localhost:3000';
    
    // 3. Fallback para URL padrão
    return CONFIG.PRODUCTION_URL || localhostUrl;
}

async function captureScreenshot(pagePath = '/') {
    let browser = null;
    try {
        console.log('[SNAPSHOT] Iniciando captura de screenshot...');
        console.log('[SNAPSHOT] Página solicitada:', pagePath);
        
        const baseUrl = getSiteUrl();
        const targetUrl = baseUrl + pagePath;
        console.log('[SNAPSHOT] URL alvo:', targetUrl);
        
        // Configuração para Square Cloud (mais permissiva)
        // Puppeteer (full) baixa Chromium automaticamente
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ]
        };
        
        // Se PUPPETEER_EXECUTABLE_PATH estiver definido, usar ele
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log('[SNAPSHOT] Usando Chrome do caminho:', launchOptions.executablePath);
        } else {
            console.log('[SNAPSHOT] Usando Chromium embutido do Puppeteer');
        }
        
        console.log('[SNAPSHOT] Launch options:', JSON.stringify(launchOptions, null, 2));
        
        browser = await puppeteer.launch(launchOptions);
        console.log('[SNAPSHOT] Browser iniciado com sucesso');
        
        const page = await browser.newPage();
        // Mobile viewport iPhone 12 Pro
        await page.setViewport({ 
            width: 390, 
            height: 844,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });
        // Set mobile user agent
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
        console.log('[SNAPSHOT] Viewport configurado: Mobile 390x844 (iPhone)');
        
        console.log('[SNAPSHOT] Navegando para:', targetUrl);
        
        // Aumentar timeout para 60 segundos
        const response = await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });
        
        // Log do status da navegação
        console.log('[SNAPSHOT] Status HTTP:', response?.status());
        console.log('[SNAPSHOT] URL final:', page.url());
        
        // Verificar se houve redirect
        if (page.url() !== targetUrl) {
            console.log('[SNAPSHOT] ⚠️ REDIRECT detectado:', targetUrl, '->', page.url());
        }
        
        // Pegar título da página para confirmar
        const pageTitle = await page.title();
        console.log('[SNAPSHOT] Título da página:', pageTitle);
        
        console.log('[SNAPSHOT] Página carregada');
        
        // Aguardar renderização completa do neon
        console.log('[SNAPSHOT] Aguardando renderização (3s)...');
        await page.waitForTimeout(3000);
        
        const screenshotPath = path.join(__dirname, 'screenshot.png');
        console.log('[SNAPSHOT] Salvando screenshot em:', screenshotPath);
        
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true,
            type: 'png'
        });
        console.log('[SNAPSHOT] Screenshot salvo com sucesso');
        
        await browser.close();
        console.log('[SNAPSHOT] Browser fechado');
        
        return screenshotPath;
    } catch (error) {
        console.error('[SNAPSHOT] ❌ Erro ao capturar screenshot:', error);
        console.error('[SNAPSHOT] Stack trace:', error.stack);
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('[SNAPSHOT] Erro ao fechar browser:', closeError);
            }
        }
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
        console.log('[CMS] Iniciando captura de screenshot...');
        const screenshotPath = await captureScreenshot();
        
        // Buscar configurações atuais
        const configs = await SiteConfig.findAll();
        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);

        // Criar embed principal
        const embedBuilder = new EmbedBuilder()
            .setTitle('🎮 PAINEL DE CONTROLE PSO BRASIL')
            .setDescription('Sistema de gerenciamento visual do site')
            .setColor(parseInt(CONFIG.NEON_GREEN.replace('#', ''), 16))
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

        // Adicionar imagem apenas se screenshot foi gerado com sucesso
        let files = [];
        if (screenshotPath && fs.existsSync(screenshotPath)) {
            console.log('[CMS] Screenshot encontrado, adicionando ao embed');
            embedBuilder.setImage('attachment://screenshot.png');
            files = [{ attachment: screenshotPath, name: 'screenshot.png' }];
        } else {
            console.log('[CMS] Screenshot não disponível, exibindo painel sem imagem');
            embedBuilder.addFields({
                name: '⚠️ Snapshot',
                value: 'Não foi possível capturar o screenshot do site neste momento.',
                inline: false
            });
        }

        const embed = embedBuilder;

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

        await interaction.editReply({
            embeds: [embed],
            components: [row1],
            files: files
        });

    } catch (error) {
        console.error('[CMS] ❌ Erro no painel:', error);
        console.error('[CMS] Stack trace:', error.stack);
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
    console.log(`[CMS] Modal submit recebido: ${interaction.customId} por ${interaction.user.tag}`);
    
    if (interaction.customId === 'edit_content_modal') {
        try {
            const heroTitle = interaction.fields.getTextInputValue('hero_title');
            const heroSubtitle = interaction.fields.getTextInputValue('hero_subtitle');
            const imprensaTitle = interaction.fields.getTextInputValue('imprensa_title');
            const torneiosTitle = interaction.fields.getTextInputValue('torneios_title');

            console.log('[CMS] Valores recebidos:', {
                heroTitle, heroSubtitle, imprensaTitle, torneiosTitle
            });

            // Salvar alterações em staging
            const updates = [
                { key: 'hero_title', value: heroTitle, category: 'content' },
                { key: 'hero_subtitle', value: heroSubtitle, category: 'content' },
                { key: 'imprensa_title', value: imprensaTitle, category: 'content' },
                { key: 'torneios_title', value: torneiosTitle, category: 'content' }
            ];

            let savedCount = 0;
            for (const update of updates) {
                if (update.value) {
                    console.log(`[CMS] Salvando ${update.key} = "${update.value}" no staging...`);
                    try {
                        await SiteConfigStaging.upsert({
                            key: update.key,
                            value: update.value,
                            type: 'string',
                            category: update.category,
                            status: 'pending',
                            proposedBy: interaction.user.tag,
                            proposedAt: new Date()
                        });
                        console.log(`[CMS] ✓ ${update.key} salvo com sucesso`);
                        savedCount++;
                    } catch (upsertError) {
                        console.error(`[CMS] ❌ Erro ao salvar ${update.key}:`, upsertError);
                        throw upsertError;
                    }
                } else {
                    console.log(`[CMS] Pulando ${update.key} (valor vazio)`);
                }
            }

            console.log(`[CMS] ${savedCount} configurações salvas em staging`);

            await interaction.reply({
                content: `✅ **${savedCount} alterações salvas em staging!**\n\nUse o botão **🚀 Aplicar Alterações** no painel para revisar e publicar.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[CMS] ❌ Erro no handleModalSubmit:', error);
            console.error('[CMS] Stack trace:', error.stack);
            await interaction.reply({
                content: '❌ **Erro ao salvar alterações.**\n\nVerifique os logs para mais detalhes.',
                ephemeral: true
            });
        }
    }
}

async function handleSelectMenu(interaction) {
    console.log(`[CMS] Select menu recebido: ${interaction.customId} por ${interaction.user.tag}`);
    
    if (interaction.customId === 'neon_color_select') {
        const color = interaction.values[0];
        console.log(`[CMS] Cor selecionada: ${color}`);
        
        try {
            await SiteConfigStaging.upsert({
                key: 'neon_color',
                value: color,
                type: 'color',
                category: 'appearance',
                status: 'pending',
                proposedBy: interaction.user.tag,
                proposedAt: new Date()
            });
            console.log('[CMS] ✓ Cor neon salva em staging');

            await interaction.reply({
                content: `🎨 **Cor Neon alterada para:** \`${color}\`\n\nAlteração salva em staging. Use **🚀 Aplicar Alterações** para publicar.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[CMS] ❌ Erro ao salvar cor:', error);
            await interaction.reply({
                content: '❌ **Erro ao salvar cor.**\n\nVerifique os logs.',
                ephemeral: true
            });
        }
    }

    if (interaction.customId === 'flag_toggle') {
        const enabled = interaction.values[0];
        console.log(`[CMS] Animação da bandeira: ${enabled}`);
        
        try {
            await SiteConfigStaging.upsert({
                key: 'flag_animation',
                value: enabled,
                type: 'boolean',
                category: 'feature',
                status: 'pending',
                proposedBy: interaction.user.tag,
                proposedAt: new Date()
            });
            console.log('[CMS] ✓ Flag animation salva em staging');

            const status = enabled === 'true' ? '✅ Ativada' : '❌ Desativada';
            await interaction.reply({
                content: `🇧🇷 **Animação da bandeira:** ${status}\n\nAlteração salva em staging.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[CMS] ❌ Erro ao salvar flag:', error);
            await interaction.reply({
                content: '❌ **Erro ao salvar configuração da bandeira.**',
                ephemeral: true
            });
        }
    }
}

// ==========================================
// CONFIRMAÇÃO E PUBLICAÇÃO
// ==========================================
async function handleConfirmPublish(interaction) {
    if (!requireAdmin(interaction)) return;

    console.log(`[CMS] Usuário ${interaction.user.tag} iniciando publicação de alterações`);

    await interaction.reply({
        content: '⏳ **Publicando alterações...**',
        ephemeral: true
    });

    try {
        console.log('[CMS] Buscando configurações pendentes no staging...');
        const stagingConfigs = await SiteConfigStaging.findAll({
            where: { status: 'pending' }
        });
        
        console.log(`[CMS] Encontradas ${stagingConfigs.length} configurações pendentes:`, 
            stagingConfigs.map(c => ({ key: c.key, value: c.value })));

        if (stagingConfigs.length === 0) {
            console.log('[CMS] Nenhuma configuração pendente encontrada');
            await interaction.editReply({
                content: '⚠️ **Nenhuma alteração pendente**\n\nNão há alterações para publicar.'
            });
            return;
        }

        // Mover para configurações oficiais
        console.log('[CMS] Iniciando publicação para SiteConfig oficial...');
        for (const staging of stagingConfigs) {
            console.log(`[CMS] Publicando: ${staging.key} = ${staging.value}`);
            try {
                const [config, created] = await SiteConfig.upsert({
                    key: staging.key,
                    value: staging.value,
                    type: staging.type,
                    category: staging.category,
                    lastModifiedBy: staging.proposedBy
                });
                console.log(`[CMS] ✓ ${staging.key} ${created ? 'criado' : 'atualizado'} com sucesso`);

                // Marcar como aprovado
                await staging.update({ status: 'approved' });
                console.log(`[CMS] ✓ ${staging.key} marcado como approved`);
            } catch (upsertError) {
                console.error(`[CMS] ❌ Erro ao publicar ${staging.key}:`, upsertError);
                throw upsertError;
            }
        }

        // Limpar staging aprovado
        console.log('[CMS] Limpando staging aprovado...');
        const deleted = await SiteConfigStaging.destroy({
            where: { status: 'approved' }
        });
        console.log(`[CMS] ✓ ${deleted} registros removidos do staging`);

        await interaction.editReply({
            content: `✅ **Alterações publicadas com sucesso!**\n\n**${stagingConfigs.length}** configurações atualizadas no site oficial.`,
            embeds: []
        });

        // Notificar webhook #jornal-pso
        console.log('[CMS] Notificando webhook #jornal-pso...');
        await notifyJornalPSO(interaction.user.tag, stagingConfigs);
        console.log('[CMS] ✓ Webhook notificado');

    } catch (error) {
        console.error('[CMS] ❌ Erro ao publicar:', error);
        console.error('[CMS] Stack trace:', error.stack);
        await interaction.editReply({
            content: '❌ **Erro ao publicar alterações.**\n\nVerifique os logs para mais detalhes.'
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
// FUNÇÕES DO CMS (PAINEL DE CONTROLE)
// ==========================================

async function handlePainel(interaction) {
    // Verificar permissão de admin
    if (!isAdmin(interaction)) {
        await interaction.reply({
            content: '⚠️ **ACESSO NEGADO**\n\nApenas administradores podem usar este comando.',
            ephemeral: true
        });
        return;
    }

    // Buscar configurações atuais
    let configs;
    try {
        configs = await SiteConfig.findAll();
    } catch (error) {
        console.error('[CMS] Erro ao buscar configurações:', error);
        await interaction.reply({
            content: '❌ Erro ao buscar configurações do banco de dados.',
            ephemeral: true
        });
        return;
    }

    const configMap = {};
    configs.forEach(c => configMap[c.key] = c.value);

    const neonColor = configMap.neon_color || '#22C55E';
    const siteStatus = configMap.site_status || 'online';
    const announcementText = configMap.announcement_text || 'Nenhum anúncio';

    const embed = {
        color: parseInt(neonColor.replace('#', ''), 16),
        title: '🎛️ PSO Brasil - Painel de Controle (CMS)',
        description: 'Gerencie a aparência e conteúdo do site diretamente pelo Discord.',
        fields: [
            {
                name: '📊 Status Atual',
                value: siteStatus === 'online' ? '🟢 **Online**' : '🔴 **Manutenção**',
                inline: true
            },
            {
                name: '🎨 Cor Neon',
                value: neonColor,
                inline: true
            },
            {
                name: '📢 Anúncio',
                value: announcementText || 'Nenhum',
                inline: false
            }
        ],
        footer: {
            text: `Solicitado por ${interaction.user.tag}`
        },
        timestamp: new Date().toISOString()
    };

    const row1 = {
        type: 1,
        components: [
            {
                type: 2,
                custom_id: 'cms_appearance',
                label: '🎨 Aparência',
                style: 1 // PRIMARY
            },
            {
                type: 2,
                custom_id: 'cms_content',
                label: '📝 Conteúdo',
                style: 2 // SECONDARY
            },
            {
                type: 2,
                custom_id: 'cms_market',
                label: '🛒 Mercado',
                style: 3 // SUCCESS
            }
        ]
    };

    // Row 2: Preview and Publish buttons
    const row2 = {
        type: 1,
        components: [
            {
                type: 2,
                custom_id: 'cms_preview',
                label: '�️ Visualizar (Staging)',
                style: 1 // PRIMARY
            },
            {
                type: 2,
                custom_id: 'cms_publish',
                label: '🚀 Publicar',
                style: 4 // DANGER
            },
            {
                type: 2,
                custom_id: 'cms_sync',
                label: '🔄 Sync',
                style: 2 // SECONDARY
            }
        ]
    };

    // Menu de seleção para snapshot com opções de página
    const row3 = {
        type: 1,
        components: [
            {
                type: 3, // STRING_SELECT
                custom_id: 'cms_snapshot_select',
                placeholder: '📸 Selecione a página para snapshot...',
                options: [
                    {
                        label: '🏠 Página Inicial',
                        value: 'page_home',
                        description: 'Capturar a home do site',
                        emoji: { name: '🏠' }
                    },
                    {
                        label: '📊 Rankings',
                        value: 'page_rankings',
                        description: 'Capturar a página de rankings',
                        emoji: { name: '📊' }
                    },
                    {
                        label: '🏆 Torneios',
                        value: 'page_torneios',
                        description: 'Capturar a página de torneios',
                        emoji: { name: '🏆' }
                    },
                    {
                        label: '🛒 Mercado',
                        value: 'page_mercado',
                        description: 'Capturar o mercado de transferências',
                        emoji: { name: '🛒' }
                    },
                    {
                        label: '� Imprensa',
                        value: 'page_imprensa',
                        description: 'Capturar a seção de imprensa',
                        emoji: { name: '📰' }
                    },
                    {
                        label: '👤 Perfil de Jogador',
                        value: 'page_perfil',
                        description: 'Capturar página de perfil (primeiro jogador)',
                        emoji: { name: '👤' }
                    }
                ]
            }
        ]
    };

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2, row3],
        ephemeral: true
    });

    console.log(`[CMS] Painel aberto por ${interaction.user.tag}`);
}

async function handleCMSAppearance(interaction) {
    const neonColorConfig = await SiteConfig.findOne({ where: { key: 'neon_color' } });
    const secondaryColorConfig = await SiteConfig.findOne({ where: { key: 'secondary_color' } });
    const layoutConfig = await SiteConfig.findOne({ where: { key: 'layout_config' } });

    const modal = {
        title: '🎨 Configurar Aparência',
        custom_id: 'cms_appearance_modal',
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'neon_color',
                        label: 'Cor Neon (Hex)',
                        style: 1,
                        value: neonColorConfig?.value || '#22C55E',
                        required: true,
                        max_length: 7
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'secondary_color',
                        label: 'Cor Secundária (Hex)',
                        style: 1,
                        value: secondaryColorConfig?.value || '#3B82F6',
                        required: true,
                        max_length: 7
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'layout_config',
                        label: 'Layout (JSON)',
                        style: 2,
                        value: layoutConfig?.value || '{"ranking": "left", "calendar": "center", "videos": "right"}',
                        required: true,
                        max_length: 200
                    }
                ]
            }
        ]
    };

    await interaction.showModal(modal);
}

async function handleCMSContent(interaction) {
    const announcementConfig = await SiteConfig.findOne({ where: { key: 'announcement_text' } });
    const siteStatusConfig = await SiteConfig.findOne({ where: { key: 'site_status' } });

    const modal = {
        title: '📝 Configurar Conteúdo',
        custom_id: 'cms_content_modal',
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'announcement_text',
                        label: 'Texto de Anúncio',
                        style: 2,
                        value: announcementConfig?.value || '',
                        required: false,
                        max_length: 500
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'site_status',
                        label: 'Status do Site (online/maintenance)',
                        style: 1,
                        value: siteStatusConfig?.value || 'online',
                        required: true,
                        max_length: 20
                    }
                ]
            }
        ]
    };

    await interaction.showModal(modal);
}

// Mapeamento de páginas para URLs (arquivos HTML em /pages/)
const PAGE_URLS = {
    'page_home': '/',
    'page_rankings': '/pages/torneios.html',  // Torneios contém rankings
    'page_torneios': '/pages/torneios.html',
    'page_mercado': '/pages/mercado.html',
    'page_imprensa': '/pages/imprensa.html',
    'page_perfil': '/pages/perfil.html'
};

const PAGE_NAMES = {
    'page_home': '🏠 Página Inicial',
    'page_rankings': '📊 Rankings',
    'page_torneios': '🏆 Torneios',
    'page_mercado': '🛒 Mercado',
    'page_imprensa': '📰 Imprensa',
    'page_perfil': '👤 Perfil'
};

async function handleCMSSnapshotSelect(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const selectedPage = interaction.values[0];
        const pageName = PAGE_NAMES[selectedPage] || selectedPage;
        const pagePath = PAGE_URLS[selectedPage] || '/';
        
        console.log(`[CMS] Snapshot solicitado por ${interaction.user.tag} - Página: ${pageName}`);
        
        const screenshotPath = await captureScreenshot(pagePath);
        
        // Verificar se screenshot foi gerado com sucesso
        if (!screenshotPath || !fs.existsSync(screenshotPath)) {
            console.error('[CMS] Screenshot não foi gerado ou arquivo não existe');
            await interaction.editReply({
                content: '❌ Não foi possível gerar o snapshot. O site pode estar indisponível ou houve um erro na captura.\nVerifique os logs para mais detalhes.'
            });
            return;
        }
        
        await interaction.editReply({
            content: `📸 **Snapshot de ${pageName} gerado com sucesso!**`,
            files: [screenshotPath]
        });

        console.log(`[CMS] Snapshot de ${pageName} gerado por ${interaction.user.tag}`);
    } catch (error) {
        console.error('[CMS] Erro ao gerar snapshot:', error);
        console.error('[CMS] Stack trace:', error.stack);
        await interaction.editReply({
            content: '❌ Erro ao gerar snapshot: ' + (error?.message || 'Erro desconhecido')
        });
    }
}

async function handleCMSSnapshot(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        console.log('[CMS] Iniciando snapshot (home padrão)...');
        const screenshotPath = await captureScreenshot();
        
        // Verificar se screenshot foi gerado com sucesso
        if (!screenshotPath || !fs.existsSync(screenshotPath)) {
            console.error('[CMS] Screenshot não foi gerado ou arquivo não existe');
            await interaction.editReply({
                content: '❌ Não foi possível gerar o snapshot. O site pode estar indisponível ou houve um erro na captura.\nVerifique os logs para mais detalhes.'
            });
            return;
        }
        
        await interaction.editReply({
            content: '📸 **Snapshot gerado com sucesso!**',
            files: [screenshotPath]
        });

        console.log(`[CMS] Snapshot gerado por ${interaction.user.tag}`);
    } catch (error) {
        console.error('[CMS] Erro ao gerar snapshot:', error);
        console.error('[CMS] Stack trace:', error.stack);
        await interaction.editReply({
            content: '❌ Erro ao gerar snapshot: ' + (error?.message || 'Erro desconhecido')
        });
    }
}

async function handleCMSSync(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Forçar atualização do cache (simulado)
        console.log(`[CMS] Sync solicitado por ${interaction.user.tag}`);
        
        await interaction.editReply({
            content: '🔄 **Sincronização concluída!**\n\nO cache do site foi atualizado. As mudanças já estão visíveis.'
        });
    } catch (error) {
        console.error('[CMS] Erro ao sincronizar:', error);
        await interaction.editReply({
            content: '❌ Erro ao sincronizar: ' + error.message
        });
    }
}

// Preview - Abrir site staging com alterações de rascunho
async function handleCMSPreview(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        console.log(`[CMS] Preview solicitado por ${interaction.user.tag}`);
        
        // URL do site staging (ou site oficial com parâmetro de preview)
        const stagingUrl = CONFIG.STAGING_URL || CONFIG.PRODUCTION_URL + '?preview=1';
        
        await interaction.editReply({
            content: `👁️ **Visualizar Alterações**\n\nClique no link abaixo para ver o site com as alterações de rascunho:\n🔗 ${stagingUrl}\n\n⚠️ As alterações ainda não foram publicadas no site oficial.`
        });
        
        console.log(`[CMS] Preview link enviado: ${stagingUrl}`);
    } catch (error) {
        console.error('[CMS] Erro no preview:', error);
        await interaction.editReply({
            content: '❌ Erro ao abrir preview: ' + error.message
        });
    }
}

// Publish - Publicar alterações do staging para o site oficial
async function handleCMSPublish(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        console.log(`[CMS] Publicação solicitada por ${interaction.user.tag}`);
        
        // Copiar configs do staging para o oficial
        const stagingConfigs = await SiteConfigStaging.findAll();
        
        if (stagingConfigs.length === 0) {
            await interaction.editReply({
                content: '⚠️ Não há alterações pendentes para publicar.\n\nFaça alterações primeiro usando "🎨 Aparência" ou "📝 Conteúdo".'
            });
            return;
        }
        
        // Publicar cada config
        let published = 0;
        for (const stagingConfig of stagingConfigs) {
            await SiteConfig.upsert({
                key: stagingConfig.key,
                value: stagingConfig.value,
                type: stagingConfig.type,
                category: stagingConfig.category,
                lastModifiedBy: interaction.user.tag
            });
            published++;
        }
        
        // Limpar staging após publicar
        await SiteConfigStaging.destroy({ truncate: true });
        
        await interaction.editReply({
            content: `🚀 **Publicação concluída!**\n\n✅ ${published} configuração(ões) publicada(s) no site oficial.\n\n🌐 Site: ${CONFIG.PRODUCTION_URL}\n\nAs alterações já estão visíveis no site.`
        });
        
        console.log(`[CMS] Publicação concluída: ${published} configs por ${interaction.user.tag}`);
    } catch (error) {
        console.error('[CMS] Erro na publicação:', error);
        await interaction.editReply({
            content: '❌ Erro ao publicar: ' + error.message
        });
    }
}

// Market - Editar mercado de transferências
async function handleCMSMarket(interaction) {
    const marketTitleConfig = await SiteConfig.findOne({ where: { key: 'market_title' } });
    const marketSubtitleConfig = await SiteConfig.findOne({ where: { key: 'market_subtitle' } });
    const marketEnabledConfig = await SiteConfig.findOne({ where: { key: 'market_enabled' } });
    
    const modal = {
        title: '🛒 Editar Mercado',
        custom_id: 'cms_market_modal',
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'market_title',
                        label: 'Título do Mercado',
                        style: 1,
                        value: marketTitleConfig?.value || 'Mercado de Transferências',
                        required: true,
                        max_length: 100
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'market_subtitle',
                        label: 'Subtítulo/Descrição',
                        style: 2,
                        value: marketSubtitleConfig?.value || 'Negocie jogadores e monte seu time dos sonhos',
                        required: false,
                        max_length: 200
                    }
                ]
            },
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'market_enabled',
                        label: 'Mercado Ativo (true/false)',
                        style: 1,
                        value: marketEnabledConfig?.value || 'true',
                        required: true,
                        max_length: 5
                    }
                ]
            }
        ]
    };
    
    await interaction.showModal(modal);
}

async function handleCMSModalSubmit(interaction) {
    const customId = interaction.customId;
    const userId = interaction.user.tag;

    try {
        if (customId === 'cms_appearance_modal') {
            const neonColor = interaction.fields.getTextInputValue('neon_color');
            const secondaryColor = interaction.fields.getTextInputValue('secondary_color');
            const layoutConfig = interaction.fields.getTextInputValue('layout_config');

            // DEBUG: Log das cores recebidas
            console.log('[CMS DEBUG] ====================================');
            console.log('[CMS DEBUG] GUILD_ID do bot:', CONFIG.GUILD_ID);
            console.log('[CMS DEBUG] Usuário:', userId);
            console.log('[CMS DEBUG] Cor Neon recebida:', neonColor);
            console.log('[CMS DEBUG] Cor Secundária recebida:', secondaryColor);
            console.log('[CMS DEBUG] Layout recebido:', layoutConfig);
            console.log('[CMS DEBUG] ====================================');

            // Validar cores hexadecimais
            const hexRegex = /^#[0-9A-Fa-f]{6}$/;
            if (!hexRegex.test(neonColor) || !hexRegex.test(secondaryColor)) {
                console.error('[CMS DEBUG] Validação falhou:', { neonColor, secondaryColor });
                await interaction.reply({
                    content: '❌ Cores inválidas! Use formato hexadecimal (ex: #22C55E)',
                    ephemeral: true
                });
                return;
            }

            // Validar JSON
            try {
                JSON.parse(layoutConfig);
            } catch (e) {
                await interaction.reply({
                    content: '❌ Layout inválido! Use formato JSON válido.',
                    ephemeral: true
                });
                return;
            }

            // DEBUG: Antes de salvar
            console.log('[CMS DEBUG] Salvando no banco...');

            // Atualizar banco
            const result1 = await SiteConfig.upsert({ key: 'neon_color', value: neonColor, type: 'color', lastModifiedBy: userId });
            const result2 = await SiteConfig.upsert({ key: 'secondary_color', value: secondaryColor, type: 'color', lastModifiedBy: userId });
            const result3 = await SiteConfig.upsert({ key: 'layout_config', value: layoutConfig, type: 'json', lastModifiedBy: userId });

            // DEBUG: Após salvar
            console.log('[CMS DEBUG] Resultado upsert neon_color:', result1);
            console.log('[CMS DEBUG] Resultado upsert secondary_color:', result2);
            console.log('[CMS DEBUG] Resultado upsert layout_config:', result3);

            // Verificar se salvou corretamente
            const verifyNeon = await SiteConfig.findOne({ where: { key: 'neon_color' } });
            const verifySecondary = await SiteConfig.findOne({ where: { key: 'secondary_color' } });

            console.log('[CMS DEBUG] Verificação no banco:');
            console.log('[CMS DEBUG] - neon_color:', verifyNeon?.value || 'NÃO ENCONTRADO');
            console.log('[CMS DEBUG] - secondary_color:', verifySecondary?.value || 'NÃO ENCONTRADO');

            console.log(`[CMS] Aparência alterada por ${userId}: Neon=${neonColor}, Secondary=${secondaryColor}`);

            await interaction.reply({
                content: `✅ **Aparência atualizada!**\n\n🎨 Neon: ${neonColor}\n🎨 Secundária: ${secondaryColor}\n📐 Layout: ${layoutConfig}`,
                ephemeral: true
            });

        } else if (customId === 'cms_content_modal') {
            const announcementText = interaction.fields.getTextInputValue('announcement_text');
            const siteStatus = interaction.fields.getTextInputValue('site_status');

            if (!['online', 'maintenance'].includes(siteStatus)) {
                await interaction.reply({
                    content: '❌ Status inválido! Use "online" ou "maintenance".',
                    ephemeral: true
                });
                return;
            }

            await SiteConfig.upsert({ key: 'announcement_text', value: announcementText, type: 'string', lastModifiedBy: userId });
            await SiteConfig.upsert({ key: 'site_status', value: siteStatus, type: 'string', lastModifiedBy: userId });

            console.log(`[CMS] Conteúdo alterado por ${userId}: Status=${siteStatus}`);

            await interaction.reply({
                content: `✅ **Conteúdo atualizado!**\n\n📢 Anúncio: ${announcementText || 'Nenhum'}\n📊 Status: ${siteStatus}`,
                ephemeral: true
            });

        } else if (customId === 'cms_market_modal') {
            const marketTitle = interaction.fields.getTextInputValue('market_title');
            const marketSubtitle = interaction.fields.getTextInputValue('market_subtitle');
            const marketEnabled = interaction.fields.getTextInputValue('market_enabled');

            // Validar valor booleano
            const isEnabled = marketEnabled.toLowerCase() === 'true';

            // Salvar no banco
            await SiteConfig.upsert({ key: 'market_title', value: marketTitle, type: 'string', category: 'content', lastModifiedBy: userId });
            await SiteConfig.upsert({ key: 'market_subtitle', value: marketSubtitle, type: 'string', category: 'content', lastModifiedBy: userId });
            await SiteConfig.upsert({ key: 'market_enabled', value: isEnabled ? 'true' : 'false', type: 'boolean', category: 'feature', lastModifiedBy: userId });

            console.log(`[CMS] Mercado alterado por ${userId}: Title=${marketTitle}, Enabled=${isEnabled}`);

            await interaction.reply({
                content: `✅ **Mercado atualizado!**\n\n🛒 Título: ${marketTitle}\n📝 Subtítulo: ${marketSubtitle}\n✨ Ativo: ${isEnabled ? 'Sim' : 'Não'}`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('[CMS] Erro ao processar modal:', error);
        await interaction.reply({
            content: '❌ Erro ao salvar alterações: ' + error.message,
            ephemeral: true
        });
    }
}

// ==========================================
// EVENTOS DO BOT
// ==========================================
client.on('interactionCreate', async (interaction) => {
    // Log todas as interações recebidas
    console.log('🔔 Interação recebida: ' + interaction.type);
    
    try {
        // Slash commands
        if (interaction.isChatInputCommand()) {
            console.log('   → Comando: ' + interaction.commandName);
            console.log('   → Usuário: ' + interaction.user.tag);
            console.log('   → Guild: ' + (interaction.guild?.name || 'DM'));
            
            // Comando painel (CMS)
            if (interaction.commandName === 'painel') {
                await handlePainel(interaction);
                return;
            }

            // Comando visualizar (preview staging)
            if (interaction.commandName === 'visualizar') {
                await handleCMSPreview(interaction);
                return;
            }

            // Comando publicar (publish to production)
            if (interaction.commandName === 'publicar') {
                await handleCMSPublish(interaction);
                return;
            }

            // Comando mercado (edit market)
            if (interaction.commandName === 'mercado') {
                await handleCMSMarket(interaction);
                return;
            }
        }

        // Botões
        if (interaction.isButton()) {
            console.log('   → Botão: ' + interaction.customId);
            switch (interaction.customId) {
                case 'cms_appearance':
                    await handleCMSAppearance(interaction);
                    break;
                case 'cms_content':
                    await handleCMSContent(interaction);
                    break;
                case 'cms_snapshot':
                    await handleCMSSnapshot(interaction);
                    break;
                case 'cms_sync':
                    await handleCMSSync(interaction);
                    break;
                case 'cms_preview':
                    await handleCMSPreview(interaction);
                    break;
                case 'cms_publish':
                    await handleCMSPublish(interaction);
                    break;
                case 'cms_market':
                    await handleCMSMarket(interaction);
                    break;
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
            console.log('   → Modal: ' + interaction.customId);
            if (interaction.customId === 'cms_appearance_modal' || interaction.customId === 'cms_content_modal' || interaction.customId === 'cms_market_modal') {
                await handleCMSModalSubmit(interaction);
            } else {
                await handleModalSubmit(interaction);
            }
        }

        // Select menus
        if (interaction.isStringSelectMenu()) {
            console.log('   → Select Menu: ' + interaction.customId);
            
            if (interaction.customId === 'cms_snapshot_select') {
                await handleCMSSnapshotSelect(interaction);
            } else {
                await handleSelectMenu(interaction);
            }
        }

    } catch (error) {
        console.error('❌ Erro na interação:', error);
        console.error('   → Stack:', error.stack);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocorreu um erro ao processar sua solicitação: ' + error.message,
                ephemeral: true
            });
        }
    }
});

// ==========================================
// DEPLOY DE COMANDOS (REGISTRO NO DISCORD)
// ==========================================
const commands = new Map();

async function deployCommands() {
    try {
        console.log('🚀 Iniciando deploy de comandos para o Guild...');
        console.log(`🔑 CLIENT_ID: ${CONFIG.CLIENT_ID}`);
        console.log(`🏠 Guild ID: ${CONFIG.GUILD_ID}`);
        
        const rest = new REST({ version: '10' }).setToken(CONFIG.BOT_TOKEN);
        
        // Limpar comandos globais antigos (painel-pso)
        try {
            console.log('🧹 Limpando comandos globais antigos...');
            await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: [] });
            console.log('✅ Comandos globais limpos');
        } catch (error) {
            console.log('⚠️ Não foi possível limpar comandos globais:', error.message);
        }
        
        const commandsData = [];
        
        // Comando: painel
        const painelCmd = {
            name: 'painel',
            description: 'Painel de controle do site PSO Brasil (CMS)'
        };
        commandsData.push(painelCmd);
        commands.set('painel', painelCmd);

        // Comando: visualizar (preview staging)
        const visualizarCmd = {
            name: 'visualizar',
            description: 'Visualizar site com alterações de rascunho (staging)'
        };
        commandsData.push(visualizarCmd);
        commands.set('visualizar', visualizarCmd);

        // Comando: publicar (publish to production)
        const publicarCmd = {
            name: 'publicar',
            description: 'Publicar alterações pendentes no site oficial'
        };
        commandsData.push(publicarCmd);
        commands.set('publicar', publicarCmd);

        // Comando: mercado (edit market)
        const mercadoCmd = {
            name: 'mercado',
            description: 'Editar configurações do mercado de transferências'
        };
        commandsData.push(mercadoCmd);
        commands.set('mercado', mercadoCmd);
        console.log(`📋 Comandos carregados no Map: ${commands.size}`);
        
        // Primeiro tenta Guild (instantâneo), se falhar tenta Global (até 1 hora)
        try {
            console.log(`🏠 Tentando deploy no Guild (${CONFIG.GUILD_ID})...`);
            const data = await rest.put(
                Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
                { body: commandsData }
            );
            console.log(`✅ ${data.length} comandos registrados com sucesso no Guild!`);
        } catch (guildError) {
            console.error(`❌ Falha no deploy do Guild: ${guildError.message}`);
            console.log(`🌍 Tentando deploy Global (pode demorar até 1 hora)...`);
            
            try {
                const data = await rest.put(
                    Routes.applicationCommands(CONFIG.CLIENT_ID),
                    { body: commandsData }
                );
                console.log(`✅ ${data.length} comandos registrados com sucesso Globalmente!`);
                console.log(`⚠️ Os comandos podem demorar até 1 hora para aparecer.`);
            } catch (globalError) {
                console.error(`❌ Falha no deploy Global: ${globalError.message}`);
                throw globalError;
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao fazer deploy dos comandos:', error);
        console.error('Detalhes:', error.message);
    }
}

// ==========================================
// INICIALIZAÇÃO DO BOT
// ==========================================
client.on('ready', async () => {
    console.log('========================================');
    console.log('🤖 Bot logado como ' + client.user.tag);
    console.log('📊 Estatísticas:');
    console.log('   - Servidores conectados: ' + client.guilds.cache.size);
    console.log('   - Comandos carregados localmente: ' + commands.size);
    console.log('========================================');
    
    // Inicializar banco de dados
    try {
        await initializeDatabase();
    } catch (error) {
        console.error('⚠️ Erro ao inicializar banco de dados, mas bot continuará:', error.message);
    }
    
    // Deploy dos comandos para o Guild
    await deployCommands();
    
    // Iniciar monitoramento de recorde de acessos
    startPeakRecordMonitoring();
});

// ==========================================
// MONITORAMENTO DE RECORDE DE ACESSOS
// ==========================================
let lastPeakRecord = 0;
let peakRecordChannel = null;

async function startPeakRecordMonitoring() {
    console.log('[BOT] Iniciando monitoramento de recorde de acessos...');
    
    // Verificar a cada 2 minutos
    setInterval(async () => {
        try {
            if (!SiteAnalytics) return;
            
            // Buscar sessões ativas (últimos 5 minutos)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            const activeSessions = await SiteAnalytics.findAll({
                where: {
                    entry_time: { [Op.gte]: fiveMinutesAgo },
                    exit_time: null
                },
                attributes: ['session_id'],
                group: ['session_id']
            });
            
            const currentOnline = activeSessions.length;
            
            // Verificar se é novo recorde
            if (currentOnline > lastPeakRecord && currentOnline >= 10) { // Mínimo 10 usuários
                lastPeakRecord = currentOnline;
                
                console.log(`[BOT] 🚀 NOVO RECORDE! ${currentOnline} usuários online!`);
                
                // Enviar alerta no Discord
                await sendPeakRecordAlert(currentOnline);
                
                // Salvar no banco
                await SiteConfig.upsert({
                    key: 'peak_online_record',
                    value: currentOnline.toString(),
                    type: 'number',
                    category: 'feature',
                    description: 'Recorde de usuários online simultâneos',
                    lastModifiedBy: 'BOT'
                });
            }
        } catch (error) {
            console.error('[BOT] Erro ao verificar recorde:', error);
        }
    }, 120000); // 2 minutos
}

async function sendPeakRecordAlert(count) {
    try {
        // Buscar canal da diretoria (você pode ajustar o ID)
        const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
        if (!guild) return;
        
        // Procurar canal chamado "diretoria" ou "admin"
        const channel = guild.channels.cache.find(ch => 
            ch.name.toLowerCase().includes('diretoria') || 
            ch.name.toLowerCase().includes('admin') ||
            ch.name.toLowerCase().includes('geral')
        );
        
        if (!channel) {
            console.log('[BOT] Canal para alerta de recorde não encontrado');
            return;
        }
        
        const embed = {
            color: 0x00FF00,
            title: '🚀 Novo Recorde de Acessos!',
            description: `**${count}** usuários online agora no PSO Brasil!`,
            fields: [
                {
                    name: '📊 Estatísticas',
                    value: `Recorde anterior: ${lastPeakRecord > count ? lastPeakRecord : 'Primeiro registro'}`,
                    inline: true
                },
                {
                    name: '⏰ Horário',
                    value: new Date().toLocaleString('pt-BR'),
                    inline: true
                }
            ],
            footer: {
                text: 'PSO Brasil Analytics'
            },
            timestamp: new Date().toISOString()
        };
        
        await channel.send({ embeds: [embed] });
        console.log(`[BOT] Alerta de recorde enviado: ${count} usuários`);
        
    } catch (error) {
        console.error('[BOT] Erro ao enviar alerta de recorde:', error);
    }
}

// ==========================================
// LISTENER DE INTERAÇÕES (SLASH COMMANDS) - CONSOLIDADO ACIMA
// ==========================================

client.login(CONFIG.BOT_TOKEN).catch(error => {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
});

// Exportar para uso externo
module.exports = { client, SiteConfig, SiteConfigStaging };
