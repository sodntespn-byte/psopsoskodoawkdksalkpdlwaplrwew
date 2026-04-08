const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');
const jwt = require('jsonwebtoken');

// Google OAuth login route
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Google OAuth callback route
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: req.user.id, 
                email: req.user.email,
                username: req.user.username 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        // Redirect to frontend with token
        res.redirect(`/?auth=success&token=${token}&user=${encodeURIComponent(req.user.username)}`);
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.redirect('/');
    });
});

// Get current user info
router.get('/me', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Não autenticado' });
    }
    
    res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        googleId: req.user.googleId
    });
});

module.exports = router;
