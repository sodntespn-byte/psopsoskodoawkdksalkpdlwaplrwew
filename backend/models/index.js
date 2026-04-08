const { sequelize } = require('../db/database');
const User = require('./User');
const Tournament = require('./Tournament');
const Match = require('./Match');
const MatchTeam = require('./MatchTeam');
const TournamentParticipant = require('./TournamentParticipant');
const DiscordEvent = require('./DiscordEvent');
const Notification = require('./Notification');
const NotificationPreference = require('./NotificationPreference');
const NotificationTemplate = require('./NotificationTemplate');

// Definir associações
User.hasMany(TournamentParticipant, { foreignKey: 'userId', as: 'participants' });
TournamentParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Tournament.hasMany(TournamentParticipant, { foreignKey: 'tournamentId', as: 'participants' });
TournamentParticipant.belongsTo(Tournament, { foreignKey: 'tournamentId', as: 'tournament' });

Tournament.hasMany(Match, { foreignKey: 'tournamentId', as: 'matches' });
Match.belongsTo(Tournament, { foreignKey: 'tournamentId', as: 'tournament' });

Match.hasMany(MatchTeam, { foreignKey: 'matchId', as: 'teams' });
MatchTeam.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

User.hasMany(MatchTeam, { foreignKey: 'userId', as: 'matchTeams' });
MatchTeam.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(DiscordEvent, { foreignKey: 'userId', as: 'discordEvents' });
DiscordEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Tournament.hasMany(DiscordEvent, { foreignKey: 'tournamentId', as: 'discordEvents' });
DiscordEvent.belongsTo(Tournament, { foreignKey: 'tournamentId', as: 'tournament' });

Match.hasMany(DiscordEvent, { foreignKey: 'matchId', as: 'discordEvents' });
DiscordEvent.belongsTo(Match, { foreignKey: 'matchId', as: 'match' });

// Associações de Notificações
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(NotificationPreference, { foreignKey: 'userId', as: 'notificationPreferences' });
NotificationPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

NotificationPreference.belongsTo(NotificationTemplate, { foreignKey: 'type', sourceKey: 'type', targetKey: 'type', as: 'template' });

module.exports = {
    sequelize,
    User,
    Tournament,
    Match,
    MatchTeam,
    TournamentParticipant,
    DiscordEvent,
    Notification,
    NotificationPreference,
    NotificationTemplate
};
