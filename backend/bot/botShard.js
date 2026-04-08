/**
 * Individual Shard File
 * Cada shard executa esta instância do bot
 */

const PSODiscordBot = require('./botHandler');

async function startShard() {
  const bot = new PSODiscordBot();
  
  try {
    await bot.initialize();
    await bot.login();
    
    console.log(`[SHARD ${process.env.SHARD_ID || 0}] Bot iniciado com sucesso`);
  } catch (error) {
    console.error(`[SHARD ${process.env.SHARD_ID || 0}] Erro ao iniciar:`, error);
    process.exit(1);
  }
}

startShard();
