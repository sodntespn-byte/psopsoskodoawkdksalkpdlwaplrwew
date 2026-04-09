/**
 * PSO BRASIL - Config API Routes
 * Rotas para leitura de configurações dinâmicas do site
 */

const express = require('express');
const router = express.Router();
const { SiteConfig } = require('../models');

// GET /api/config - Obter todas as configurações públicas
router.get('/', async (req, res) => {
    try {
        const configs = await SiteConfig.findAll({
            attributes: ['key', 'value', 'type', 'category']
        });

        const configMap = {};
        configs.forEach(config => {
            let value = config.value;
            
            // Converter valor baseado no tipo
            switch (config.type) {
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'number':
                    value = parseFloat(value);
                    break;
                case 'json':
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = null;
                    }
                    break;
            }
            
            configMap[config.key] = value;
        });

        res.json({
            success: true,
            configs: configMap,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao obter configurações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter configurações'
        });
    }
});

// GET /api/config/:key - Obter configuração específica
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        const config = await SiteConfig.findByPk(key);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuração não encontrada'
            });
        }

        let value = config.value;
        
        // Converter valor baseado no tipo
        switch (config.type) {
            case 'boolean':
                value = value === 'true';
                break;
            case 'number':
                value = parseFloat(value);
                break;
            case 'json':
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = null;
                }
                break;
        }

        res.json({
            success: true,
            key: config.key,
            value: value,
            type: config.type,
            category: config.category,
            modified_at: config.modified_at
        });
    } catch (error) {
        console.error('Erro ao obter configuração:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter configuração'
        });
    }
});

// GET /api/config/css/variables - Obter variáveis CSS dinâmicas
router.get('/css/variables', async (req, res) => {
    try {
        const configs = await SiteConfig.findAll({
            where: {
                category: ['appearance', 'content']
            },
            attributes: ['key', 'value', 'type']
        });

        let cssVariables = ':root {\n';
        
        configs.forEach(config => {
            // Converter para formato CSS variable
            const varName = `--${config.key.replace(/_/g, '-')}`;
            let varValue = config.value;
            
            if (config.type === 'color' || config.key.includes('color')) {
                varValue = config.value;
            }
            
            cssVariables += `  ${varName}: ${varValue};\n`;
        });
        
        cssVariables += '}';

        res.setHeader('Content-Type', 'text/css');
        res.send(cssVariables);
    } catch (error) {
        console.error('Erro ao gerar CSS variables:', error);
        res.status(500).send('/* Erro ao gerar variáveis CSS */');
    }
});

module.exports = router;
