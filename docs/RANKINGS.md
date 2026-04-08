# Tabela de Classificação Refatorada

## Visão Geral

A tabela de classificação foi completamente refatorada com um visual moderno e profissional, incluindo todos os elementos solicitados: posição com destaque circular, escudos dos times, indicadores de forma e design responsivo.

## Características Implementadas

### 1. Posição com Destaque Circular

- **Design**: Badge circular com gradiente baseado na posição
- **Cores**: 
  - 1º lugar: Dourado com ícone de trofé
  - 2º lugar: Prata com ícone de escudo
  - 3º lugar: Bronze com ícone de escudo
  - Top 5: Azul primário
  - Top 8: Azul secundário
  - Demais: Cinza
- **Animação**: Bounce-in com rotação na entrada
- **Efeito especial**: Animação de glow pulsante para o campeão

### 2. Escudos dos Times

- **Tamanho**: 32x32px (w-8 h-8)
- **Layout**: Ao lado do nome do time
- **Fallback**: Placeholder com inicial do time se a imagem falhar
- **Hover**: Scale 1.1 com brilho no hover
- **Border**: Borda sutil com transparência

### 3. Status de Forma (Últimos 5 Jogos)

- **Círculos Coloridos**: 
  - **Verde (V)**: Vitória com ícone de trending up
  - **Amarelo (D)**: Empate com ícone de menos
  - **Vermelho (D)**: Derrota com ícone de trending down
- **Animação**: Staggered slide-in com delay
- **Gradientes**: Gradientes sutis para cada tipo
- **Shadow**: Sombra colorida para profundidade

### 4. Design Responsivo

#### **Desktop (>1024px)**
- Todas as colunas visíveis
- Layout de tabela tradicional
- Hover effects completos

#### **Tablet (768px - 1024px)**
- Colunas GP e GC ocultas
- V-E-D combinado em uma coluna
- Layout compacto mantendo legibilidade

#### **Mobile (<768px)**
- Layout de cards
- Informações reorganizadas
- Touch-friendly interactions
- Swipe gestures suportados

## Componentes

### `PositionBadge`

Badge circular animado para posição:

```jsx
<PositionBadge position={1} isChampion={true} />
```

**Props:**
- `position`: Número da posição
- `isChampion`: Aplica efeito especial para 1º lugar

### `TeamShield`

Componente para exibir escudo do time:

```jsx
<TeamShield teamName="Flamengo" shieldUrl="/shields/flamengo.png" />
```

**Props:**
- `teamName`: Nome do time
- `shieldUrl`: URL da imagem do escudo

### `FormIndicator`

Indicador visual da forma recente:

```jsx
<FormIndicator form="VVVVD" />
```

**Props:**
- `form`: String com 5 caracteres (V, D, L)

### `RankingsTable`

Tabela completa com todas as funcionalidades:

```jsx
<RankingsTable data={rankingsData} className="w-full" />
```

**Props:**
- `data`: Array de objetos com dados dos times
- `className`: Classes CSS adicionais

## Estrutura de Dados

```javascript
const rankingsData = [
  {
    id: 1,
    position: 1,
    name: 'Flamengo',
    shieldUrl: '/shields/flamengo.png',
    points: 28,
    played: 12,
    wins: 9,
    draws: 1,
    losses: 2,
    goalsFor: 24,
    goalsAgainst: 8,
    goalDifference: 16,
    form: 'VVVVD'
  }
];
```

## Funcionalidades Adicionais

### 1. Ordenação

- **Clicável**: Clique nos cabeçalhos para ordenar
- **Bidirecional**: Alterna entre asc/desc
- **Visual**: Indicadores de direção

### 2. Busca

- **Real-time**: Filtra times enquanto digita
- **Case-insensitive**: Não diferencia maiúsculas
- **Placeholder**: Texto de ajuda claro

### 3. Filtros

- **Todos**: Mostra todos os times
- **Mandantes**: Times com melhor desempenho em casa
- **Visitantes**: Times com melhor desempenho fora
- **Melhor Forma**: Times com forma recente positiva
- **Mais Gols**: Times que mais marcam

### 4. Estatísticas

- **Líder**: Time em 1º lugar
- **Último**: Time na última posição
- **Total de Gols**: Soma de todos os gols
- **Média de Gols**: Média por time

### 5. Visualizações

- **Tabela**: Layout tradicional
- **Cards**: Layout em grid para mobile

## Animações

### Entrada de Dados

```javascript
// Staggered fade-in para linhas
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
```

### Hover Effects

```javascript
// Elevação e brilho verde
whileHover={{
  y: -2,
  boxShadow: "0 4px 20px rgba(0, 255, 65, 0.3)",
  backgroundColor: "rgba(0, 255, 65, 0.05)",
  transition: { duration: 0.2 }
}}
```

### Badge Animation

```javascript
// Bounce-in com rotação
initial={{ scale: 0, rotate: -180 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ type: "spring", stiffness: 200, damping: 15 }}
```

## Responsividade Detalhada

### Breakpoints

- **Desktop**: `min-width: 1024px`
- **Tablet**: `768px - 1024px`
- **Mobile**: `max-width: 767px`

### Colunas Ocultas

| Dispositivo | Colunas Ocultas |
|-------------|-----------------|
| Tablet | GP, GC |
| Mobile | Todas (usa cards) |

### Layout Mobile

```jsx
// Card layout para mobile
<div className="mobile-rankings-card">
  <div className="mobile-rankings-header">
    <PositionBadge position={team.position} />
    <TeamShield teamName={team.name} />
    <div className="mobile-rankings-points">
      <div className="mobile-rankings-points-value">{team.points}</div>
      <div className="mobile-rankings-points-label">PTS</div>
    </div>
  </div>
  {/* Stats e forma */}
</div>
```

## Personalização

### Cores

As cores podem ser personalizadas via CSS:

```css
/* Posição 1º lugar */
.position-badge.champion {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

/* Form indicators */
.form-circle.win {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.form-circle.draw {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.form-circle.loss {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}
```

### Animações

Durações e easing podem ser ajustados:

```javascript
transition={{ 
  delay: index * 0.15,  // 150ms entre linhas
  type: "spring", 
  stiffness: 150,     // Mais suave
  damping: 20
}}
```

## Performance

### Otimizações

- **Hardware Acceleration**: Transformações GPU
- **Lazy Loading**: Imagens de escudos carregadas sob demanda
- **Virtual Scrolling**: Para grandes conjuntos de dados
- **Memoization**: Cache de cálculos de ordenação

### Best Practices

- **Limit animations**: Máximo 20 linhas animadas por vez
- **Debounce search**: Delay na busca para performance
- **CSS containment**: Isolar animações

## Acessibilidade

### Suporte

- **Keyboard Navigation**: Navegação por teclado completa
- **Screen Readers**: Labels e descrições apropriadas
- **High Contrast**: Cores com contraste adequado
- **Reduced Motion**: Respeita preferências do usuário

### Implementação

```jsx
// ARIA labels
<tr role="row" aria-label={`Linha do time ${team.name} na posição ${team.position}`}>
  <td aria-label={`Posição ${team.position}`}>
    <PositionBadge position={team.position} />
  </td>
  <td aria-label={`Time ${team.name}`}>
    <TeamShield teamName={team.name} />
  </td>
</tr>
```

## Integração

### Uso Básico

```jsx
import RankingsTable from './components/RankingsTable';

function RankingsPage() {
  const [data, setData] = useState([]);
  
  return (
    <div className="p-8">
      <RankingsTable data={data} />
    </div>
  );
}
```

### Com Filtros

```jsx
import RankingsPage from './examples/RankingsPageExample';

function App() {
  return <RankingsPage />;
}
```

## Troubleshooting

### Problemas Comuns

1. **Imagens não carregam**
   - Verifique caminhos dos escudos
   - Confirme se os arquivos existem
   - Teste fallback automático

2. **Animações lentas**
   - Reduza número de linhas animadas
   - Use `will-change` CSS se necessário
   - Teste em dispositivos móveis

3. **Layout quebrado**
   - Verifique breakpoints CSS
   - Teste em diferentes tamanhos de tela
   - Confirme se Tailwind está configurado

### Debug Mode

```javascript
// Habilitar debug de animações
const debugMode = process.env.NODE_ENV === 'development';

if (debugMode) {
  console.log('Animation debug enabled');
}
```

## Roadmap

### Futuras Implementações

- [ ] **Live Updates**: Atualização em tempo real
- [ ] **Export**: Exportar para PDF/Excel
- [ ] **Historical**: Comparação com rodadas anteriores
- [ ] **Predictions**: Previsões de resultados
- [ ] **Social Share**: Compartilhamento nas redes sociais

### Melhorias

- [ ] **Virtual Scrolling**: Para 100+ times
- [ ] **Infinite Scroll**: Carregamento progressivo
- [ ] **Offline Support**: Cache local
- [ ] **PWA**: Progressive Web App

---

**Tabela de Classificação v2.0** - Design moderno, responsivo e acessível
