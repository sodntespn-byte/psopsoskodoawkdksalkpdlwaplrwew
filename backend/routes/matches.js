/**
 * PSO BRASIL - Matches/Calendar API Routes
 * Sistema de calendário de jogos
 */

const express = require('express');
const router = express.Router();
const { Match, MatchTeam, User, Tournament } = require('../models');
const { Op } = require('sequelize');

// GET /api/matches - Listar todos os jogos
router.get('/', async (req, res) => {
    try {
        const { status, round, tournamentId, limit = 50 } = req.query;
        
        const where = {};
        if (status) where.status = status;
        if (round) where.round = round;
        if (tournamentId) where.tournamentId = tournamentId;
        
        const matches = await Match.findAll({
            where,
            limit: parseInt(limit),
            order: [['matchDate', 'ASC'], ['matchTime', 'ASC']],
            include: [
                {
                    model: MatchTeam,
                    as: 'teams',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'avatar_url']
                        }
                    ]
                },
                {
                    model: Tournament,
                    as: 'tournament',
                    attributes: ['id', 'name', 'type']
                }
            ]
        });
        
        res.json({
            success: true,
            count: matches.length,
            matches: matches.map(m => ({
                id: m.id,
                tournament: m.tournament ? {
                    id: m.tournament.id,
                    name: m.tournament.name
                } : null,
                round: m.round,
                stage: m.stage,
                matchDate: m.matchDate,
                matchTime: m.matchTime,
                status: m.status,
                streamUrl: m.streamUrl,
                teams: m.teams ? m.teams.map(t => ({
                    id: t.id,
                    teamName: t.teamName,
                    score: t.score,
                    user: t.user ? {
                        id: t.user.id,
                        username: t.user.username,
                        avatar_url: t.user.avatar_url
                    } : null
                })) : [],
                createdAt: m.createdAt
            }))
        });
    } catch (error) {
        console.error('Erro ao listar jogos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar jogos'
        });
    }
});

// GET /api/matches/:id - Obter detalhes de um jogo
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const match = await Match.findByPk(id, {
            include: [
                {
                    model: MatchTeam,
                    as: 'teams',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'avatar_url', 'profile_color']
                        }
                    ]
                },
                {
                    model: Tournament,
                    as: 'tournament'
                }
            ]
        });
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Jogo não encontrado'
            });
        }
        
        res.json({
            success: true,
            match: {
                id: match.id,
                tournament: match.tournament,
                round: match.round,
                stage: match.stage,
                matchDate: match.matchDate,
                matchTime: match.matchTime,
                status: match.status,
                streamUrl: match.streamUrl,
                description: match.description,
                teams: match.teams,
                createdAt: match.createdAt,
                updatedAt: match.updatedAt
            }
        });
    } catch (error) {
        console.error('Erro ao buscar jogo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar jogo'
        });
    }
});

// POST /api/matches - Criar novo jogo (admin/bot)
router.post('/', async (req, res) => {
    try {
        const { 
            tournamentId, 
            team1Name, 
            team2Name, 
            matchDate, 
            matchTime, 
            round = 'Rodada 1',
            stage = 'grupos',
            streamUrl,
            description 
        } = req.body;
        
        // Criar o jogo
        const match = await Match.create({
            tournamentId: tournamentId || null,
            round,
            stage,
            matchDate,
            matchTime,
            status: 'scheduled',
            streamUrl: streamUrl || null,
            description: description || null
        });
        
        // Criar os times
        await MatchTeam.bulkCreate([
            {
                matchId: match.id,
                teamName: team1Name,
                score: 0
            },
            {
                matchId: match.id,
                teamName: team2Name,
                score: 0
            }
        ]);
        
        // Buscar o jogo completo
        const completeMatch = await Match.findByPk(match.id, {
            include: [
                {
                    model: MatchTeam,
                    as: 'teams'
                },
                {
                    model: Tournament,
                    as: 'tournament'
                }
            ]
        });
        
        res.status(201).json({
            success: true,
            message: 'Jogo criado com sucesso',
            match: completeMatch
        });
    } catch (error) {
        console.error('Erro ao criar jogo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar jogo'
        });
    }
});

// PUT /api/matches/:id - Atualizar jogo
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { matchDate, matchTime, status, streamUrl, round, stage } = req.body;
        
        const match = await Match.findByPk(id);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Jogo não encontrado'
            });
        }
        
        const updates = {};
        if (matchDate) updates.matchDate = matchDate;
        if (matchTime) updates.matchTime = matchTime;
        if (status) updates.status = status;
        if (streamUrl !== undefined) updates.streamUrl = streamUrl;
        if (round) updates.round = round;
        if (stage) updates.stage = stage;
        
        await match.update(updates);
        
        res.json({
            success: true,
            message: 'Jogo atualizado com sucesso',
            match
        });
    } catch (error) {
        console.error('Erro ao atualizar jogo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar jogo'
        });
    }
});

// POST /api/matches/:id/result - Atualizar resultado
router.post('/:id/result', async (req, res) => {
    try {
        const { id } = req.params;
        const { team1Score, team2Score } = req.body;
        
        const match = await Match.findByPk(id, {
            include: [{ model: MatchTeam, as: 'teams' }]
        });
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Jogo não encontrado'
            });
        }
        
        if (!match.teams || match.teams.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Jogo não tem times definidos'
            });
        }
        
        // Atualizar placares
        await match.teams[0].update({ score: parseInt(team1Score) || 0 });
        await match.teams[1].update({ score: parseInt(team2Score) || 0 });
        
        // Atualizar status para finalizado
        await match.update({ status: 'finished' });
        
        // Buscar jogo atualizado
        const updatedMatch = await Match.findByPk(id, {
            include: [
                {
                    model: MatchTeam,
                    as: 'teams',
                    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar_url'] }]
                },
                { model: Tournament, as: 'tournament' }
            ]
        });
        
        res.json({
            success: true,
            message: 'Resultado atualizado com sucesso',
            match: updatedMatch
        });
    } catch (error) {
        console.error('Erro ao atualizar resultado:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar resultado'
        });
    }
});

// GET /api/matches/rounds/list - Listar rodadas disponíveis
router.get('/rounds/list', async (req, res) => {
    try {
        const rounds = await Match.findAll({
            attributes: ['round', 'stage'],
            group: ['round', 'stage'],
            order: [['round', 'ASC']]
        });
        
        res.json({
            success: true,
            rounds: rounds.map(r => ({
                round: r.round,
                stage: r.stage
            }))
        });
    } catch (error) {
        console.error('Erro ao listar rodadas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar rodadas'
        });
    }
});

module.exports = router;
