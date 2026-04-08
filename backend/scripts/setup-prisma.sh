#!/bin/bash

# Script de configuração do Prisma ORM
# Este script ajuda a configurar o Prisma com PostgreSQL

echo "=== CONFIGURAÇÃO PRISMA ORM ==="
echo ""
echo "Por favor, forneça sua DATABASE_URL da SquareCloud/Provedor"
echo "Formato esperado: postgresql://username:password@host:port/database"
echo ""
echo "Exemplo: postgresql://user:password@db.squarewebsites.com:5432/dbname"
echo ""

# Ler a DATABASE_URL do usuário
read -p "DATABASE_URL: " db_url

# Validar se a URL parece ser PostgreSQL
if [[ $db_url == postgresql://* ]]; then
    echo "DATABASE_URL parece válida (PostgreSQL)"
    
    # Adicionar ao arquivo .env
    echo "" >> .env
    echo "# Prisma Database Configuration" >> .env
    echo "DATABASE_URL=\"$db_url\"" >> .env
    
    echo ""
    echo "DATABASE_URL adicionada ao arquivo .env"
    echo ""
    echo "Próximos passos:"
    echo "1. Execute: npx prisma db push"
    echo "2. Execute: npx prisma generate"
    echo "3. Execute: npm run seed-db (opcional)"
    echo ""
    echo "Isso criará as tabelas no seu banco PostgreSQL"
    
else
    echo "ERROR: DATABASE_URL inválida. Deve começar com 'postgresql://'"
    echo "Por favor, verifique sua URL e tente novamente."
fi
