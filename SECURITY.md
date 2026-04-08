# Guia de Segurança - Pro Soccer Online 2

## Visão Geral

Este documento descreve as medidas de segurança implementadas no Pro Soccer Online 2 para proteger contra ataques comuns e garantir a integridade dos dados dos usuários.

## Níveis de Segurança

### 1. Segurança de Aplicação

#### Autenticação e Autorização
- **JWT Tokens**: Tokens JWT com assinatura HMAC-SHA256
- **Senha Forte**: Mínimo 8 caracteres com letras maiúsculas, minúsculas, números e símbolos
- **Hash de Senha**: bcrypt com 12 salt rounds
- **Proteção contra Força Bruta**: Bloqueio após 5 tentativas falhas
- **Verificação de Conta**: Status ativo/inativo para usuários

#### Validação de Entrada
- **Sanitização**: Remoção de caracteres perigosos
- **Validação**: Verificação de formatos (email, UUID, etc.)
- **Escape**: Prevenção de XSS e injeção de código
- **Rate Limiting**: Limitação por IP e usuário

### 2. Segurança de Rede

#### Headers de Segurança
- **Helmet.js**: Proteção contra ataques comuns
- **CSP**: Content Security Policy para prevenir XSS
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevenção de clickjacking
- **X-Content-Type-Options**: Prevenção de MIME sniffing

#### CORS e Cross-Origin
- **Origens Permitidas**: Apenas domínios autorizados
- **Credenciais**: Configuração segura de cookies
- **Headers**: Controle estrito de headers permitidos

### 3. Segurança de Banco de Dados

#### PostgreSQL
- **SSL/TLS**: Conexão criptografada
- **Prepared Statements**: Prevenção de SQL injection
- **Validação**: Validação de dados no nível do ORM
- **Backup**: Backup automático criptografado

#### ORM (Sequelize)
- **Validações**: Validação de dados no modelo
- **Sanitização**: Escape automático de valores
- **Relações**: Relações seguras entre modelos

### 4. Segurança de Sessão

#### Cookies
- **HttpOnly**: Prevenção de acesso via JavaScript
- **Secure**: Apenas via HTTPS
- **SameSite**: Proteção contra CSRF
- **Expiration**: Timeout de sessão configurável

#### Rate Limiting
- **Geral**: 100 requisições por IP em 15 minutos
- **Login**: 5 tentativas por IP em 15 minutos
- **Registro**: 3 tentativas por IP em 1 hora
- **Admin**: 10 requisições por usuário em 15 minutos

### 5. Monitoramento e Auditoria

#### Logs de Segurança
- **Eventos Críticos**: Login, registro, tentativas de ataque
- **Timestamp**: Marcação de tempo precisa
- **IP Tracking**: Rastreamento de endereços IP
- **User Agent**: Informações do cliente

#### Auditoria
- **Relatórios**: Relatórios de segurança automáticos
- **Alertas**: Notificação de eventos suspeitos
- **Health Check**: Verificação de saúde do sistema
- **Cleanup**: Limpeza automática de logs antigos

## Ameaças Mitigadas

### 1. Ataques de Injeção
- **SQL Injection**: Prevenção via prepared statements
- **XSS**: Sanitização e escape de entrada
- **Command Injection**: Validação de comandos

### 2. Ataques de Autenticação
- **Força Bruta**: Rate limiting e bloqueio
- **Credential Stuffing**: Verificação de senhas
- **Session Hijacking**: Cookies seguros

### 3. Ataques de Rede
- **Man-in-the-Middle**: SSL/TLS
- **DNS Spoofing**: HSTS
- **Clickjacking**: X-Frame-Options

### 4. Ataques de Aplicação
- **CSRF**: Tokens CSRF
- **DoS**: Rate limiting
- **Path Traversal**: Validação de caminhos

## Configurações de Segurança

### Variáveis de Ambiente

```bash
# Segurança
JWT_SECRET=secreto_muito_longo_e_aleatorio
ENCRYPTION_KEY=chave_de_32_bytes
CSRF_SECRET=secreto_csrf_aleatorio
SESSION_SECRET=secreto_da_sessao

# Rate Limiting
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
REGISTER_RATE_LIMIT_MAX=3

# Headers de Segurança
HELMET_CSP=true
HELMET_HSTS=true
HELMET_NO_SNIFF=true
```

### Configurações de Produção

```javascript
// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

// CORS restrito
app.use(cors({
    origin: ['https://pro-soccer-online.squareweb.app'],
    credentials: true
}));

// Rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas tentativas. Tente novamente.'
}));
```

## Monitoramento

### Logs de Segurança

Arquivo: `logs/security.log`

Formato:
```
[2024-01-20T10:30:00.000Z] CRITICAL: BRUTE_FORCE_ATTEMPT - {"ip":"192.168.1.1","attempts":5,"timestamp":"2024-01-20T10:30:00.000Z"}
```

### Eventos Monitorados

- **LOGIN_SUCCESS**: Login bem-sucedido
- **LOGIN_FAILURE**: Falha no login
- **ACCOUNT_LOCKED**: Conta bloqueada
- **BRUTE_FORCE_ATTEMPT**: Tentativa de força bruta
- **SUSPICIOUS_ACTIVITY**: Atividade suspeita
- **XSS_ATTEMPT**: Tentativa de XSS
- **SQL_INJECTION_ATTEMPT**: Tentativa de SQL injection
- **CSRF_ATTEMPT**: Tentativa de CSRF

### Relatórios de Segurança

```javascript
// Gerar relatório das últimas 24h
const report = auditor.generateSecurityReport('24h');

console.log('Eventos críticos:', report.criticalEvents.length);
console.log('Top IPs:', report.topIPs);
console.log('Eventos por tipo:', report.eventsByType);
```

## Melhores Práticas

### 1. Desenvolvimento
- **Princípio do Menor Privilégio**: Acesso mínimo necessário
- **Validação Sempre**: Validar toda entrada de dados
- **Logs Detalhados**: Registrar eventos de segurança
- **Testes de Segurança**: Testar regularmente

### 2. Operações
- **Atualizações**: Manter dependências atualizadas
- **Backup**: Backup regular e testado
- **Monitoramento**: Monitorar logs em tempo real
- **Incident Response**: Plano de resposta a incidentes

### 3. Infraestrutura
- **Firewall**: Configurar regras de firewall
- **SSL/TLS**: Usar certificados válidos
- **Rede Privada**: Isolar banco de dados
- **Load Balancer**: Distribuir carga com segurança

## Verificação de Segurança

### Checklist de Segurança

- [ ] JWT secrets são longos e aleatórios
- [ ] Senhas usam bcrypt com 12+ rounds
- [ ] Rate limiting configurado
- [ ] Headers de segurança ativos
- [ ] CORS restrito a domínios permitidos
- [ ] Logs de segurança habilitados
- [ ] Backup automático configurado
- [ ] SSL/TLS ativo
- [ ] Monitoramento ativo
- [ ] Testes de segurança regulares

### Testes de Penetração

1. **Teste de Força Bruta**: Tentativas de login
2. **Teste de XSS**: Injeção de scripts
3. **Teste de SQL Injection**: Injeção de SQL
4. **Teste de CSRF**: Cross-site request forgery
5. **Teste de DoS**: Negação de serviço

## Resposta a Incidentes

### Níveis de Alerta

- **Baixo**: Eventos suspeitos isolados
- **Médio**: Padrões anormais detectados
- **Alto**: Ataques ativos identificados
- **Crítico**: Brecha de segurança confirmada

### Ações Imediatas

1. **Isolar Sistema**: Desconectar da rede se necessário
2. **Analisar Logs**: Identificar origem do ataque
3. **Bloquear IPs**: Adicionar IPs maliciosos à blacklist
4. **Notificar**: Alertar equipe e usuários
5. **Investigar**: Análise forense do incidente

## Conformidade

### GDPR
- **Consentimento**: Consentimento explícito para dados
- **Direito ao Esquecimento**: Remoção de dados solicitada
- **Portabilidade**: Exportação de dados do usuário
- **Notificação**: Notificação de breaches em 72h

### LGPD
- **Finalidade**: Finalidade clara de coleta de dados
- **Minimização**: Coletar apenas dados necessários
- **Segurança**: Medidas de segurança adequadas
- **Transparência**: Informações claras sobre uso

## Manutenção

### Diário
- [ ] Verificar logs de segurança
- [ ] Monitorar taxa de erros
- [ ] Verificar performance
- [ ] Backup diário

### Semanal
- [ ] Atualizar dependências
- [ ] Revisar relatórios de segurança
- [ ] Testar sistema de backup
- [ ] Verificar certificados SSL

### Mensal
- [ ] Teste de penetração
- [ ] Revisão de políticas
- [ ] Auditoria de acesso
- [ ] Atualização documentação

## Contato

Para questões de segurança:
- **Email**: security@pro-soccer-online.com
- **Discord**: Canal #segurança
- **GitHub**: Issues privadas

---

**Importante**: Este documento deve ser mantido atualizado e revisado regularmente para garantir a eficácia das medidas de segurança implementadas.
