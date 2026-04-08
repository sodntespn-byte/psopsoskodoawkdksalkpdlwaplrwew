import { z } from 'zod';

// Schema de validação para cadastro de times
export const teamSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome do time deve ter pelo menos 2 caracteres')
    .max(50, 'Nome do time deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9\sÀ-ÿ]+$/, 'Nome do time deve conter apenas letras, números e espaços'),
  
  abbreviation: z
    .string()
    .min(2, 'Abreviação deve ter pelo menos 2 caracteres')
    .max(5, 'Abreviação deve ter no máximo 5 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Abreviação deve conter apenas letras maiúsculas e números')
    .optional(),
  
  city: z
    .string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(50, 'Cidade deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z\sÀ-ÿ]+$/, 'Cidade deve conter apenas letras e espaços'),
  
  state: z
    .string()
    .min(2, 'Estado deve ter pelo menos 2 caracteres')
    .max(2, 'Estado deve ter exatamente 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve conter 2 letras maiúsculas'),
  
  founded: z
    .number()
    .min(1800, 'Ano de fundação deve ser a partir de 1800')
    .max(new Date().getFullYear(), 'Ano de fundação não pode ser no futuro')
    .optional(),
  
  stadium: z
    .string()
    .min(2, 'Estádio deve ter pelo menos 2 caracteres')
    .max(100, 'Estádio deve ter no máximo 100 caracteres')
    .optional(),
  
  logoUrl: z
    .string()
    .url('URL do escudo deve ser uma URL válida')
    .refine((url) => {
      // Verificar se é uma URL de imagem válida
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const extension = url.split('.').pop()?.toLowerCase();
      return imageExtensions.includes(`.${extension}`);
    }, 'URL deve apontar para uma imagem válida (jpg, jpeg, png, gif, webp, svg)'),
  
  leagueId: z
    .string()
    .min(1, 'Selecione uma liga')
    .uuid('ID da liga deve ser um UUID válido'),
  
  isActive: z
    .boolean()
    .default(true)
});

// Schema para atualização de times (campos opcionais)
export const updateTeamSchema = teamSchema.partial();

// Schema para busca de times
export const searchTeamSchema = z.object({
  name: z.string().optional(),
  leagueId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Schema para validação de upload de imagem
export const uploadImageSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Imagem deve ter no máximo 5MB')
    .refine((file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      return allowedTypes.includes(file.type);
    }, 'Formato de arquivo não permitido. Use: jpg, png, gif, webp ou svg'),
});

// Schema para validação de liga
export const leagueSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome da liga deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da liga deve ter no máximo 100 caracteres'),
  
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  
  country: z
    .string()
    .min(2, 'País deve ter pelo menos 2 caracteres')
    .max(50, 'País deve ter no máximo 50 caracteres'),
  
  season: z
    .string()
    .regex(/^\d{4}$/, 'Temporada deve ser um ano válido (ex: 2024)'),
  
  isActive: z
    .boolean()
    .default(true),
});

// Schema para validação de jogador
export const playerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome do jogador deve ter pelo menos 2 caracteres')
    .max(100, 'Nome do jogador deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z\sÀ-ÿ]+$/, 'Nome deve conter apenas letras e espaços'),
  
  nickname: z
    .string()
    .max(50, 'Apelido deve ter no máximo 50 caracteres')
    .optional(),
  
  age: z
    .number()
    .min(15, 'Jogador deve ter pelo menos 15 anos')
    .max(50, 'Jogador deve ter no máximo 50 anos'),
  
  position: z
    .enum(['GK', 'DF', 'MF', 'FW'], 'Posição deve ser uma das seguintes: GK, DF, MF, FW'),
  
  number: z
    .number()
    .min(1, 'Número deve ser pelo menos 1')
    .max(99, 'Número deve ser no máximo 99'),
  
  height: z
    .number()
    .min(1.5, 'Altura deve ser pelo menos 1.5m')
    .max(2.5, 'Altura deve ser no máximo 2.5m')
    .optional(),
  
  weight: z
    .number()
    .min(50, 'Peso deve ser pelo menos 50kg')
    .max(150, 'Peso deve ser no máximo 150kg')
    .optional(),
  
  nationality: z
    .string()
    .min(2, 'Nacionalidade deve ter pelo menos 2 caracteres')
    .max(50, 'Nacionalidade deve ter no máximo 50 caracteres'),
  
  teamId: z
    .string()
    .min(1, 'Selecione um time')
    .uuid('ID do time deve ser um UUID válido'),
  
  isActive: z
    .boolean()
    .default(true),
});

// Schema para validação de partida
export const matchSchema = z.object({
  homeTeamId: z
    .string()
    .min(1, 'Selecione o time mandante')
    .uuid('ID do time mandante deve ser um UUID válido'),
  
  awayTeamId: z
    .string()
    .min(1, 'Selecione o time visitante')
    .uuid('ID do time visitante deve ser um UUID válido')
    .refine((val, ctx) => val !== ctx.parent.homeTeamId, 'Times mandante e visitante devem ser diferentes'),
  
  leagueId: z
    .string()
    .min(1, 'Selecione uma liga')
    .uuid('ID da liga deve ser um UUID válido'),
  
  matchDate: z
    .string()
    .datetime('Data da partida deve ser uma data/hora válida')
    .refine((date) => new Date(date) > new Date(), 'Data da partida deve ser no futuro'),
  
  venue: z
    .string()
    .min(2, 'Local deve ter pelo menos 2 caracteres')
    .max(100, 'Local deve ter no máximo 100 caracteres')
    .optional(),
  
  round: z
    .string()
    .max(50, 'Rodada deve ter no máximo 50 caracteres')
    .optional(),
});

// Mensagens de erro personalizadas
export const getErrorMessage = (error) => {
  if (error.errors) {
    return error.errors.map((err) => err.message).join(', ');
  }
  return error.message || 'Erro de validação';
};

// Função para formatar erros do Zod
export const formatZodError = (error) => {
  const formattedErrors = {};
  
  if (error.errors) {
    error.errors.forEach((err) => {
      formattedErrors[err.path.join('.')] = err.message;
    });
  }
  
  return formattedErrors;
};
