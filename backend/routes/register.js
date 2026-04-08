const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { body, validationResult } = require('express-validator');

/**
 * Rota de Registro - Cria nova conta vinculada ao Discord
 * POST /api/register
 */
router.post('/register', [
  // Validação
  body('discordId')
    .trim()
    .isNumeric()
    .isLength({ min: 17, max: 20 })
    .withMessage('ID do Discord inválido'),
  body('discordUsername')
    .trim()
    .isLength({ min: 2, max: 37 })
    .withMessage('Username do Discord inválido'),
  body('siteUsername')
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,20}$/)
    .withMessage('Username do site deve ter 3-20 caracteres (letras, números, underline)')
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { discordId, discordUsername, siteUsername } = req.body;

    // Verificar se Discord ID já existe
    const existingDiscordId = await User.findOne({
      where: { discordId: discordId.toString() }
    });

    if (existingDiscordId) {
      return res.status(409).json({
        error: 'Este ID do Discord já está registrado',
        field: 'discordId'
      });
    }

    // Verificar se username do Discord já existe
    const existingDiscordUsername = await User.findOne({
      where: { discordUsername: discordUsername.toString() }
    });

    if (existingDiscordUsername) {
      return res.status(409).json({
        error: 'Este username do Discord já está registrado',
        field: 'discordUsername'
      });
    }

    // Verificar se username do site já existe
    const existingSiteUsername = await User.findOne({
      where: { username: siteUsername.toString() }
    });

    if (existingSiteUsername) {
      return res.status(409).json({
        error: 'Este nome de usuário já está em uso',
        field: 'siteUsername'
      });
    }

    // Criar novo usuário
    const newUser = await User.create({
      username: siteUsername,
      discordId: discordId.toString(),
      discordUsername: discordUsername.toString(),
      email: `${discordId}@discord.temp`, // Email temporário
      password: require('crypto').randomBytes(32).toString('hex'), // Senha aleatória
      rank: 1000, // Rating inicial
      wins: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      region: 'BR',
      isOnline: false,
      lastLogin: new Date(),
      bio: 'Novo jogador na liga PSO Brasil!',
      playStyle: 'balanced',
      totalMatches: 0,
      winRate: 0,
      goalsPerMatch: 0,
      assistsPerMatch: 0,
      isAdmin: false
    });

    console.log(`[REGISTER] Novo usuário criado: ${siteUsername} (Discord: ${discordUsername})`);

    // Tentar enviar DM de boas-vindas via bot (se disponível)
    try {
      const botHandler = req.app.get('botHandler');
      if (botHandler && botHandler.notificationService) {
        await botHandler.notificationService.sendWelcomeDM(
          discordId,
          siteUsername,
          discordUsername
        );
      }
    } catch (dmError) {
      console.log('[REGISTER] Não foi possível enviar DM:', dmError.message);
      // Não falhar o registro se DM não enviar
    }

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      user: {
        id: newUser.id,
        username: newUser.username,
        discordId: newUser.discordId,
        rank: newUser.rank
      }
    });

  } catch (error) {
    console.error('[REGISTER] Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
});

/**
 * Verificar disponibilidade de username
 * GET /api/register/check-username/:username
 */
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Validar formato
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.json({ available: false, reason: 'formato_invalido' });
    }

    const existing = await User.findOne({ where: { username } });
    
    res.json({
      available: !existing,
      username: username
    });
  } catch (error) {
    console.error('[REGISTER] Erro ao verificar username:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Verificar disponibilidade de Discord ID
 * GET /api/register/check-discord/:discordId
 */
router.get('/check-discord/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    
    const existing = await User.findOne({ 
      where: { discordId: discordId.toString() } 
    });
    
    res.json({
      available: !existing,
      discordId: discordId
    });
  } catch (error) {
    console.error('[REGISTER] Erro ao verificar Discord ID:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
