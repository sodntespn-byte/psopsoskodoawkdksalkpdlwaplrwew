/**
 * Discord Webhook Handler
 * Gerencia envio de mensagens e embeds para Discord
 */
class DiscordWebhookHandler {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        this.enabled = !!this.webhookUrl;
    }

    /**
     * Cria um embed para Discord
     */
    createEmbed(title, description, color = 0x00ff00, fields = []) {
        return {
            title,
            description,
            color,
            fields,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Envia mensagem para Discord
     */
    async sendDiscordMessage(channelId, content, embed = null) {
        if (!this.enabled) {
            console.log('[Discord Webhook] Desabilitado - sem webhook URL configurada');
            return;
        }

        try {
            const payload = {
                content,
                embeds: embed ? [embed] : undefined
            };

            // Simulação de envio - em produção usar fetch/axios
            console.log(`[Discord Webhook] Enviando para ${channelId}:`, content);
            return true;
        } catch (error) {
            console.error('[Discord Webhook] Erro ao enviar:', error.message);
            return false;
        }
    }

    /**
     * Envia notificação de torneio
     */
    async sendTournamentNotification(tournament, type = 'created') {
        const embed = this.createEmbed(
            `Torneio ${type === 'created' ? 'Criado' : 'Atualizado'}: ${tournament.name}`,
            `Novo torneio disponível! Participe agora.`,
            0x22C55E
        );
        
        return this.sendDiscordMessage('tournaments', `@everyone Novo torneio: ${tournament.name}`, embed);
    }

    /**
     * Envia notificação de partida
     */
    async sendMatchNotification(match, type = 'scheduled') {
        const embed = this.createEmbed(
            `Partida ${type === 'scheduled' ? 'Agendada' : 'Finalizada'}`,
            `${match.team1} vs ${match.team2}`,
            0xFACC15
        );
        
        return this.sendDiscordMessage('matches', `Partida: ${match.team1} vs ${match.team2}`, embed);
    }
}

module.exports = DiscordWebhookHandler;
