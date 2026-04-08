const { PrismaClient } = require('@prisma/client');

// Configuração do Prisma Client com opções avançadas
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Logging de eventos para debug
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  }
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

prisma.$on('info', (e) => {
  console.log('Prisma Info:', e.message);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Warning:', e.message);
});

module.exports = prisma;
