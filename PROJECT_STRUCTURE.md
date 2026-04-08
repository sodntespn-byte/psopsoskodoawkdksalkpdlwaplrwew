# PSO Brasil - Cyberpunk Minimalist Football Platform

## Estrutura do Projeto

```
pso-brasil/
  # Configurações
  package.json
  tailwind-cyber.config.js
  postcss.config.js
  .env.example
  .gitignore
  
  # Banco de Dados
  prisma/
    schema.prisma
    migrations/
    seed-data/
  
  # Servidor Backend
  server.js
  lib/
    encryption.js
    apiSecurity.js
    auditLogger.js
    prisma.js
    schemas.js
    standings.js
  
  # API Routes
  api/
    matches/
      recent.js
      [matchId]/
        update-standings.js
    transfers/
      webhook.js
      index.js
    leagues/
      [leagueId]/
        standings.js
  
  # Middleware
  middleware/
    security.js
    attackProtection.js
    websocket.js
    adminAuth.js
  
  # Páginas Multi-Páginas
  pages/
    index.html              # Dashboard
    classificacao.html       # Tabela de Classificação
    transferencias.html      # Mercado de Transferências
    times.html               # Galeria de Times
    admin.html               # Painel Admin
  
  # Componentes React
  components/
    common/
      Layout.jsx
      Navigation.jsx
      Header.jsx
      Footer.jsx
    dashboard/
      RecentMatches.jsx
      StatsOverview.jsx
    classification/
      StandingsTable.jsx
      LeagueSelector.jsx
    transfers/
      TransferCard.jsx
      TransferMarket.jsx
      TransferTimeline.jsx
    teams/
      TeamCard.jsx
      TeamGallery.jsx
      TeamDetails.jsx
    admin/
      AdminPanel.jsx
      UserManagement.jsx
      SystemStatus.jsx
  
  # Estilos e Assets
  public/
    css/
      cyberpunk.css
      animations.css
    images/
      logos/
      shields/
      backgrounds/
    fonts/
    icons/
  
  # Scripts e Configurações
  scripts/
    seed-db.js
    create-admin.js
    setup-prisma.sh
  
  # Documentação
  docs/
    README.md
    SECURITY.md
    API.md
    DEPLOYMENT.md
  
  # Configurações SquareCloud
  squarecloud.yml
  ecosystem.config.js
```

## Instalação e Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
# Editar o arquivo .env com suas configurações
```

### 3. Configurar Banco de Dados
```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

### 4. Iniciar Servidor
```bash
npm run dev  # Desenvolvimento
npm start  # Produção
```

## Features Implementadas

### Estética Cyber-Brasil
- Fundo azul marinho profundo (#05070A)
- Detalhes em verde neon (#00FF41) e amarelo elétrico (#FFD700)
- ZERO EMOJIS - Apenas ícones vetoriais Lucide React
- Tipografia técnica (Rajdhani/Inter)
- Layout clean e minimalista

### Segurança Militar
- Criptografia AES-256-GCM para dados sensíveis
- HMAC verification para webhooks
- Rate limiting rigoroso
- CSP headers completos
- Auditoria detalhada

### Arquitetura Multi-Páginas
- / - Dashboard com últimos resultados
- /classificacao - Tabela técnica de pontos
- /transferencias - Mural de mercado com cards
- /times - Galeria de clubes com escudos
- /admin - Painel privado de gestão

### Integração Discord
- Webhook para recebimento de transferências
- Parse automático de contratos
- Cards com fotos dos clubes
- Animações Framer Motion sem emojis

### Deploy SquareCloud
- SSL obrigatório
- Prisma migrations automáticas
- Build otimizado
- Configuração de ambiente

## Tecnologias Utilizadas

- **Backend**: Node.js + Express + Prisma
- **Frontend**: React + Framer Motion + Tailwind CSS
- **Database**: PostgreSQL
- **Security**: AES-256-GCM + HMAC + CSP
- **Real-time**: Socket.IO
- **Discord**: Discord.js
- **Icons**: Lucide React (vetoriais)

## Padrões de Código

- ZERO EMOJIS em todo o código
- Ícones vetoriais Lucide React
- Componentes React com TypeScript
- CSS Tailwind com tema Cyber-Brasil
- Segurança em primeiro lugar
- Código limpo e documentado

## Deploy

### SquareCloud
1. Enviar projeto para SquareCloud
2. Configurar variáveis de ambiente
3. Rodar `npm run deploy`
4. Acessar URL fornecida

### Manual
1. Configurar banco PostgreSQL
2. Instalar dependências
3. Configurar .env
4. Rodar migrations
5. Iniciar servidor

## Licença
MIT License - PSO Brasil Team
