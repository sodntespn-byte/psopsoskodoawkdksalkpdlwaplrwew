# Deploy no Square Cloud - PSO Brasil

## Configuração para Produção

### 1. Arquivos de Configuração

O projeto já está configurado com:
- `squarecloud.json` - Configuração principal
- `squarecloud.yml` - Configurações avançadas
- `package.json` - Dependências e scripts
- `server.js` - Servidor configurado para produção

### 2. Variáveis de Ambiente (IMPORTANTE)

Configure estas variáveis no painel do Square Cloud:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=sua_string_de_conexao_postgresql
JWT_SECRET=seu_jwt_secret_aqui
ADMIN_PASSWORD=admin123
```

### 3. Estrutura de Arquivos Estáticos

O servidor está configurado para servir:
- `index.html` - Página principal (raiz)
- `/pages/dashboard.html` - Dashboard admin
- `/pages/imprensa.html` - Página de notícias
- `/pages/galeria.html` - Galeria de fotos
- Arquivos estáticos (CSS, JS, imagens)

### 4. Rotas Disponíveis

**Frontend:**
- `/` - Página inicial
- `/dashboard` - Dashboard (requer login)
- `/imprensa` - Jornal/Notícias
- `/galeria` - Galeria de fotos

**API:**
- `/api/health` - Health check
- `/api/login` - Autenticação
- `/api/register` - Registro
- `/api/rankings` - Rankings
- `/api/tournaments` - Torneios
- `/api/matches` - Partidas

**Webhook:**
- `/webhook/discord` - Integração Discord

### 5. Deploy Passo a Passo

1. **Faça upload do projeto:**
   - Compacte a pasta `pso-brasil` (sem node_modules)
   - Envie para o Square Cloud

2. **Configure as variáveis de ambiente:**
   - Acesse o painel do Square Cloud
   - Vá em "Variáveis de Ambiente"
   - Adicione todas as variáveis listadas acima

3. **Inicie o deploy:**
   - O Square Cloud executará `npm install` automaticamente
   - Depois executará `npm start`

4. **Verifique o health check:**
   - Acesse `https://seu-app.squareweb.app/api/health`
   - Deve retornar status "ok"

### 6. Credenciais de Acesso

**Admin Dashboard:**
- Usuário: `admin`
- Senha: `admin123` (ou conforme configurado em ADMIN_PASSWORD)

### 7. Banco de Dados

O projeto usa PostgreSQL. Configure:
- Host, porta, database, usuário e senha
- SSL obrigatório (sslmode=require)

### 8. SSL/HTTPS

O Square Cloud fornece SSL automaticamente:
- Certificado válido incluído
- HTTPS ativado por padrão

### 9. Monitoramento

**Health Check:**
- Endpoint: `/api/health`
- Verifica: status, uptime, database, discord

**Logs:**
- Acesse no painel do Square Cloud
- Logs em tempo real

### 10. Solução de Problemas

**Erro 404 nas páginas:**
- Verifique se os arquivos HTML estão na pasta correta
- `/index.html` na raiz
- `/pages/*.html` na pasta pages

**Erro de conexão com banco:**
- Verifique DATABASE_URL
- Confirme SSL está ativado

**Login não funciona:**
- Verifique JWT_SECRET está configurado
- Limpe localStorage do navegador

### 11. Comandos Úteis

```bash
# Testar localmente
npm install
npm start

# Verificar saúde da aplicação
curl https://seu-app.squareweb.app/api/health
```

### 12. Arquivos Ignorados (.gitignore)

```
node_modules/
.env
.env.local
.DS_Store
*.log
```

---

**Pronto para deploy!** O projeto está otimizado para o Square Cloud com:
- Servidor Node.js/Express
- Frontend estático servido corretamente
- API RESTful funcional
- Integração Discord
- Autenticação JWT
- Health checks
