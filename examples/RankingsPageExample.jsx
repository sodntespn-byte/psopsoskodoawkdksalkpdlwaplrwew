import React, { useState } from 'react';
import RankingsTable from './components/RankingsTable';
import GlassCard from './components/GlassCard';
import { Trophy, TrendingUp, Filter, Search, ChevronDown } from 'lucide-react';

// Dados de exemplo para a tabela de classificação
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
  },
  {
    id: 2,
    position: 2,
    name: 'Palmeiras',
    shieldUrl: '/shields/palmeiras.png',
    points: 25,
    played: 12,
    wins: 7,
    draws: 4,
    losses: 1,
    goalsFor: 18,
    goalsAgainst: 7,
    goalDifference: 11,
    form: 'VVDDV'
  },
  {
    id: 3,
    position: 3,
    name: 'Corinthians',
    shieldUrl: '/shields/corinthians.png',
    points: 22,
    played: 12,
    wins: 6,
    draws: 4,
    losses: 2,
    goalsFor: 20,
    goalsAgainst: 12,
    goalDifference: 8,
    form: 'VDVVD'
  },
  {
    id: 4,
    position: 4,
    name: 'São Paulo',
    shieldUrl: '/shields/sao-paulo.png',
    points: 20,
    played: 12,
    wins: 6,
    draws: 2,
    losses: 4,
    goalsFor: 16,
    goalsAgainst: 14,
    goalDifference: 2,
    form: 'VDDVV'
  },
  {
    id: 5,
    position: 5,
    name: 'Santos',
    shieldUrl: '/shields/santos.png',
    points: 19,
    played: 12,
    wins: 5,
    draws: 4,
    losses: 3,
    goalsFor: 17,
    goalsAgainst: 13,
    goalDifference: 4,
    form: 'DVDDV'
  },
  {
    id: 6,
    position: 6,
    name: 'Grêmio',
    shieldUrl: '/shields/gremio.png',
    points: 18,
    played: 12,
    wins: 5,
    draws: 3,
    losses: 4,
    goalsFor: 14,
    goalsAgainst: 12,
    goalDifference: 2,
    form: 'DDVDV'
  },
  {
    id: 7,
    position: 7,
    name: 'Cruzeiro',
    shieldUrl: '/shields/cruzeiro.png',
    points: 17,
    played: 12,
    wins: 4,
    draws: 5,
    losses: 3,
    goalsFor: 15,
    goalsAgainst: 11,
    goalDifference: 4,
    form: 'VDVDD'
  },
  {
    id: 8,
    position: 8,
    name: 'Internacional',
    shieldUrl: '/shields/internacional.png',
    points: 16,
    played: 12,
    wins: 4,
    draws: 4,
    losses: 4,
    goalsFor: 13,
    goalsAgainst: 13,
    goalDifference: 0,
    form: 'DDVDV'
  },
  {
    id: 9,
    position: 9,
    name: 'Atlético-MG',
    shieldUrl: '/shields/atletico-mg.png',
    points: 15,
    played: 12,
    wins: 4,
    draws: 3,
    losses: 5,
    goalsFor: 12,
    goalsAgainst: 15,
    goalDifference: -3,
    form: 'VDDDD'
  },
  {
    id: 10,
    position: 10,
    name: 'Botafogo',
    shieldUrl: '/shields/botafogo.png',
    points: 14,
    played: 12,
    wins: 3,
    draws: 5,
    losses: 4,
    goalsFor: 11,
    goalsAgainst: 14,
    goalDifference: -3,
    form: 'DDVDD'
  }
];

// Componente de filtros avançados
const RankingsFilters = ({ onFilter, onSearch }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = [
    { value: 'all', label: 'Todos' },
    { value: 'home', label: 'Mandantes' },
    { value: 'away', label: 'Visitantes' },
    { value: 'form', label: 'Melhor Forma' },
    { value: 'goals', label: 'Mais Gols' }
  ];

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    onFilter(filter);
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    onSearch(term);
  };

  return (
    <GlassCard className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar time..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white/15 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedFilter === filter.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Componente de estatísticas da tabela
const RankingsStats = ({ data }) => {
  const topTeam = data[0];
  const bottomTeam = data[data.length - 1];
  const totalGoals = data.reduce((sum, team) => sum + team.goalsFor, 0);
  const avgGoals = (totalGoals / data.length).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Líder</p>
            <p className="text-white font-bold">{topTeam.name}</p>
            <p className="text-primary-400 text-2xl font-bold">{topTeam.points} pts</p>
          </div>
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Último</p>
            <p className="text-white font-bold">{bottomTeam.name}</p>
            <p className="text-red-400 text-2xl font-bold">{bottomTeam.points} pts</p>
          </div>
          <TrendingDown className="w-8 h-8 text-red-400" />
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total de Gols</p>
            <p className="text-white font-bold">Campeonato</p>
            <p className="text-accent-400 text-2xl font-bold">{totalGoals}</p>
          </div>
          <div className="w-8 h-8 bg-accent-500/20 rounded-full flex items-center justify-center">
            <span className="text-accent-400 font-bold text-sm">G</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Média de Gols</p>
            <p className="text-white font-bold">Por Time</p>
            <p className="text-secondary-400 text-2xl font-bold">{avgGoals}</p>
          </div>
          <div className="w-8 h-8 bg-secondary-500/20 rounded-full flex items-center justify-center">
            <span className="text-secondary-400 font-bold text-sm">M</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Página completa de classificações
const RankingsPage = () => {
  const [filteredData, setFilteredData] = useState(rankingsData);
  const [activeView, setActiveView] = useState('table'); // 'table' or 'cards'

  const handleFilter = (filter) => {
    let filtered = [...rankingsData];
    
    switch (filter) {
      case 'home':
        // Simulação: times com melhor desempenho em casa
        filtered = filtered.filter(team => team.wins >= 5);
        break;
      case 'away':
        // Simulação: times com melhor desempenho fora
        filtered = filtered.filter(team => team.goalDifference > 0);
        break;
      case 'form':
        // Simulação: times com melhor forma recente
        filtered = filtered.filter(team => team.form.includes('VV'));
        break;
      case 'goals':
        // Simulação: times que mais marcam
        filtered = filtered.filter(team => team.goalsFor >= 15);
        break;
      default:
        filtered = rankingsData;
    }
    
    setFilteredData(filtered);
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm) {
      setFilteredData(rankingsData);
      return;
    }
    
    const filtered = rankingsData.filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredData(filtered);
  };

  return (
    <div className="min-h-screen bg-background-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            Classificação Brasileirão 2024
          </h1>
          <p className="text-gray-400">
            Tabela completa com estatísticas detalhadas e forma recente dos times
          </p>
        </div>

        {/* Estatísticas */}
        <RankingsStats data={filteredData} />

        {/* Filtros */}
        <RankingsFilters onFilter={handleFilter} onSearch={handleSearch} />

        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('table')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeView === 'table'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setActiveView('cards')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeView === 'cards'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Tabela ou Cards */}
        {activeView === 'table' ? (
          <RankingsTable data={filteredData} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((team, index) => (
              <GlassCard key={team.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                      {team.position}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{team.name}</h3>
                      <p className="text-gray-400 text-sm">{team.points} pontos</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary-400">
                    {team.position}º
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{team.played}</div>
                    <div className="text-xs text-gray-500">J</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">
                      <span className="text-green-400">{team.wins}</span>-
                      <span className="text-yellow-400">{team.draws}</span>-
                      <span className="text-red-400">{team.losses}</span>
                    </div>
                    <div className="text-xs text-gray-500">V-E-D</div>
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${
                      team.goalDifference > 0 ? 'text-green-400' : 
                      team.goalDifference < 0 ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </div>
                    <div className="text-xs text-gray-500">SG</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Forma:</span>
                  <div className="flex space-x-1">
                    {team.form.split('').map((result, index) => (
                      <div
                        key={index}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          result.toUpperCase() === 'V' ? 'bg-green-500 text-white' :
                          result.toUpperCase() === 'D' ? 'bg-yellow-500 text-white' :
                          'bg-red-500 text-white'
                        }`}
                      >
                        {result.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 text-center text-gray-400">
          <p>Atualizado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          <p className="text-sm mt-2">Dados simulados para demonstração</p>
        </div>
      </div>
    </div>
  );
};

export default RankingsPage;
