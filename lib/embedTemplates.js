/**
 * PSO Brasil - Embed Templates
 * Templates padronizados para todas as interações do bot
 * Estilo técnico e imersivo consistente
 */

const PSOEmbedBuilder = require('./embedBuilder');

class EmbedTemplates {
  constructor() {
    this.builder = new PSOEmbedBuilder();
  }

  /**
   * Template de boas-vindas
   */
  welcome(guildName, adminUser) {
    const embed = this.builder.createBase({ color: this.builder.colors.success });
    
    embed.setTitle('SISTEMA PSO BRASIL - INICIALIZAÇÃO CONCLUÍDA');
    
    embed.addFields({
      name: '                    ',
      value: `**[ STATUS DA INSTALAÇÃO ]**\n` +
             `**[ SERVIDOR ]** ${guildName}\n` +
             `**[ ADMINISTRADOR ]** ${adminUser}\n` +
             `**[ STATUS ]** OPERACIONAL`,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ PRÓXIMOS PASSOS ]**\n` +
             `1. Execute /configurar para definir canais\n` +
             `2. Configure cargos de administração\n` +
             `3. Defina status da liga atual`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de sucesso
   */
  success(title, description, details = {}) {
    const embed = this.builder.createBase({ color: this.builder.colors.success });
    
    embed.setTitle(`SUCESSO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    if (Object.keys(details).length > 0) {
      const detailsText = Object.entries(details)
        .map(([key, value]) => `**[ ${key.toUpperCase()} ]** ${value}`)
        .join('\n');
      
      embed.addFields({
        name: '                    ',
        value: detailsText,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Template de erro
   */
  error(title, description, errorCode = null) {
    const embed = this.builder.createBase({ color: this.builder.colors.error });
    
    embed.setTitle(`ERRO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    if (errorCode) {
      embed.addFields({
        name: '**CÓDIGO DO ERRO:**',
        value: `\`${errorCode}\``,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Template de aviso
   */
  warning(title, description, action = null) {
    const embed = this.builder.createBase({ color: this.builder.colors.warning });
    
    embed.setTitle(`AVISO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    if (action) {
      embed.addFields({
        name: '                    ',
        value: `**[ AÇÃO RECOMENDADA ]** ${action}`,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Template de informação
   */
  info(title, description, metadata = {}) {
    const embed = this.builder.createBase({ color: this.builder.colors.info });
    
    embed.setTitle(`INFORMAÇÃO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    if (Object.keys(metadata).length > 0) {
      const metadataText = Object.entries(metadata)
        .map(([key, value]) => `**[ ${key.toUpperCase()} ]** ${value}`)
        .join('\n');
      
      embed.addFields({
        name: '                    ',
        value: metadataText,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Template de confirmação
   */
  confirmation(title, description, confirmId, cancelId) {
    const embed = this.builder.createBase({ color: this.builder.colors.warning });
    
    embed.setTitle(`CONFIRMAÇÃO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ ATENÇÃO ]** ESTA AÇÃO É IRREVERSÍVEL`,
      inline: false
    });

    // Criar botões de confirmação
    const actionRow = this.builder.createActionRow([
      {
        label: 'Confirmar',
        style: 3, // Success
        customId: confirmId
      },
      {
        label: 'Cancelar',
        style: 4, // Danger
        customId: cancelId
      }
    ]);

    return { embed, components: [actionRow] };
  }

  /**
   * Template de carregamento
   */
  loading(title, description) {
    const embed = this.builder.createBase({ color: this.builder.colors.secondary });
    
    embed.setTitle(`PROCESSANDO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: description,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ STATUS ]** AGUARDE...`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de permissão negada
   */
  permissionDenied(command, requiredRole) {
    const embed = this.builder.createBase({ color: this.builder.colors.error });
    
    embed.setTitle('ACESSO NEGADO - PERMISSÃO INSUFICIENTE');
    
    embed.addFields({
      name: '                    ',
      value: `**[ COMANDO ]** ${command}\n` +
             `**[ CARGO REQUERIDO ]** ${requiredRole}\n` +
             `**[ STATUS ]** BLOQUEADO`,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ SOLUÇÃO ]** CONTATE UM ADMINISTRADOR DO SERVIDOR`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de cooldown
   */
  cooldown(command, remainingTime) {
    const embed = this.builder.createBase({ color: this.builder.colors.warning });
    
    embed.setTitle('AGUARDAR - COMANDO EM COOLDOWN');
    
    embed.addFields({
      name: '                    ',
      value: `**[ COMANDO ]** ${command}\n` +
             `**[ TEMPO RESTANTE ]** ${remainingTime}s\n` +
             `**[ STATUS ]** AGUARDE`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de validação
   */
  validation(title, errors) {
    const embed = this.builder.createBase({ color: this.builder.colors.error });
    
    embed.setTitle(`ERRO DE VALIDAÇÃO - ${title}`);
    
    const errorList = errors.map((error, index) => 
      `**[ ERRO ${index + 1} ]** ${error}`
    ).join('\n');

    embed.addFields({
      name: '                    ',
      value: errorList,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ CORREÇÃO ]** VERIFIQUE OS DADOS E TENTE NOVAMENTE`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de ajuda
   */
  help(commands, category = null) {
    const embed = this.builder.createBase({ color: this.builder.colors.info });
    
    embed.setTitle('SISTEMA DE AJUDA - PSO BRASIL');
    
    const title = category ? `COMANDOS - ${category.toUpperCase()}` : 'TODOS OS COMANDOS';
    
    embed.addFields({
      name: '                    ',
      value: title,
      inline: false
    });

    const commandList = commands.map(cmd => 
      `**[ /${cmd.name} ]** ${cmd.description}`
    ).join('\n');

    embed.addFields({
      name: '                    ',
      value: commandList,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ INFORMAÇÃO ]** USE /configurar PARA CONFIGURAR O BOT`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de estatísticas
   */
  statistics(title, stats) {
    const embed = this.builder.createBase({ color: this.builder.colors.success });
    
    embed.setTitle(`ESTATÍSTICAS - ${title}`);
    
    const statsList = Object.entries(stats)
      .map(([key, value]) => `**[ ${key.toUpperCase()} ]** ${value}`)
      .join('\n');

    embed.addFields({
      name: '                    ',
      value: statsList,
      inline: false
    });

    return embed;
  }

  /**
   * Template de log de auditoria
   */
  auditLog(action, user, details, timestamp = new Date()) {
    const embed = this.builder.createBase({ color: this.builder.colors.info });
    
    embed.setTitle(`LOG DE AUDITORIA - ${action}`);
    
    embed.addFields({
      name: '                    ',
      value: `**[ USUÁRIO ]** ${user}\n` +
             `**[ AÇÃO ]** ${action}\n` +
             `**[ DATA/HORA ]** ${timestamp.toLocaleString('pt-BR')}`,
      inline: false
    });

    if (details) {
      embed.addFields({
        name: '                    ',
        value: `**[ DETALHES ]** ${details}`,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Template de notificação do sistema
   */
  systemNotification(title, message, severity = 'info') {
    const colors = {
      info: this.builder.colors.info,
      warning: this.builder.colors.warning,
      error: this.builder.colors.error,
      success: this.builder.colors.success
    };

    const embed = this.builder.createBase({ color: colors[severity] });
    
    embed.setTitle(`NOTIFICAÇÃO DO SISTEMA - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: `**[ MENSAGEM ]** ${message}`,
      inline: false
    });

    embed.addFields({
      name: '                    ',
      value: `**[ ORIGEM ]** SISTEMA PSO BRASIL`,
      inline: false
    });

    return embed;
  }

  /**
   * Template de relatório
   */
  report(title, data, type = 'GERAL') {
    const embed = this.builder.createBase({ color: this.builder.colors.info });
    
    embed.setTitle(`RELATÓRIO - ${title}`);
    
    embed.addFields({
      name: '                    ',
      value: `**[ TIPO ]** ${type}\n` +
             `**[ DATA DE GERAÇÃO ]** ${new Date().toLocaleString('pt-BR')}`,
      inline: false
    });

    if (Array.isArray(data)) {
      const dataList = data.map((item, index) => 
        `**[ ITEM ${index + 1} ]** ${JSON.stringify(item)}`
      ).join('\n');

      embed.addFields({
        name: '                    ',
        value: dataList,
        inline: false
      });
    } else {
      const dataText = Object.entries(data)
        .map(([key, value]) => `**[ ${key.toUpperCase()} ]** ${value}`)
        .join('\n');

      embed.addFields({
        name: '                    ',
        value: dataText,
        inline: false
      });
    }

    return embed;
  }
}

module.exports = EmbedTemplates;
