/**
 * PSO Brasil Bot - Main Entry Point
 * Sistema configurável com sharding support
 */

require('dotenv').config();
const { ShardingManager } = require('discord.js');
const path = require('path');

// Verificar variáveis de ambiente necessárias
const requiredEnvVars = ['DISCORD_BOT_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('[BOT] Erro: Variáveis de ambiente faltando:', missingVars.join(', '));
  process.exit(1);
}

// Configurar sharding manager
const manager = new ShardingManager(path.join(__dirname, 'botShard.js'), {
  token: process.env.DISCORD_BOT_TOKEN,
  totalShards: process.env.TOTAL_SHARDS || 'auto',
  respawn: true,
  shardArgs: process.argv.slice(2)
});

// Eventos do sharding manager
manager.on('shardCreate', shard => {
  console.log(`[SHARD] Shard ${shard.id} criado`);
  
  shard.on('ready', () => {
    console.log(`[SHARD] Shard ${shard.id} pronto`);
  });
  
  shard.on('disconnect', () => {
    console.warn(`[SHARD] Shard ${shard.id} desconectado`);
  });
  
  shard.on('reconnecting', () => {
    console.log(`[SHARD] Shard ${shard.id} reconectando...`);
  });
  
  shard.on('death', () => {
    console.error(`[SHARD] Shard ${shard.id} morto`);
  });
});

manager.on('launch', (shard, worker) => {
  console.log(`[SHARD] Iniciando shard ${shard.id} (Worker ${worker.id})`);
});

// Spawn shards
manager.spawn()
  .then(shards => {
    console.log(`[SHARD] ${shards.size} shards iniciados com sucesso`);
  })
  .catch(error => {
    console.error('[SHARD] Erro ao iniciar shards:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[BOT] Recebido SIGINT. Encerrando...');
  
  try {
    await manager.broadcastEval(client => client.destroy());
    console.log('[BOT] Todos os shards foram encerrados');
  } catch (error) {
    console.error('[BOT] Erro ao encerrar shards:', error);
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[BOT] Recebido SIGTERM. Encerrando...');
  
  try {
    await manager.broadcastEval(client => client.destroy());
    console.log('[BOT] Todos os shards foram encerrados');
  } catch (error) {
    console.error('[BOT] Erro ao encerrar shards:', error);
  }
  
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('[BOT] Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[BOT] Rejeição não tratada:', reason);
});
