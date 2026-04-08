import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StaggeredTableRow,
  AnimatedTableComponent,
  AnimatedPage,
  AnimatedContainer,
  AnimatedCard,
  AnimatedButton
} from './components/TableAnimations';
import {
  PageTransition,
  AnimatedLayout,
  AnimatedModal,
  AnimatedTabContent,
  AnimatedSkeleton
} from './components/PageTransitions';
import { Trophy, Users, Gamepad2, Bell, TrendingUp, Shield, Menu, X } from 'lucide-react';

// Exemplo completo de página com todas as animações
const AnimatedPageExample = () => {
  const [activeTab, setActiveTab] = React.useState('rankings');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Dados de exemplo para a tabela
  const rankingsData = [
    { pos: 1, player: 'ProGamer2024', points: 2850, wins: 142, rate: '78.5%' },
    { pos: 2, player: 'BrazilKing', points: 2720, wins: 138, rate: '76.2%' },
    { pos: 3, player: 'SoccerMaster', points: 2650, wins: 125, rate: '74.8%' },
    { pos: 4, player: 'NeoPlayer', points: 2580, wins: 120, rate: '72.1%' },
    { pos: 5, player: 'EliteStriker', points: 2500, wins: 115, rate: '69.8%' }
  ];

  const tournamentsData = [
    { name: 'Brasileirão 2024', participants: 32, status: 'Ativo', phase: 'Quartas' },
    { name: 'Copa do Brasil', participants: 64, status: 'Próximo', phase: 'Inscrições' },
    { name: 'Libertadores', participants: 16, status: 'Concluído', phase: 'Final' },
    { name: 'Sul-Americana', participants: 8, status: 'Ativo', phase: 'Semifinais' }
  ];

  React.useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatedLayout>
      <PageTransition>
        <AnimatedPage variant="fade" className="min-h-screen bg-background-950 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header animado */}
            <AnimatedContainer delay={0.2}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    Dashboard Animado
                  </h1>
                  <p className="text-gray-400">
                    Exemplo completo de animações com Framer Motion
                  </p>
                </div>
                <AnimatedButton className="px-6 py-3 bg-primary-500 text-white rounded-lg">
                  <Menu className="w-5 h-5 mr-2" />
                  Menu
                </AnimatedButton>
              </div>
            </AnimatedContainer>

            {/* Grid de cards animados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedCard delay={0.3} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-primary-400" />
                  </div>
                  <span className="text-sm text-gray-400">+12%</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">1,234</h3>
                <p className="text-gray-400 text-sm">Usuários Ativos</p>
              </AnimatedCard>

              <AnimatedCard delay={0.4} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-secondary-500/20 rounded-lg">
                    <Trophy className="w-6 h-6 text-secondary-400" />
                  </div>
                  <span className="text-sm text-gray-400">+5%</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">8</h3>
                <p className="text-gray-400 text-sm">Torneios Ativos</p>
              </AnimatedCard>

              <AnimatedCard delay={0.5} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-accent-500/20 rounded-lg">
                    <Gamepad2 className="w-6 h-6 text-accent-400" />
                  </div>
                  <span className="text-sm text-gray-400">-3%</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">156</h3>
                <p className="text-gray-400 text-sm">Partidas Hoje</p>
              </AnimatedCard>

              <AnimatedCard delay={0.6} className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg">
                    <Bell className="w-6 h-6 text-primary-400" />
                  </div>
                  <span className="text-sm text-gray-400">+25%</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">892</h3>
                <p className="text-gray-400 text-sm">Notificações</p>
              </AnimatedCard>
            </div>

            {/* Tabs animados */}
            <AnimatedContainer delay={0.7}>
              <div className="flex space-x-4 mb-6">
                {['rankings', 'tournaments', 'security'].map((tab) => (
                  <AnimatedButton
                    key={tab}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </AnimatedButton>
                ))}
              </div>
            </AnimatedContainer>

            {/* Conteúdo das tabs com animação */}
            <AnimatePresence mode="wait">
              <AnimatedTabContent
                key={activeTab}
                isActive={true}
                direction="up"
              >
                {activeTab === 'rankings' && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Rankings Globais
                    </h2>
                    
                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, index) => (
                          <div key={index} className="flex space-x-4">
                            <AnimatedSkeleton height="h-4" width="w-12" />
                            <AnimatedSkeleton height="h-4" width="w-32" />
                            <AnimatedSkeleton height="h-4" width="w-20" />
                            <AnimatedSkeleton height="h-4" width="w-16" />
                            <AnimatedSkeleton height="h-4" width="w-16" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AnimatedTableComponent
                        headers={['Pos', 'Jogador', 'Pontos', 'Vitórias', 'Taxa']}
                        data={rankingsData}
                        className="w-full"
                        rowDelay={0.1}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'tournaments' && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Torneios em Andamento
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tournamentsData.map((tournament, index) => (
                        <AnimatedCard key={index} delay={index * 0.1}>
                          <div className="p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-white">{tournament.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                tournament.status === 'Ativo' 
                                  ? 'bg-accent-500/20 text-accent-400'
                                  : tournament.status === 'Próximo'
                                  ? 'bg-secondary-500/20 text-secondary-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {tournament.status}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{tournament.participants} participantes</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Fase: {tournament.phase}</span>
                              <AnimatedButton className="px-3 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
                                Ver Detalhes
                              </AnimatedButton>
                            </div>
                          </div>
                        </AnimatedCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Estatísticas de Segurança
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AnimatedCard delay={0.1}>
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
                        </div>
                      </AnimatedCard>

                      <AnimatedCard delay={0.2}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Alertas de Segurança</span>
                            <span className="text-accent-400 font-bold">0</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">IPs Bloqueados</span>
                            <span className="text-red-400 font-bold">12</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Firewall Ativo</span>
                            <span className="text-green-400 font-bold">Sim</span>
                          </div>
                        </div>
                      </AnimatedCard>
                    </div>
                  </div>
                )}
              </AnimatedTabContent>
            </AnimatePresence>

            {/* Botão para abrir modal */}
            <AnimatedContainer delay={0.8}>
              <AnimatedButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-accent-500 text-white rounded-lg"
                onClick={() => setIsModalOpen(true)}
              >
                Abrir Modal Animado
              </AnimatedButton>
            </AnimatedContainer>
          </div>
        </AnimatedPage>

        {/* Modal animado */}
        <AnimatedModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-md w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Modal Animado</h3>
            <AnimatedButton
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-white/10 rounded-lg"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </AnimatedButton>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              Este modal utiliza animações de scale e fade do Framer Motion.
              Observe como o modal aparece e desaparece suavemente.
            </p>
            
            <div className="flex space-x-4">
              <AnimatedButton className="px-4 py-2 bg-primary-500 text-white rounded-lg">
                Confirmar
              </AnimatedButton>
              <AnimatedButton className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg">
                Cancelar
              </AnimatedButton>
            </div>
          </div>
        </AnimatedModal>
      </PageTransition>
    </AnimatedLayout>
  );
};

export default AnimatedPageExample;
