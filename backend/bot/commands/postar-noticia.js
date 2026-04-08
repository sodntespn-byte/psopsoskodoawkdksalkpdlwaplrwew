const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');
const { sanitize } = require('sanitize-html');

/**
 * Comando /postar-noticia - Postar notícia no sistema de imprensa
 * Modal com campos técnicos para jornalistas
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postar-noticia')
    .setDescription('Postar uma nova notícia no sistema de imprensa PSO Brasil')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Permissão base
  
  public: false, // Requer validação de cargo
  cooldown: 10,
  
  async execute(interaction, bot) {
    // Verificar se usuário tem cargo de imprensa
    const config = await bot.getGuildConfig(interaction.guild.id);
    const member = await interaction.guild.members.fetch(interaction.user.id);
    
    const hasPressRole = config?.pressRoleIds?.some(roleId => 
      member.roles.cache.has(roleId)
    ) || member.permissions.has(PermissionFlagsBits.Administrator);
    
    if (!hasPressRole) {
      const embed = new PSOEmbedBuilder().createBase({
        color: 0xdc2626 // Vermelho Alerta
      });
      
      embed.setTitle('ACESSO NEGADO - PERMISSÃO DE IMPRENSA');
      embed.addFields({
        name: '                    ',
        value: `**[ USUÁRIO ]** ${interaction.user.username}\n` +
               `**[ CARGO REQUERIDO ]** Imprensa/Jornalista\n` +
               `**[ STATUS ]** BLOQUEADO\n\n` +
               `**[ SOLUÇÃO ]** CONTATE UM ADMINISTRADOR PARA OBTER PERMISSÃO`,
        inline: false
      });
      
      await interaction.reply({ 
        embeds: [embed],
        ephemeral: true 
      });
      return;
    }
    
    // Criar modal para postar notícia
    const modal = new ModalBuilder()
      .setCustomId('news_post_modal')
      .setTitle('POSTAR NOTÍCIA - PSO BRASIL');
    
    // Campo: Título
    const titleInput = new TextInputBuilder()
      .setCustomId('news_title')
      .setLabel('Título da Notícia')
      .setPlaceholder('Digite o título principal da notícia...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Subtítulo
    const subtitleInput = new TextInputBuilder()
      .setCustomId('news_subtitle')
      .setLabel('Subtítulo (Opcional)')
      .setPlaceholder('Digite um subtítulo ou linha fina...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(150);
    
    // Campo: Conteúdo
    const contentInput = new TextInputBuilder()
      .setCustomId('news_content')
      .setLabel('Conteúdo da Notícia (Markdown)')
      .setPlaceholder('Digite o conteúdo completo da notícia usando Markdown...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);
    
    // Campo: URL da Imagem
    const imageInput = new TextInputBuilder()
      .setCustomId('news_image')
      .setLabel('URL da Imagem de Capa (Opcional)')
      .setPlaceholder('https://exemplo.com/imagem.jpg')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Campo: Tags
    const tagsInput = new TextInputBuilder()
      .setCustomId('news_tags')
      .setLabel('Tags (Separadas por vírgula)')
      .setPlaceholder('futebol, liga, destaque, urgente')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Adicionar campos ao modal
    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder().addComponents(subtitleInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(contentInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(imageInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(tagsInput);
    
    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow,
      fifthActionRow
    );
    
    // Exibir modal
    await interaction.showModal(modal);
  },
  
  /**
   * Processar o modal de postagem de notícia
   */
  async handleModal(interaction, bot) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Extrair dados do modal
      const title = interaction.fields.getTextInputValue('news_title').trim();
      const subtitle = interaction.fields.getTextInputValue('news_subtitle').trim() || null;
      const content = interaction.fields.getTextInputValue('news_content').trim();
      const imageUrl = interaction.fields.getTextInputValue('news_image').trim() || null;
      const tagsInput = interaction.fields.getTextInputValue('news_tags').trim() || '';
      
      // Sanitizar conteúdo para evitar XSS
      const sanitizedContent = sanitize(content, {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del',
          'ul', 'ol', 'li',
          'blockquote', 'code', 'pre',
          'a', 'img'
        ],
        allowedAttributes: {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'title', 'width', 'height']
        },
        allowedSchemes: ['http', 'https', 'mailto']
      });
      
      // Validar URL da imagem se fornecida
      if (imageUrl && !this.isValidUrl(imageUrl)) {
        await interaction.editReply({
          content: 'URL da imagem inválida. Por favor, forneça uma URL válida começando com http:// ou https://',
          ephemeral: true
        });
        return;
      }
      
      // Processar tags
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 20);
      
      // Calcular tempo de leitura estimado
      const wordsPerMinute = 200; // Média de leitura
      const wordCount = sanitizedContent.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
      
      // Criar notícia no banco
      const news = await bot.prisma.news.create({
        data: {
          title,
          subtitle,
          content: sanitizedContent,
          coverImageUrl: imageUrl,
          category: 'GENERAL', // Pode ser configurado depois
          authorId: interaction.user.id,
          authorName: interaction.user.username,
          published: true, // Publicar automaticamente
          featured: false,
          tags,
          readTime,
          publishedAt: new Date()
        }
      });
      
      // Criar embed de sucesso
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.success });
      
      embed.setTitle('NOTÍCIA POSTADA COM SUCESSO');
      embed.addFields({
        name: '                    ',
        value: `**[ TÍTULO ]** ${title}\n` +
               `**[ AUTOR ]** ${interaction.user.username}\n` +
               `**[ ID ]** \`${news.id.substring(0, 8)}...\`\n` +
               `**[ STATUS ]** PUBLICADA`,
        inline: false
      });
      
      embed.addFields({
        name: '                    ',
        value: `**[ TEMPO DE LEITURA ]** ${readTime} minutos\n` +
               `**[ TAGS ]** ${tags.length > 0 ? tags.map(tag => `#${tag}`).join(' ') : 'Nenhuma'}\n` +
               `**[ IMAGEM ]** ${imageUrl ? 'Configurada' : 'Não configurada'}`,
        inline: false
      });
      
      // Enviar confirmação ao usuário
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
      // Enviar embed para o canal de anúncios de imprensa
      await this.announceNews(interaction, bot, news);
      
      // Notificar WebSocket para atualizar o site
      if (bot.notifyWebsite) {
        bot.notifyWebsite('news-published', {
          id: news.id,
          title,
          author: interaction.user.username,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('[NEWS_POST] Notícia postada:', news.id, 'por', interaction.user.username);
      
    } catch (error) {
      console.error('[NEWS_POST] Erro ao postar notícia:', error);
      
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.error });
      
      embed.setTitle('ERRO AO POSTAR NOTÍCIA');
      embed.addFields({
        name: '                    ',
        value: `**[ ERRO ]** Falha ao salvar notícia no banco de dados\n` +
               `**[ DETALHES ]** ${error.message}\n` +
               `**[ SOLUÇÃO ]** Tente novamente ou contate o suporte técnico`,
        inline: false
      });
      
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
    }
  },
  
  /**
   * Anunciar notícia no Discord
   */
  async announceNews(interaction, bot, news) {
    try {
      // Buscar configuração do servidor
      const config = await bot.getGuildConfig(interaction.guild.id);
      
      if (!config || !config.pressChannelId) {
        console.log('[NEWS_POST] Canal de imprensa não configurado');
        return;
      }
      
      const channel = await interaction.guild.channels.fetch(config.pressChannelId);
      if (!channel) {
        console.log('[NEWS_POST] Canal não encontrado');
        return;
      }
      
      // Criar embed técnico para anúncio
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.info });
      
      embed.setTitle('JORNAL OFICIAL - PSO BRASIL');
      embed.setDescription(`**${news.title}**`);
      
      if (news.subtitle) {
        embed.addFields({
          name: '                    ',
          value: `**[ SUBTÍTULO ]** ${news.subtitle}`,
          inline: false
        });
      }
      
      embed.addFields({
        name: '                    ',
        value: `**[ AUTOR ]** ${news.authorName}\n` +
               `**[ DATA ]** ${new Date(news.publishedAt).toLocaleDateString('pt-BR')}\n` +
               `**[ LEITURA ]** ${news.readTime} minutos`,
        inline: false
      });
      
      if (news.coverImageUrl) {
        embed.setImage(news.coverImageUrl);
      }
      
      // Adicionar tags se existirem
      if (news.tags && news.tags.length > 0) {
        embed.addFields({
          name: '                    ',
          value: `**[ TAGS ]** ${news.tags.map(tag => `#${tag}`).join(' ')}`,
          inline: false
        });
      }
      
      // Criar botão para ler matéria completa
      const actionRow = embedBuilder.createActionRow([
        {
          label: 'LER MATÉRIA COMPLETA',
          style: 3, // Success
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/imprensa#${news.id}`
        }
      ]);
      
      // Enviar mensagem
      await channel.send({ 
        embeds: [embed],
        components: [actionRow]
      });
      
      console.log('[NEWS_POST] Anúncio enviado no canal de imprensa');
      
    } catch (error) {
      console.error('[NEWS_POST] Erro ao enviar anúncio:', error);
    }
  },
  
  /**
   * Validar URL
   */
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
};
