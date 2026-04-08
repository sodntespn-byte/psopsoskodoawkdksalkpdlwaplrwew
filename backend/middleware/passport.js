const passport = require('passport');
const { User } = require('../models');

// Configure Google OAuth Strategy only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ where: { googleId: profile.id } });
        
        if (user) {
            // Update avatar URL if changed
            if (profile.photos && profile.photos[0] && user.avatarUrl !== profile.photos[0].value) {
                user.avatarUrl = profile.photos[0].value;
                await user.save();
            }
            return done(null, user);
        }
        
        // Check if user exists with this email
        user = await User.findOne({ where: { email: profile.emails[0].value } });
        
        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            if (profile.photos && profile.photos[0]) {
                user.avatarUrl = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        const newUser = await User.create({
            username: profile.displayName.replace(/\s+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1000),
            email: profile.emails[0].value,
            password: Math.random().toString(36).substring(2, 15), // Random password for OAuth users
            googleId: profile.id,
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            name: profile.displayName
        });
        
        return done(null, newUser);
    } catch (error) {
        return done(error, null);
    }
}));
} else {
    console.log('[PASSPORT] Google OAuth não configurado - pulando estratégia OAuth');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
