const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const PSOEmbedBuilder = require('../../lib/embedBuilder');
const { sanitize } = require('sanitize-html');

/**
 * Comando /postar-foto - Postar foto na galeria de imprensa
 * Modal com campos técnicos para fotógrafos
 */

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postar-foto')
    .setDescription('Postar uma nova foto na galeria PSO Brasil')
    .addAttachmentOption(option =>
      option
        .setName('imagem')
        .setDescription('Imagem da foto (opcional)')
        .setRequired(false)
    )
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
               `**[ CARGO REQUERIDO ]** Imprensa/Fotógrafo\n` +
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
    
    // Obter anexo se fornecido
    const attachment = interaction.options.getAttachment('imagem');
    
    // Criar modal para postar foto
    const modal = new ModalBuilder()
      .setCustomId('photo_post_modal')
      .setTitle('POSTAR FOTO - PSO BRASIL');
    
    // Campo: Título
    const titleInput = new TextInputBuilder()
      .setCustomId('photo_title')
      .setLabel('Título da Foto')
      .setPlaceholder('Digite um título descritivo para a foto...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    
    // Campo: Descrição
    const descriptionInput = new TextInputBuilder()
      .setCustomId('photo_description')
      .setLabel('Legenda Técnica (Opcional)')
      .setPlaceholder('Digite uma legenda técnica ou descrição detalhada...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);
    
    // Campo: URL da Imagem
    const imageInput = new TextInputBuilder()
      .setCustomId('photo_image')
      .setLabel('URL da Imagem (ou deixe em branco se enviou anexo)')
      .setPlaceholder('https://exemplo.com/foto.jpg')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Campo: Local
    const locationInput = new TextInputBuilder()
      .setCustomId('photo_location')
      .setLabel('Local da Foto (Opcional)')
      .setPlaceholder('Estádio do Maracanã, Rio de Janeiro')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Campo: Equipamento
    const cameraInput = new TextInputBuilder()
      .setCustomId('photo_camera')
      .setLabel('Equipamento (Opcional)')
      .setPlaceholder('Canon EOS R5, Sony A7IV, etc.')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Campo: Configurações
    const settingsInput = new TextInputBuilder()
      .setCustomId('photo_settings')
      .setLabel('Configurações (Opcional)')
      .setPlaceholder('f/2.8, 1/1000s, ISO 400, 200mm')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Campo: Tags
    const tagsInput = new TextInputBuilder()
      .setCustomId('photo_tags')
      .setLabel('Tags (Separadas por vírgula)')
      .setPlaceholder('acao, gol, celebracao, estadio')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);
    
    // Adicionar campos ao modal
    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
    const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(imageInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(locationInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(cameraInput);
    const sixthActionRow = new ActionRowBuilder().addComponents(settingsInput);
    const seventhActionRow = new ActionRowBuilder().addComponents(tagsInput);
    
    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow,
      fifthActionRow,
      sixthActionRow,
      seventhActionRow
    );
    
    // Armazenar anexo para uso posterior
    if (attachment) {
      bot.tempAttachments = bot.tempAttachments || new Map();
      bot.tempAttachments.set(interaction.user.id, attachment);
    }
    
    // Exibir modal
    await interaction.showModal(modal);
  },
  
  /**
   * Processar o modal de postagem de foto
   */
  async handleModal(interaction, bot) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Extrair dados do modal
      const title = interaction.fields.getTextInputValue('photo_title').trim();
      const description = interaction.fields.getTextInputValue('photo_description').trim() || null;
      let imageUrl = interaction.fields.getTextInputValue('photo_image').trim() || null;
      const location = interaction.fields.getTextInputValue('photo_location').trim() || null;
      const camera = interaction.fields.getTextInputValue('photo_camera').trim() || null;
      const settings = interaction.fields.getTextInputValue('photo_settings').trim() || null;
      const tagsInput = interaction.fields.getTextInputValue('photo_tags').trim() || '';
      
      // Verificar anexo se não houver URL
      if (!imageUrl && bot.tempAttachments && bot.tempAttachments.has(interaction.user.id)) {
        const attachment = bot.tempAttachments.get(interaction.user.id);
        imageUrl = attachment.url;
        
        // Limpar anexo temporário
        bot.tempAttachments.delete(interaction.user.id);
      }
      
      // Validar que há uma imagem
      if (!imageUrl) {
        await interaction.editReply({
          content: 'É necessário fornecer uma URL de imagem ou enviar um anexo.',
          ephemeral: true
        });
        return;
      }
      
      // Validar URL da imagem se fornecida
      if (imageUrl && !this.isValidUrl(imageUrl)) {
        await interaction.editReply({
          content: 'URL da imagem inválida. Por favor, forneça uma URL válida começando com http:// ou https://',
          ephemeral: true
        });
        return;
      }
      
      // Sanitizar descrição para evitar XSS
      const sanitizedDescription = description ? sanitize(description, {
        allowedTags: ['p', 'br', 'strong', 'em', 'u'],
        allowedAttributes: {}
      }) : null;
      
      // Processar tags
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 20);
      
      // Obter informações da imagem (simulação - em produção usar uma API)
      const imageInfo = await this.getImageInfo(imageUrl);
      
      // Criar foto no banco
      const photo = await bot.prisma.photo.create({
        data: {
          title,
          description: sanitizedDescription,
          imageUrl,
          thumbnailUrl: imageInfo.thumbnailUrl || imageUrl,
          photographerId: interaction.user.id,
          photographerName: interaction.user.username,
          category: 'GENERAL', // Pode ser configurado depois
          tags,
          featured: false,
          resolution: imageInfo.resolution,
          fileSize: imageInfo.fileSize,
          camera,
          settings,
          location,
          eventDate: new Date()
        }
      });
      
      // Criar embed de sucesso
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.success });
      
      embed.setTitle('FOTO POSTADA COM SUCESSO');
      embed.addFields({
        name: '                    ',
        value: `**[ TÍTULO ]** ${title}\n` +
               `**[ FOTÓGRAFO ]** ${interaction.user.username}\n` +
               `**[ ID ]** \`${photo.id.substring(0, 8)}...\`\n` +
               `**[ STATUS ]** PUBLICADA`,
        inline: false
      });
      
      embed.addFields({
        name: '                    ',
        value: `**[ RESOLUÇÃO ]** ${imageInfo.resolution || 'Desconhecida'}\n` +
               `**[ LOCAL ]** ${location || 'Não informado'}\n` +
               `**[ EQUIPAMENTO ]** ${camera || 'Não informado'}`,
        inline: false
      });
      
      if (tags.length > 0) {
        embed.addFields({
          name: '                    ',
          value: `**[ TAGS ]** ${tags.map(tag => `#${tag}`).join(' ')}`,
          inline: false
        });
      }
      
      // Enviar confirmação ao usuário
      await interaction.editReply({
        embeds: [embed],
        ephemeral: true
      });
      
      // Enviar embed para o canal de anúncios de imprensa
      await this.announcePhoto(interaction, bot, photo);
      
      // Notificar WebSocket para atualizar o site
      if (bot.notifyWebsite) {
        bot.notifyWebsite('photo-published', {
          id: photo.id,
          title,
          photographer: interaction.user.username,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('[PHOTO_POST] Foto postada:', photo.id, 'por', interaction.user.username);
      
    } catch (error) {
      console.error('[PHOTO_POST] Erro ao postar foto:', error);
      
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.error });
      
      embed.setTitle('ERRO AO POSTAR FOTO');
      embed.addFields({
        name: '                    ',
        value: `**[ ERRO ]** Falha ao salvar foto no banco de dados\n` +
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
   * Anunciar foto no Discord
   */
  async announcePhoto(interaction, bot, photo) {
    try {
      // Buscar configuração do servidor
      const config = await bot.getGuildConfig(interaction.guild.id);
      
      if (!config || !config.pressChannelId) {
        console.log('[PHOTO_POST] Canal de imprensa não configurado');
        return;
      }
      
      const channel = await interaction.guild.channels.fetch(config.pressChannelId);
      if (!channel) {
        console.log('[PHOTO_POST] Canal não encontrado');
        return;
      }
      
      // Criar embed técnico para anúncio
      const embedBuilder = new PSOEmbedBuilder();
      const embed = embedBuilder.createBase({ color: embedBuilder.colors.info });
      
      embed.setTitle('GALERIA DE IMPRENSA - PSO BRASIL');
      embed.setDescription(`**${photo.title}**`);
      
      if (photo.description) {
        embed.addFields({
          name: '                    ',
          value: `**[ LEGENDA ]** ${photo.description}`,
          inline: false
        });
      }
      
      embed.addFields({
        name: '                    ',
        value: `**[ FOTÓGRAFO ]** ${photo.photographerName}\n` +
               `**[ DATA ]** ${new Date(photo.eventDate).toLocaleDateString('pt-BR')}\n` +
               `**[ CATEGORIA ]** ${photo.category}`,
        inline: false
      });
      
      if (photo.location || photo.camera) {
        embed.addFields({
          name: '                    ',
          value: `**[ LOCAL ]** ${photo.location || 'Não informado'}\n` +
                 `**[ EQUIPAMENTO ]** ${photo.camera || 'Não informado'}`,
          inline: false
        });
      }
      
      if (photo.imageUrl) {
        embed.setImage(photo.imageUrl);
      }
      
      // Adicionar tags se existirem
      if (photo.tags && photo.tags.length > 0) {
        embed.addFields({
          name: '                    ',
          value: `**[ TAGS ]** ${photo.tags.map(tag => `#${tag}`).join(' ')}`,
          inline: false
        });
      }
      
      // Criar botão para ver na galeria
      const actionRow = embedBuilder.createActionRow([
        {
          label: 'VER NA GALERIA',
          style: 3, // Success
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/galeria#${photo.id}`
        }
      ]);
      
      // Enviar mensagem
      await channel.send({ 
        embeds: [embed],
        components: [actionRow]
      });
      
      console.log('[PHOTO_POST] Anúncio enviado no canal de imprensa');
      
    } catch (error) {
      console.error('[PHOTO_POST] Erro ao enviar anúncio:', error);
    }
  },
  
  /**
   * Obter informações da imagem (simulação)
   */
  async getImageInfo(url) {
    try {
      // Em produção, usar uma API como sharp ou image-size
      // Por ora, retornar valores simulados
      return {
        resolution: '1920x1080',
        fileSize: 2048000, // 2MB
        thumbnailUrl: null
      };
    } catch (error) {
      return {
        resolution: null,
        fileSize: null,
        thumbnailUrl: null
      };
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
