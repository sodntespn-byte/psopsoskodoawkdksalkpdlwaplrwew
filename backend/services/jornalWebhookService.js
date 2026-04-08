/**
 * Serviço de Webhook para o Jornal PSO Brasil
 * Integração com Discord - Canal #jornal-pso
 * Template profissional institucional
 */

const axios = require('axios');

class JornalWebhookService {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.logoUrl = process.env.LOGO_URL || 'https://psobr.squareweb.app/images/logo.png';
    }

    /**
     * Envia notificação para o Discord quando uma nova notícia for publicada
     * @param {Object} dadosNoticia - Dados da notícia do banco de dados
     * @returns {Promise<Object>} - Resultado do envio
     */
    async notificarJornalPSO(dadosNoticia) {
        try {
            if (!this.webhookUrl) {
                console.error('[JORNAL WEBHOOK] URL do webhook não configurada');
                return { success: false, error: 'Webhook URL not configured' };
            }

            // Preparar dados do embed
            const embed = this._criarEmbedNoticia(dadosNoticia);

            // Enviar para o Discord
            const payload = {
                username: 'IMPRENSA PSO BRASIL',
                avatar_url: this.logoUrl,
                embeds: [embed]
            };

            const response = await axios.post(this.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            console.log(`[JORNAL WEBHOOK] Notícia enviada com sucesso: ${dadosNoticia.titulo}`);
            return { success: true, data: response.data };

        } catch (error) {
            console.error('[JORNAL WEBHOOK] Erro ao enviar notícia:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cria o embed profissional para o Discord
     * @param {Object} dadosNoticia - Dados da notícia
     * @returns {Object} - Embed formatado
     */
    _criarEmbedNoticia(dadosNoticia) {
        // Transformar título para UPPERCASE
        const tituloUpper = (dadosNoticia.titulo || 'SEM TITULO').toUpperCase();
        
        // Formatar data
        const dataPublicacao = dadosNoticia.created_at 
            ? new Date(dadosNoticia.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : new Date().toLocaleString('pt-BR');

        // Categoria padrão se não informada
        const categoria = (dadosNoticia.categoria || 'COMUNICADO').toUpperCase();
        
        // Autor da redação
        const redacao = dadosNoticia.autor || 'REDAÇÃO PSO BRASIL';

        // Imagem principal (usar placeholder se não existir)
        const imagemPrincipal = dadosNoticia.imagem_url || this.logoUrl;
        
        // Thumbnail (bandeira do Brasil ou logo)
        const thumbnailUrl = dadosNoticia.thumbnail_url || 'https://flagcdn.com/w160/br.png';

        // Cor verde sólido #00FF00
        const corEmbed = 0x00FF00;

        return {
            title: tituloUpper,
            description: dadosNoticia.conteudo || 'Sem descrição disponível.',
            color: corEmbed,
            author: {
                name: 'IMPRENSA PSO BRASIL',
                icon_url: this.logoUrl
            },
            image: {
                url: imagemPrincipal
            },
            thumbnail: {
                url: thumbnailUrl
            },
            fields: [
                {
                    name: 'CATEGORIA',
                    value: categoria,
                    inline: true
                },
                {
                    name: 'REDAÇÃO',
                    value: redacao.toUpperCase(),
                    inline: true
                },
                {
                    name: 'DATA E HORA',
                    value: dataPublicacao,
                    inline: true
                }
            ],
            footer: {
                text: 'SISTEMA DE INFORMACOES PSO BRASIL | CANAL OFICIAL DE NOTICIAS'
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Verifica se o webhook está configurado corretamente
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.webhookUrl;
    }
}

module.exports = new JornalWebhookService();
