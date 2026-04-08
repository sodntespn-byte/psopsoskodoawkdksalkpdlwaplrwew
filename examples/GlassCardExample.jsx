import React from 'react';
import GlassCard from './components/GlassCard';
import { Trophy, Users, Gamepad2, Bell, TrendingUp, Shield } from 'lucide-react';

// Exemplo de uso do GlassCard em tabelas e estatísticas
const DashboardExample = () => {
  return (
    <div className="min-h-screen bg-background-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Título */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Dashboard com GlassCard
          </h1>
          <p className="text-gray-400">
            Componentes reutilizáveis com efeito glassmorphism
          </p>
        </div>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard glowColor="primary" intensity="medium">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-primary-400" />
                </div>
                <span className="text-sm text-gray-400">+12%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">1,234</h3>
              <p className="text-gray-400 text-sm">Usuários Ativos</p>
            </div>
          </GlassCard>

          <GlassCard glowColor="secondary" intensity="medium">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary-500/20 rounded-lg">
                  <Trophy className="w-6 h-6 text-secondary-400" />
                </div>
                <span className="text-sm text-gray-400">+5%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">8</h3>
              <p className="text-gray-400 text-sm">Torneios Ativos</p>
            </div>
          </GlassCard>

          <GlassCard glowColor="accent" intensity="medium">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent-500/20 rounded-lg">
                  <Gamepad2 className="w-6 h-6 text-accent-400" />
                </div>
                <span className="text-sm text-gray-400">-3%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">156</h3>
              <p className="text-gray-400 text-sm">Partidas Hoje</p>
            </div>
          </GlassCard>

          <GlassCard glowColor="primary" intensity="high">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-500/20 rounded-lg">
                  <Bell className="w-6 h-6 text-primary-400" />
                </div>
                <span className="text-sm text-gray-400">+25%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">892</h3>
              <p className="text-gray-400 text-sm">Notificações</p>
            </div>
          </GlassCard>
        </div>

        {/* Tabela de Rankings */}
        <GlassCard glowColor="primary" intensity="low" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Rankings Globais
            </h2>
            <button className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors">
              Ver Todos
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Pos</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Jogador</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Pontos</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Vitórias</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">1</td>
                  <td className="py-3 px-4 text-white">ProGamer2024</td>
                  <td className="py-3 px-4 text-primary-400 font-bold">2,850</td>
                  <td className="py-3 px-4 text-gray-300">142</td>
                  <td className="py-3 px-4 text-accent-400">78.5%</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">2</td>
                  <td className="py-3 px-4 text-white">BrazilKing</td>
                  <td className="py-3 px-4 text-primary-400 font-bold">2,720</td>
                  <td className="py-3 px-4 text-gray-300">138</td>
                  <td className="py-3 px-4 text-accent-400">76.2%</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">3</td>
                  <td className="py-3 px-4 text-white">SoccerMaster</td>
                  <td className="py-3 px-4 text-primary-400 font-bold">2,650</td>
                  <td className="py-3 px-4 text-gray-300">125</td>
                  <td className="py-3 px-4 text-accent-400">74.8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Tabela de Torneios */}
        <GlassCard glowColor="secondary" intensity="medium" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Torneios em Andamento
            </h2>
            <button className="px-4 py-2 bg-secondary-500/20 text-secondary-400 rounded-lg hover:bg-secondary-500/30 transition-colors">
              Criar Torneio
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Brasileirão 2024</h3>
                <span className="px-2 py-1 bg-accent-500/20 text-accent-400 text-xs rounded-full">
                  Ativo
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-2">32 participantes</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Início: 20/01/2024</span>
                <span className="text-xs text-primary-400">Fase: Quartas</span>
              </div>
            </div>
            
            <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Copa do Brasil</h3>
                <span className="px-2 py-1 bg-secondary-500/20 text-secondary-400 text-xs rounded-full">
                  Próximo
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-2">64 participantes</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Início: 01/02/2024</span>
                <span className="text-xs text-gray-400">Inscrições abertas</span>
              </div>
            </div>
            
            <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Libertadores</h3>
                <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                  Concluído
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-2">16 participantes</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fim: 15/12/2023</span>
                <span className="text-xs text-secondary-400">Campeão: BrazilFC</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Seção de Estatísticas Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard glowColor="accent" intensity="high" className="p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Estatísticas de Segurança
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Tentativas de Login</span>
                <span className="text-white font-bold">1,234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Falhas de Autenticação</span>
                <span className="text-red-400 font-bold">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Contas Bloqueadas</span>
                <span className="text-yellow-400 font-bold">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Alertas de Segurança</span>
                <span className="text-accent-400 font-bold">0</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard glowColor="primary" intensity="medium" className="p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Atividade de Notificações
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Enviadas Hoje</span>
                <span className="text-white font-bold">892</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Taxa de Abertura</span>
                <span className="text-primary-400 font-bold">67.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cliques</span>
                <span className="text-secondary-400 font-bold">156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Falhas de Envio</span>
                <span className="text-red-400 font-bold">2</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardExample;
