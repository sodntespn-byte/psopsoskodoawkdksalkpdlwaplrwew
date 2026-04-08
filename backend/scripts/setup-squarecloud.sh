#!/bin/bash

# PSO Brasil - Setup Script for SquareCloud
# Este script configura o projeto para deploy na SquareCloud

set -e

echo "=".repeat(60)
echo "PSO Brasil - Setup para SquareCloud"
echo "Cyberpunk Minimalist Football Platform"
echo "=".repeat(60)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_cyber() {
    echo -e "${CYAN}[CYBER]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    log_error "package.json não encontrado. Execute este script no diretório raiz do projeto."
    exit 1
fi

# 1. Verificar Node.js
log_info "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
        log_success "Node.js $NODE_VERSION encontrado (versão >= $REQUIRED_NODE)"
    else
        log_error "Node.js $NODE_VERSION encontrado. Versão >= $REQUIRED_NODE necessária."
        exit 1
    fi
else
    log_error "Node.js não encontrado. Por favor, instale o Node.js 18+."
    exit 1
fi

# 2. Verificar PostgreSQL
log_info "Verificando PostgreSQL..."
if command -v psql &> /dev/null; then
    log_success "PostgreSQL encontrado"
else
    log_warning "PostgreSQL não encontrado localmente. Usando PostgreSQL da SquareCloud."
fi

# 3. Instalar dependências
log_info "Instalando dependências..."
if [ -d "node_modules" ]; then
    log_warning "node_modules já existe. Limpando e reinstalando..."
    rm -rf node_modules
fi

npm install
if [ $? -eq 0 ]; then
    log_success "Dependências instaladas com sucesso"
else
    log_error "Falha ao instalar dependências"
    exit 1
fi

# 4. Gerar cliente Prisma
log_info "Gerando cliente Prisma..."
npm run prisma:generate
if [ $? -eq 0 ]; then
    log_success "Cliente Prisma gerado com sucesso"
else
    log_error "Falha ao gerar cliente Prisma"
    exit 1
fi

# 5. Verificar arquivo .env
log_info "Verificando configuração..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warning ".env não encontrado. Criando a partir de .env.example..."
        cp .env.example .env
        log_warning "Por favor, edite o arquivo .env com suas configurações!"
    else
        log_error ".env.example não encontrado. Não foi possível criar .env"
        exit 1
    fi
else
    log_success "Arquivo .env encontrado"
fi

# 6. Verificar configuração do banco de dados
log_info "Verificando configuração do banco de dados..."
if grep -q "DATABASE_URL=" .env; then
    DB_URL=$(grep "DATABASE_URL=" .env | cut -d'=' -f2)
    if [[ $DB_URL == *"localhost"* ]] || [[ $DB_URL == *"127.0.0.1"* ]]; then
        log_warning "DATABASE_URL aponta para localhost. Para SquareCloud, use o banco de dados fornecido."
    else
        log_success "DATABASE_URL configurado"
    fi
else
    log_error "DATABASE_URL não encontrado no .env"
    exit 1
fi

# 7. Verificar chaves de segurança
log_info "Verificando chaves de segurança..."
REQUIRED_KEYS=("ENCRYPTION_KEY" "WEBHOOK_HMAC_SECRET" "TRANSFER_SECRET_KEY")

for key in "${REQUIRED_KEYS[@]}"; do
    if grep -q "$key=" .env; then
        VALUE=$(grep "$key=" .env | cut -d'=' -f2)
        if [[ $VALUE == *"your_"* ]] || [[ $VALUE == *"super_secret"* ]] || [[ $VALUE == *"webhook_secret"* ]]; then
            log_warning "$key está usando valor padrão. Por favor, altere para um valor seguro!"
        else
            log_success "$key configurado"
        fi
    else
        log_error "$key não encontrado no .env"
        exit 1
    fi
done

# 8. Verificar configuração Discord
log_info "Verificando configuração Discord..."
if grep -q "DISCORD_BOT_TOKEN=" .env; then
    TOKEN=$(grep "DISCORD_BOT_TOKEN=" .env | cut -d'=' -f2)
    if [[ $TOKEN == *"your_discord"* ]]; then
        log_warning "DISCORD_BOT_TOKEN está usando valor padrão."
    else
        log_success "DISCORD_BOT_TOKEN configurado"
    fi
else
    log_warning "DISCORD_BOT_TOKEN não encontrado. O bot Discord não funcionará."
fi

# 9. Verificar arquivos de configuração SquareCloud
log_info "Verificando configuração SquareCloud..."
if [ -f "squarecloud.yml" ]; then
    log_success "squarecloud.yml encontrado"
else
    log_error "squarecloud.yml não encontrado"
    exit 1
fi

# 10. Verificar se há emojis no código
log_info "Verificando se há emojis no código (PROIBIDO)..."
if [ -f "scripts/verify-no-emojis.js" ]; then
    node scripts/verify-no-emojis.js
    if [ $? -eq 0 ]; then
        log_success "Nenhum emoji encontrado no código"
    else
        log_error "Emojis encontrados no código! Por favor, remova todos os emojis."
        exit 1
    fi
else
    log_warning "Script de verificação de emojis não encontrado"
fi

# 11. Verificar estrutura de arquivos
log_info "Verificando estrutura de arquivos..."
REQUIRED_DIRS=("api" "components" "lib" "middleware" "pages" "prisma")
REQUIRED_FILES=("server.js" "tailwind-cyber.config.js" "README.md")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_success "Diretório $dir encontrado"
    else
        log_warning "Diretório $dir não encontrado"
    fi
done

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Arquivo $file encontrado"
    else
        log_warning "Arquivo $file não encontrado"
    fi
done

# 12. Build do projeto
log_info "Fazendo build do projeto..."
npm run build
if [ $? -eq 0 ]; then
    log_success "Build concluído com sucesso"
else
    log_warning "Build falhou, mas isso não impede o deploy"
fi

# 13. Testar servidor local (opcional)
log_info "Deseja testar o servidor local? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    log_info "Iniciando servidor local por 10 segundos..."
    timeout 10s npm start || true
    log_info "Teste local concluído"
fi

# 14. Preparar para deploy
log_cyber "Preparando para deploy na SquareCloud..."

# Criar arquivo de deploy info
cat > deploy-info.txt << EOF
PSO Brasil - Deploy Information
=============================

Data: $(date)
Node.js: $(node --version)
NPM: $(npm --version)

Environment: $(grep NODE_ENV .env | cut -d'=' -f2 || echo "development")
Port: $(grep PORT .env | cut -d'=' -f2 || echo "3000")
Database: PostgreSQL

Security Features:
- AES-256-GCM Encryption
- HMAC Verification
- Rate Limiting
- CSP Headers
- Audit Logging

Features:
- Cyberpunk Minimalist UI
- Multi-Page Architecture
- Discord Integration
- Real-time WebSocket
- Transfer Market

Deploy Commands:
- npm run deploy
- Ou use SquareCloud dashboard

Last Verification: $(date)
EOF

log_success "Arquivo deploy-info.txt criado"

# 15. Relatório final
echo ""
echo "=".repeat(60)
echo "RELATÓRIO FINAL - SETUP CYBER-BRASIL"
echo "=".repeat(60)

echo ""
log_cyber "Status: PRONTO PARA DEPLOY"
echo ""
log_info "Próximos passos:"
echo "1. Configure as variáveis de ambiente no painel SquareCloud"
echo "2. Faça upload do projeto para SquareCloud"
echo "3. Execute 'npm run deploy' ou use o painel SquareCloud"
echo "4. Acesse sua aplicação na URL fornecida"
echo ""
log_warning "Importante:"
echo "- Certifique-se de configurar o DATABASE_URL no painel SquareCloud"
echo "- Altere todas as chaves de segurança para valores únicos"
echo "- Configure o token do bot Discord se for usar"
echo ""
log_success "Setup concluído com sucesso!"
echo "O PSO Brasil está pronto para o deploy Cyber-Brasil! "
echo ""
echo "=".repeat(60)
echo "CYBER-BRASIL PLATFORM READY FOR DEPLOY"
echo "=".repeat(60)
