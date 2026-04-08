# Módulo de Mercado da Bola - PSO Brasil

## Visão Geral

Implementamos um módulo completo de Mercado da Bola que permite registrar, exibir e gerenciar transferências de jogadores com uma estética de elite. O sistema integra Discord, PostgreSQL e frontend com animações impressionantes e Glassmorphism.

## Funcionalidades Implementadas

### 1. Estrutura de Dados (Prisma/PostgreSQL)

#### **Tabela Transfer:**
```prisma
model Transfer {
  id            String   @id @default(cuid())
  playerName    String
  oldClubId     String?
  newClubId     String
  duration      Int      // Duração em meses
  startSeason   String   // Temporada de início
  endSeason     String   // Temporada de término
  salary        Float    // Salário em milhões
  releaseClause Float?   // Cláusula de rescisão em milhões
  feePaid       Float    // Valor pago em milhões
  timestamp     DateTime @default(now())
  isActive      Boolean  @default(true)
  
  // Relacionamentos
  oldClub       Team?    @relation("OldClub", fields: [oldClubId], references: [id])
  newClub       Team     @relation("NewClub", fields: [newClubId], references: [id])
  
  @@map("transfers")
}
```

#### **Campos Detalhados:**
- **id**: UUID único para identificação
- **playerName**: Nome completo do jogador
- **oldClubId**: ID do clube antigo (nullable para agentes livres)
- **newClubId**: ID do novo clube
- **duration**: Duração do contrato em meses
- **startSeason/endSeason**: Período do contrato
- **salary**: Salário anual em milhões de reais
- **releaseClause**: Cláusula de rescisão (opcional)
- **feePaid**: Valor pago pela transferência
- **timestamp**: Data/hora do registro
- **isActive**: Status da transferência

### 2. Endpoint de Webhook (Recebimento)

#### **POST /api/transfers/webhook**
**Headers obrigatórios:**
- `X-Transfer-Secret`: SECRET_KEY do .env

**Body esperado:**
```json
{
  "playerName": "Neymar Jr.",
  "oldClub": "Santos",
  "newClub": "Barcelona",
  "duration": 24,
  "startSeason": "2024",
  "endSeason": "2026",
  "salary": 5.5,
  "releaseClause": 50.0,
  "feePaid": 25.0
}
```

**Segurança:**
- Validação de SECRET_KEY
- Sanitização de inputs
- Validação de tipos e ranges
- Tratamento de erros robusto

**Response:**
```json
{
  "success": true,
  "message": "Transferência registrada com sucesso!",
  "data": {
    "id": "transfer_123",
    "playerName": "Neymar Jr.",
    "announcement": "@Neymar Jr. é o novo reforço do Barcelona!",
    "contractId": "#ABC12345",
    "formattedSalary": "R$ 5.5M",
    "formattedFee": "R$ 25.0M",
    "tier": "TIER_1",
    "isFreeAgent": false,
    "oldClub": { "id": "team_1", "name": "Santos", "logoUrl": "..." },
    "newClub": { "id": "team_2", "name": "Barcelona", "logoUrl": "..." }
  }
}
```

### 3. Página de Transferências (Frontend)

#### **Rota: /transferencias**
- **Layout**: Timeline ou Grade de cards
- **Estilo**: Glassmorphism com gradientes dinâmicos
- **Animações**: Framer Motion com efeitos especiais

#### **Estrutura do Card:**
```jsx
<div className="glass-card-primary p-6">
  {/* Selo de Novo */}
  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-accent-500 to-primary-500">
    NOVO
  </div>
  
  {/* Selo de Tier 1 */}
  <div className="absolute -top-2 -left-2 bg-gradient-to-r from-yellow-500 to-orange-500">
    <Star className="w-3 h-3" />
    <span>TIER 1</span>
  </div>
  
  {/* Anúncio Principal */}
  <div className="text-center">
    <h3>@Neymar Jr. é o novo reforço do Barcelona!</h3>
  </div>
  
  {/* Transferência Visual */}
  <div className="flex items-center justify-between">
    <div className="flex flex-col items-center">
      <img src={oldClub.logoUrl} alt={oldClub.name} />
      <span>Santos</span>
    </div>
    
    <ArrowRight className="text-2xl text-accent-400" />
    
    <div className="flex flex-col items-center">
      <img src={newClub.logoUrl} alt={newClub.name} />
      <span>Barcelona</span>
    </div>
  </div>
  
  {/* Detalhes do Contrato */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <span className="text-gray-400">Salário</span>
      <span className="text-white">R$ 5.5M</span>
    </div>
    <div>
      <span className="text-gray-400">Taxa</span>
      <span className="text-white">R$ 25.0M</span>
    </div>
    <div>
      <span className="text-gray-400">Duração</span>
      <span className="text-white">24 meses</span>
    </div>
    <div>
      <span className="text-gray-400">Cláusula</span>
      <span className="text-white">R$ 50.0M</span>
    </div>
  </div>
  
  {/* Rodapé */}
  <div className="flex justify-between pt-4 border-t border-white/10">
    <span className="text-accent-400 font-mono">#ABC12345</span>
    <span className="text-gray-400">15/03/2024</span>
  </div>
</div>
```

### 4. Integração de Imagens

#### **Busca Automática de Escudos:**
```javascript
// Buscar escudos na tabela Team
const [oldTeam, newTeam] = await Promise.all([
  prisma.team.findFirst({
    where: { name: { contains: oldClub, mode: 'insensitive' } }
  }),
  prisma.team.findFirst({
    where: { name: { contains: newClub, mode: 'insensitive' } }
  })
]);
```

#### **Tratamento de VLOCE:**
```javascript
// Se oldClub for "VLOCE", exibir ícone de agente livre
const isFreeAgent = !transfer.oldClubId || transfer.oldClub.toUpperCase() === 'VLOCE';

// Renderização condicional
{isFreeAgent ? (
  <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center">
    <User className="w-8 h-8 text-gray-400" />
  </div>
) : (
  <img src={team.logoUrl} alt={team.name} />
)}
```

### 5. Estética de Elite

#### **Animações Tier 1:**
```javascript
const tier1Variants = {
  hidden: { 
    opacity: 0, 
    y: 50, 
    scale: 0.8,
    rotate: -5
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    rotate: 0,
    transition: { 
      type: 'spring', 
      damping: 15, 
      stiffness: 400,
      duration: 0.8
    }
  }
};
```

#### **Efeito de Brilho Dourado:**
```css
.tier-1-glow {
  box-shadow: 0 0 30px rgba(0, 255, 65, 0.5);
  border-color: rgba(0, 255, 65, 0.5);
}

.tier-1-animation {
  animation: tier1Pulse 3s infinite;
}

@keyframes tier1Pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
```

#### **Sistema de Tiers:**
- **TIER 1**: >= R$ 50M (Dourado, animação especial)
- **TIER 2**: >= R$ 20M (Expressivo)
- **TIER 3**: >= R$ 10M (Médio)
- **TIER 4**: >= R$ 5M (Baixo)
- **TIER 5**: < R$ 5M (Mínimo)

## Estrutura de Arquivos

### Backend
```
api/transfers/
  webhook.js           # Endpoint de recebimento
  index.js             # Listagem de transferências

discord/
  transferCommand.js   # Comando Discord
  transferManager.js   # Gerenciador de transferências
```

### Frontend
```
components/
  TransferMarket.jsx    # Componente principal

transferencias.html    # Página standalone
```

### Database
```
prisma/schema.prisma   # Schema atualizado
```

## Configuração

### 1. Variáveis de Ambiente
```env
# Segurança do Webhook
TRANSFER_SECRET_KEY=sua_chave_secreta_aqui

# Base URL para callbacks
BASE_URL=http://localhost:3000
```

### 2. Atualizar Schema
```bash
npx prisma db push
npx prisma generate
```

### 3. Instalar Dependências
```bash
npm install socket.io framer-motion react react-dom
```

## Discord Integration

### Comando /registrar-transferencia

#### **Modal Completo:**
```
Registrar Nova Transferência
================================
Nome do Jogador: [Neymar Jr.]
Clube Antigo: [Santos]
Novo Clube: [Barcelona]
Duração (meses): [24]
Temporada Início: [2024]
Temporada Término: [2026]
Salário (em milhões): [5.5]
Taxa Paga (em milhões): [25.0]
Cláusula de Rescisão: [50.0]
================================
[ Cancelar ]    [ Registrar ]
```

#### **Validações:**
- Nome do jogador: mínimo 2 caracteres
- Nome dos clubes: mínimo 2 caracteres ou "VLOCE"
- Duração: 1-120 meses
- Salário: 0-100 milhões
- Taxa: 0-1000 milhões
- Cláusula: 0-1000 milhões (opcional)
- Temporadas: formato YYYY

#### **Feedback no Discord:**
```
Transferência Registrada com Sucesso!
@Neymar Jr. é o novo reforço do Barcelona!

Jogador: Neymar Jr.
Clube Antigo: Santos
Novo Clube: Barcelona
Duração: 24 meses
Salário: R$ 5.5M
Taxa Paga: R$ 25.0M
Cláusula de Rescisão: R$ 50.0M
ID do Contrato: #ABC12345
Categoria: TIER 1 - Transferência Bombástica!
```

## WebSocket em Tempo Real

### Eventos Disponíveis:
```javascript
// Nova transferência registrada
socket.on('new-transfer', (data) => {
  console.log('Nova transferência:', data.transfer);
  // Adicionar ao início da lista com animação
});

// Sala específica para transferências
socket.emit('join-room', 'transfers');
socket.on('transfer-signed', (data) => {
  // Notificação específica
});
```

### Atualização Automática:
```javascript
// No componente React
useEffect(() => {
  const socket = io('http://localhost:3000');
  
  socket.on('new-transfer', (data) => {
    setTransfers(prev => [data.transfer, ...prev.slice(0, 49)]);
  });
  
  return () => socket.close();
}, []);
```

## API Routes

### GET /api/transfers
**Query Parameters:**
- `limit`: Limite de resultados (padrão: 20)
- `offset`: Offset para paginação (padrão: 0)
- `season`: Filtrar por temporada
- `clubId`: Filtrar por clube
- `active`: Apenas transferências ativas (padrão: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "transfers": [...],
    "stats": {
      "totalTransfers": 15,
      "totalSpent": "R$ 250.5M",
      "averageFee": "R$ 16.7M",
      "tierStats": {
        "TIER_1": 3,
        "TIER_2": 5,
        "TIER_3": 4,
        "TIER_4": 2,
        "TIER_5": 1
      },
      "mostActiveClubs": [
        { "clubName": "Flamengo", "transfers": 5 },
        { "clubName": "Palmeiras", "transfers": 3 }
      ]
    },
    "pagination": { ... },
    "filters": { ... }
  }
}
```

## Visual e UX

### Layout Timeline:
```
Transferência 1 (Mais recente)
    |
    v
Transferência 2
    |
    v
Transferência 3
    |
    v
...
```

### Layout Grade:
```
[Transferência 1] [Transferência 2] [Transferência 3]
[Transferência 4] [Transferência 5] [Transferência 6]
[Transferência 7] [Transferência 8] [Transferência 9]
```

### Elementos Visuais:
- **Glass Cards**: Efeito glassmorphism com blur
- **Gradient Dinâmico**: Segue movimento do mouse
- **Animações Suaves**: Spring physics
- **Selo de Novo**: Badge animado para transferências recentes
- **Selo Tier 1**: Destaque dourado com brilho
- **Ícones**: Lucide Icons para UI consistente

## Exemplos de Uso

### 1. Registrar Transferência via Discord
```bash
/registrar-transferencia
# Preencher modal com dados
# Sistema valida e registra automaticamente
# Feedback visual no Discord
# Atualização em tempo real no site
```

### 2. Via API Externa
```javascript
fetch('/api/transfers/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Transfer-Secret': 'sua_chave_secreta'
  },
  body: JSON.stringify({
    playerName: 'Vinícius Jr.',
    oldClub: 'Real Madrid',
    newClub: 'Manchester United',
    duration: 36,
    startSeason: '2024',
    endSeason: '2027',
    salary: 12.5,
    feePaid: 85.0,
    releaseClause: 150.0
  })
});
```

### 3. Buscar Transferências
```javascript
// Todas as transferências
fetch('/api/transfers');

// Filtradas por temporada
fetch('/api/transfers?season=2024');

// Filtradas por clube
fetch('/api/transfers?clubId=flamengo_id');

// Paginadas
fetch('/api/transfers?limit=10&offset=20');
```

## Performance e Otimizações

### 1. Cache
```javascript
// Cache de transferências (2 minutos)
const CACHE_DURATION = 2 * 60 * 1000;
const cache = new Map();

async function getCachedTransfers(filters) {
  const cacheKey = JSON.stringify(filters);
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchTransfers(filters);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### 2. Lazy Loading
```javascript
// Carregar imagens dos clubes sob demanda
const [loadedImages, setLoadedImages] = useState(new Set());

const loadImage = (url) => {
  if (!loadedImages.has(url)) {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setLoadedImages(prev => new Set([...prev, url]));
    };
  }
};
```

### 3. Virtual Scroll
```javascript
// Para grandes volumes de transferências
import { FixedSizeList as List } from 'react-window';

const TransferList = ({ transfers }) => (
  <List
    height={600}
    itemCount={transfers.length}
    itemSize={200}
    itemData={transfers}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <TransferCard transfer={data[index]} />
      </div>
    )}
  </List>
);
```

## Segurança

### 1. Validação de Input
```javascript
// Sanitização de nomes
function sanitizePlayerName(name) {
  return name.trim()
    .replace(/[<>]/g, '')
    .substring(0, 100);
}

// Validação de valores
function validateMonetaryValue(value, min = 0, max = 1000) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}
```

### 2. Rate Limiting
```javascript
// Limitar requisições por IP
const rateLimits = new Map();

function checkRateLimit(ip, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const key = `transfer-${ip}`;
  const requests = rateLimits.get(key) || [];
  
  // Remover requisições antigas
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= limit) {
    return false;
  }
  
  validRequests.push(now);
  rateLimits.set(key, validRequests);
  return true;
}
```

### 3. CORS e Headers
```javascript
// Configuração CORS segura
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

## Monitoramento e Analytics

### 1. Métricas de Transferências
```javascript
// Em tempo real
const transferMetrics = {
  totalTransfers: 0,
  totalSpent: 0,
  averageFee: 0,
  tierDistribution: {},
  clubActivity: {},
  recentActivity: []
};

// Atualizar métricas
function updateMetrics(transfer) {
  transferMetrics.totalTransfers++;
  transferMetrics.totalSpent += transfer.feePaid;
  transferMetrics.averageFee = transferMetrics.totalSpent / transferMetrics.totalTransfers;
  
  const tier = calculateTier(transfer.feePaid);
  transferMetrics.tierDistribution[tier] = (transferMetrics.tierDistribution[tier] || 0) + 1;
  
  // Club activity
  const club = transfer.newClub.name;
  transferMetrics.clubActivity[club] = (transferMetrics.clubActivity[club] || 0) + 1;
}
```

### 2. Logs Detalhados
```javascript
// Estrutura de logs
const logTransfer = {
  timestamp: new Date().toISOString(),
  action: 'transfer_registered',
  data: {
    transferId: transfer.id,
    playerName: transfer.playerName,
    oldClub: transfer.oldClub?.name,
    newClub: transfer.newClub.name,
    feePaid: transfer.feePaid,
    tier: calculateTier(transfer.feePaid),
    userAgent: req.headers['user-agent'],
    ip: req.ip
  }
};

console.log(JSON.stringify(logTransfer));
```

## Troubleshooting

### Problemas Comuns

#### 1. Transferência não aparece no site
- **Verifique**: WebSocket está conectado
- **Verifique**: Cache limpo
- **Verifique**: Se o webhook retornou sucesso

#### 2. Imagens dos clubes não carregam
- **Verifique**: logoUrl na tabela Team
- **Verifique**: Se as URLs são acessíveis
- **Verifique**: Se há erro de CORS

#### 3. Animações não funcionam
- **Verifique**: Framer Motion está carregado
- **Verifique**: Se as variantes estão corretas
- **Verifique**: Se há conflito de CSS

#### 4. Discord modal não abre
- **Verifique**: Se o bot tem permissões
- **Verifique**: Se o comando está registrado
- **Verifique**: Se o interactionCreate está configurado

### Debug Mode
```javascript
// Habilitar logs detalhados
process.env.DEBUG = 'transfer:*';

// Verificar estado do sistema
console.log('Estado do sistema:', {
  database: prisma ? 'connected' : 'disconnected',
  websocket: io ? 'online' : 'offline',
  cache: cache.size,
  rateLimits: rateLimits.size
});
```

## Deploy

### SquareCloud
```yaml
# squarecloud.yml
start: npm run start
build: npm run build
environment:
  - TRANSFER_SECRET_KEY
  - BASE_URL
  - DATABASE_URL
```

### Variáveis no Painel
- `TRANSFER_SECRET_KEY`: Chave secreta do webhook
- `BASE_URL`: URL base do aplicativo
- `DATABASE_URL`: String de conexão PostgreSQL

---

**Módulo de Mercado da Bola v1.0** - Transferências com estética de elite e funcionalidades completas!
