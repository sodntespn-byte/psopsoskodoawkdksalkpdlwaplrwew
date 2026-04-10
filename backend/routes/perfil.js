/**
 * PSO BRASIL - Profile API Routes
 * Sistema de perfis de jogadores
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models');

// GET /api/perfil/:id - Obter perfil do jogador
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('[PERFIL] Buscando perfil do ID:', id);
        
        if (!id || id === 'undefined' || id === 'null') {
            console.error('[PERFIL] ID inválido recebido:', id);
            return res.status(400).json({
                success: false,
                error: 'ID inválido'
            });
        }
        
        // Buscar por username ou discord_id
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: id },
                    { discord_id: id },
                    { id: id } // Também buscar por ID numérico
                ]
            },
            attributes: [
                'id', 'username', 'email', 'discord_id', 'avatar_url', 
                'bio', 'profile_color', 'border_style', 'title', 
                'preferred_position', 'stats_gols', 'stats_assistencias', 
                'stats_jogos', 'rank', 'titles', 'createdAt', 'is_admin'
            ]
        });
        
        if (!user) {
            console.error('[PERFIL] Jogador não encontrado para ID:', id);
            return res.status(404).json({
                success: false,
                error: 'Jogador não encontrado'
            });
        }
        
        console.log('[PERFIL] Jogador encontrado:', user.username);
        
        res.json({
            success: true,
            perfil: {
                id: user.id,
                username: user.username,
                discord_id: user.discord_id,
                avatar_url: user.avatar_url,
                email: user.email,
                bio: user.bio || '',
                profile_color: user.profile_color || '#22C55E',
                border_style: user.border_style || 'solid',
                title: user.title || '',
                preferred_position: user.preferred_position || '',
                estatisticas: {
                    gols: user.stats_gols || 0,
                    assistencias: user.stats_assistencias || 0,
                    jogos: user.stats_jogos || 0
                },
                rank: user.rank || 'Iniciante',
                titulos: user.titles || 0,
                membro_desde: user.createdAt,
                is_admin: user.is_admin || false
            }
        });
    } catch (error) {
        console.error('[PERFIL] Erro ao obter perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter perfil do jogador',
            details: error.message
        });
    }
});

// PUT /api/perfil/:id - Atualizar perfil (próprio usuário ou admin)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { bio, preferred_position } = req.body;
        
        // Buscar usuário
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: id },
                    { discord_id: id }
                ]
            }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Jogador não encontrado'
            });
        }
        
        // Atualizar campos permitidos
        const updates = {};
        if (bio !== undefined) updates.bio = bio;
        if (preferred_position !== undefined) updates.preferred_position = preferred_position;
        
        await user.update(updates);
        
        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            perfil: {
                bio: user.bio,
                preferred_position: user.preferred_position
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar perfil'
        });
    }
});

// PUT /api/perfil/:id/customizar - Atualizar customização (admin only)
router.put('/:id/customizar', async (req, res) => {
    try {
        const { id } = req.params;
        const { profile_color, border_style, title } = req.body;
        
        // Verificar se é admin (simplificado - em produção verificar token)
        const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_SECRET_KEY;
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado. Apenas administradores.'
            });
        }
        
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: id },
                    { discord_id: id }
                ]
            }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Jogador não encontrado'
            });
        }
        
        // Atualizar campos de customização
        const updates = {};
        if (profile_color) updates.profile_color = profile_color;
        if (border_style) updates.border_style = border_style;
        if (title !== undefined) updates.title = title;
        
        await user.update(updates);
        
        res.json({
            success: true,
            message: 'Customização atualizada com sucesso',
            perfil: {
                username: user.username,
                profile_color: user.profile_color,
                border_style: user.border_style,
                title: user.title
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar customização:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar customização'
        });
    }
});

// POST /api/perfil/:id/stats - Atualizar estatísticas
router.post('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { gols, assistencias, jogos } = req.body;
        
        const user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: id },
                    { discord_id: id }
                ]
            }
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Jogador não encontrado'
            });
        }
        
        // Incrementar estatísticas
        const updates = {};
        if (gols) updates.stats_gols = user.stats_gols + parseInt(gols);
        if (assistencias) updates.stats_assistencias = user.stats_assistencias + parseInt(assistencias);
        if (jogos) updates.stats_jogos = user.stats_jogos + parseInt(jogos);
        
        await user.update(updates);
        
        res.json({
            success: true,
            message: 'Estatísticas atualizadas',
            estatisticas: {
                gols: user.stats_gols,
                assistencias: user.stats_assistencias,
                jogos: user.stats_jogos
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar estatísticas'
        });
    }
});

module.exports = router;
