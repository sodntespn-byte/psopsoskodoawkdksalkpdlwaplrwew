/**
 * PSO Brasil - Analytics API Routes
 * Sistema de monitoramento e análise de usuários
 */

const express = require('express');
const router = express.Router();
const { SiteAnalytics } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Verificar recorde de acessos
let currentPeakRecord = 0;
let lastPeakNotification = 0;

async function checkPeakRecord() {
    try {
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
        if (currentOnline > currentPeakRecord) {
            currentPeakRecord = currentOnline;
            
            // Notificar bot (enviar webhook ou salvar para notificação)
            console.log(`[ANALYTICS] 🚀 NOVO RECORDE! ${currentOnline} usuários online!`);
            
            // Guardar no banco para o bot consultar
            const { SiteSetting } = require('../models');
            await SiteSetting.upsert({
                key: 'peak_online_record',
                value: currentOnline.toString(),
                type: 'number',
                category: 'feature',
                description: 'Recorde de usuários online simultâneos'
            });
            
            await SiteSetting.upsert({
                key: 'peak_record_timestamp',
                value: new Date().toISOString(),
                type: 'string',
                category: 'feature',
                description: 'Timestamp do último recorde'
            });
        }
        
        return currentOnline;
    } catch (error) {
        console.error('[ANALYTICS] Erro ao verificar recorde:', error);
        return 0;
    }
}

// POST /api/analytics/track - Registrar evento de analytics
router.post('/track', async (req, res) => {
    try {
        const {
            session_id,
            page_visited,
            device_type,
            user_id,
            last_action,
            time_spent_seconds,
            referrer,
            is_new_user,
            is_exit,
            event
        } = req.body;

        if (!session_id || !page_visited) {
            return res.status(400).json({
                success: false,
                error: 'session_id e page_visited são obrigatórios'
            });
        }

        const userAgent = req.headers['user-agent'];
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Se for evento de saída, atualizar registro anterior
        if (is_exit) {
            const lastRecord = await SiteAnalytics.findOne({
                where: {
                    session_id,
                    exit_time: null
                },
                order: [['entry_time', 'DESC']]
            });

            if (lastRecord) {
                await lastRecord.update({
                    exit_time: new Date(),
                    last_action: last_action || 'exit',
                    time_spent_seconds: time_spent_seconds || Math.floor((new Date() - lastRecord.entry_time) / 1000)
                });

                console.log(`[ANALYTICS] Saída registrada: ${lastRecord.page_visited}, tempo: ${lastRecord.time_spent_seconds}s`);
            }

            return res.json({
                success: true,
                message: 'Saída registrada'
            });
        }

        // Criar novo registro de entrada
        const analytics = await SiteAnalytics.create({
            session_id,
            page_visited,
            device_type: device_type || 'desktop',
            user_id: user_id || null,
            entry_time: new Date(),
            referrer: referrer || req.headers.referer,
            user_agent: userAgent,
            ip_address: ipAddress ? ipAddress.split(',')[0].trim() : null,
            is_new_user: is_new_user || false
        });

        console.log(`[ANALYTICS] Nova sessão: ${page_visited}, device: ${device_type}, user: ${user_id || 'visitante'}`);

        // Verificar recorde de acessos (não bloqueia a resposta)
        checkPeakRecord().catch(() => {});

        res.json({
            success: true,
            analytics_id: analytics.id
        });

    } catch (error) {
        console.error('[ANALYTICS] Erro ao registrar:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao registrar analytics'
        });
    }
});

// POST /api/analytics/page-change - Registrar mudança de página
router.post('/page-change', async (req, res) => {
    try {
        const { session_id, from_page, to_page, time_spent_seconds, device_type, user_id } = req.body;

        if (!session_id || !to_page) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos'
            });
        }

        // Fechar registro anterior
        if (from_page) {
            const lastRecord = await SiteAnalytics.findOne({
                where: {
                    session_id,
                    page_visited: from_page,
                    exit_time: null
                },
                order: [['entry_time', 'DESC']]
            });

            if (lastRecord) {
                await lastRecord.update({
                    exit_time: new Date(),
                    last_action: `navigate_to_${to_page}`,
                    time_spent_seconds: time_spent_seconds || Math.floor((new Date() - lastRecord.entry_time) / 1000)
                });
            }
        }

        // Criar novo registro
        const analytics = await SiteAnalytics.create({
            session_id,
            page_visited: to_page,
            device_type: device_type || 'desktop',
            user_id: user_id || null,
            entry_time: new Date()
        });

        console.log(`[ANALYTICS] Navegação: ${from_page || 'inicio'} -> ${to_page}`);

        res.json({
            success: true,
            analytics_id: analytics.id
        });

    } catch (error) {
        console.error('[ANALYTICS] Erro ao registrar mudança:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao registrar mudança de página'
        });
    }
});

// GET /api/analytics/report - Gerar relatório de analytics (Admin only)
router.get('/report', async (req, res) => {
    try {
        // Verificar se é admin (simplificado)
        const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_SECRET_KEY;
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }

        const { period = '24h' } = req.query;

        // Calcular data de início baseada no período
        let startDate = new Date();
        if (period === '24h') startDate.setHours(startDate.getHours() - 24);
        else if (period === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (period === '30d') startDate.setDate(startDate.getDate() - 30);

        // Buscar dados do período
        const analytics = await SiteAnalytics.findAll({
            where: {
                entry_time: { [Op.gte]: startDate }
            },
            order: [['entry_time', 'DESC']]
        });

        // Calcular métricas
        const totalSessions = analytics.length;
        const uniqueUsers = new Set(analytics.map(a => a.session_id)).size;
        const newUsers = analytics.filter(a => a.is_new_user).length;

        // Taxa de rejeição por página
        const pageStats = {};
        analytics.forEach(a => {
            if (!pageStats[a.page_visited]) {
                pageStats[a.page_visited] = { visits: 0, exits: 0, totalTime: 0 };
            }
            pageStats[a.page_visited].visits++;
            if (a.exit_time) pageStats[a.page_visited].exits++;
            if (a.time_spent_seconds) pageStats[a.page_visited].totalTime += a.time_spent_seconds;
        });

        // Calcular taxa de rejeição
        const bounceRates = {};
        Object.keys(pageStats).forEach(page => {
            const stats = pageStats[page];
            bounceRates[page] = {
                visits: stats.visits,
                bounceRate: stats.visits > 0 ? ((stats.exits / stats.visits) * 100).toFixed(1) : 0,
                avgTime: stats.visits > 0 ? Math.round(stats.totalTime / stats.visits) : 0
            };
        });

        // Fluxo popular (sequência de páginas mais comum)
        const sessions = {};
        analytics.forEach(a => {
            if (!sessions[a.session_id]) sessions[a.session_id] = [];
            sessions[a.session_id].push(a.page_visited);
        });

        // Dispositivos
        const deviceStats = { mobile: 0, desktop: 0, tablet: 0 };
        analytics.forEach(a => {
            if (deviceStats[a.device_type] !== undefined) {
                deviceStats[a.device_type]++;
            }
        });

        // Gerar sugestões baseadas nos dados
        const suggestions = [];
        
        // Sugestão baseada em taxa de rejeição
        const highBouncePages = Object.entries(bounceRates)
            .filter(([page, stats]) => stats.bounceRate > 70 && stats.visits > 5)
            .map(([page]) => page);
        
        if (highBouncePages.length > 0) {
            suggestions.push(`📉 Alta taxa de rejeição em: ${highBouncePages.join(', ')}. Considere melhorar o conteúdo ou UX.`);
        }

        // Sugestão baseada em tempo médio
        const lowTimePages = Object.entries(bounceRates)
            .filter(([page, stats]) => stats.avgTime < 10 && stats.visits > 5)
            .map(([page]) => page);
        
        if (lowTimePages.length > 0) {
            suggestions.push(`⏱️ Tempo de permanência baixo em: ${lowTimePages.join(', ')}. Adicione conteúdo mais engajante.`);
        }

        // Sugestão de dispositivos
        if (deviceStats.mobile > deviceStats.desktop) {
            suggestions.push('📱 A maioria dos usuários acessa via mobile. Otimize a experiência mobile.');
        }

        res.json({
            success: true,
            period,
            summary: {
                totalSessions,
                uniqueUsers,
                newUsers,
                returnRate: totalSessions > 0 ? (((totalSessions - newUsers) / totalSessions) * 100).toFixed(1) : 0
            },
            pageStats: bounceRates,
            deviceStats,
            suggestions,
            rawData: analytics.slice(0, 100) // Últimos 100 registros para análise detalhada
        });

    } catch (error) {
        console.error('[ANALYTICS] Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar relatório'
        });
    }
});

// GET /api/analytics/live-stats - Estatísticas em tempo real
router.get('/live-stats', async (req, res) => {
    try {
        // Buscar sessões ativas (últimos 5 minutos)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const activeSessions = await SiteAnalytics.findAll({
            where: {
                entry_time: { [Op.gte]: fiveMinutesAgo },
                exit_time: null
            },
            order: [['entry_time', 'DESC']]
        });

        // Calcular estatísticas
        const uniqueSessions = new Set(activeSessions.map(s => s.session_id)).size;
        const pageDistribution = {};
        const deviceDistribution = { mobile: 0, desktop: 0, tablet: 0 };
        
        activeSessions.forEach(session => {
            // Página
            pageDistribution[session.page_visited] = (pageDistribution[session.page_visited] || 0) + 1;
            
            // Dispositivo
            if (deviceDistribution[session.device_type] !== undefined) {
                deviceDistribution[session.device_type]++;
            }
        });

        // Calcular recorde de acessos simultâneos
        const currentOnline = uniqueSessions;
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            current_online: currentOnline,
            active_sessions: activeSessions.slice(0, 50), // Últimas 50 sessões
            page_distribution: pageDistribution,
            device_distribution: deviceDistribution,
            peak_record: currentOnline // Será atualizado via bot
        });

    } catch (error) {
        console.error('[ANALYTICS] Erro ao buscar live-stats:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas em tempo real'
        });
    }
});

// GET /api/analytics/retention - Dados de retenção para gráfico
router.get('/retention', async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        
        let startDate = new Date();
        if (period === '24h') startDate.setHours(startDate.getHours() - 24);
        else if (period === '7d') startDate.setDate(startDate.getDate() - 7);
        
        // Buscar todas as sessões do período
        const sessions = await SiteAnalytics.findAll({
            where: {
                entry_time: { [Op.gte]: startDate }
            }
        });

        // Agrupar por minuto de saída
        const retentionByMinute = {};
        
        sessions.forEach(session => {
            if (session.time_spent_seconds) {
                const minute = Math.floor(session.time_spent_seconds / 60);
                retentionByMinute[minute] = (retentionByMinute[minute] || 0) + 1;
            }
        });

        // Converter para array ordenado
        const retentionData = Object.entries(retentionByMinute)
            .map(([minute, count]) => ({ minute: parseInt(minute), count }))
            .sort((a, b) => a.minute - b.minute);

        res.json({
            success: true,
            period,
            retention_data: retentionData,
            total_sessions: sessions.length
        });

    } catch (error) {
        console.error('[ANALYTICS] Erro ao buscar retenção:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados de retenção'
        });
    }
});

module.exports = router;
