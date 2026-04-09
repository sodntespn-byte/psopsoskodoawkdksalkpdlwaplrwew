/**
 * PSO BRASIL - Lobby API Routes
 * Sistema de busca de time em tempo real
 */

const express = require('express');
const router = express.Router();
const { LobbyPlayer } = require('../models');
const { Op } = require('sequelize');

// GET /api/lobby - Obter jogadores ativos no lobby
router.get('/', async (req, res) => {
    try {
        // Limpar expirados
        await LobbyPlayer.destroy({
            where: {
                expires_at: { [Op.lt]: new Date() },
                status: 'searching'
            }
        });

        // Buscar ativos
        const players = await LobbyPlayer.findAll({
            where: {
                status: 'searching',
                expires_at: { [Op.gt]: new Date() }
            },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'discord_id', 'username', 'avatar_url', 'posicao', 'mensagem', 'created_at']
        });

        res.json({
            success: true,
            count: players.length,
            players: players,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao obter lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter jogadores do lobby'
        });
    }
});

// POST /api/lobby - Adicionar jogador ao lobby (usado pelo bot)
router.post('/', async (req, res) => {
    try {
        const { discord_id, username, avatar_url, posicao, mensagem, message_id, channel_id } = req.body;

        if (!discord_id || !username || !posicao) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos'
            });
        }

        // Calcular expiração (30 minutos)
        const expires_at = new Date(Date.now() + 30 * 60 * 1000);

        // Remover busca anterior do mesmo jogador
        await LobbyPlayer.destroy({ where: { discord_id } });

        // Criar nova entrada
        const player = await LobbyPlayer.create({
            discord_id,
            username,
            avatar_url: avatar_url || null,
            posicao,
            mensagem: mensagem || null,
            status: 'searching',
            expires_at,
            message_id: message_id || null,
            channel_id: channel_id || null
        });

        res.json({
            success: true,
            player: player,
            message: 'Jogador adicionado ao lobby'
        });
    } catch (error) {
        console.error('Erro ao adicionar ao lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao adicionar jogador ao lobby'
        });
    }
});

// DELETE /api/lobby/:discord_id - Remover jogador do lobby
router.delete('/:discord_id', async (req, res) => {
    try {
        const { discord_id } = req.params;

        const result = await LobbyPlayer.destroy({ where: { discord_id } });

        if (result === 0) {
            return res.status(404).json({
                success: false,
                error: 'Jogador não encontrado no lobby'
            });
        }

        res.json({
            success: true,
            message: 'Jogador removido do lobby'
        });
    } catch (error) {
        console.error('Erro ao remover do lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao remover jogador do lobby'
        });
    }
});

// GET /api/lobby/check/:discord_id - Verificar se jogador está no lobby
router.get('/check/:discord_id', async (req, res) => {
    try {
        const { discord_id } = req.params;

        const player = await LobbyPlayer.findOne({
            where: {
                discord_id,
                status: 'searching',
                expires_at: { [Op.gt]: new Date() }
            }
        });

        res.json({
            success: true,
            isSearching: !!player,
            player: player || null
        });
    } catch (error) {
        console.error('Erro ao verificar lobby:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar status do lobby'
        });
    }
});

module.exports = router;
