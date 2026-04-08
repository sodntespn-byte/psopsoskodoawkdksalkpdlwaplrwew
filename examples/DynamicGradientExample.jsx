import React from 'react';
import DynamicGradientBackground from './components/DynamicGradientBackgroundOptimized';
import GlassCard from './components/GlassCard';
import { Trophy, Users, Gamepad2, Bell, Sparkles, Zap } from 'lucide-react';

// Página de exemplo com gradiente dinâmico
const DynamicGradientExample = () => {
  return (
    <DynamicGradientBackground>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header com efeito de brilho */}
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 relative inline-block">
              <span className="relative z-10">Gradiente Dinâmico</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 blur-xl opacity-50"></div>
            </h1>
            <p className="text-gray-300 text-lg relative z-10">
              O gradiente radial segue o movimento do mouse criando uma iluminação dinâmica
            </p>
          </div>

          {/* Cards de demonstração */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard glowColor="primary" intensity="medium">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-primary-400" />
                  </div>
                  <Sparkles className="w-5 h-5 text-primary-400" />
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
                  <Zap className="w-5 h-5 text-secondary-400" />
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
                  <Sparkles className="w-5 h-5 text-accent-400" />
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
                  <Zap className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">892</h3>
                <p className="text-gray-400 text-sm">Notificações</p>
              </div>
            </GlassCard>
          </div>

          {/* Seção de demonstração */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassCard glowColor="primary" intensity="low" className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary-400" />
                Características do Gradiente
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Movimento Suave</h4>
                    <p className="text-gray-400 text-sm">O gradiente segue o mouse com interpolação suave</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-secondary-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Opacidade Baixa</h4>
                    <p className="text-gray-400 text-sm">5% de opacidade para efeito sutil</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Cores Temáticas</h4>
                    <p className="text-gray-400 text-sm">Primary (#00D1FF) e Secondary (#FFD700)</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Multi-camadas</h4>
                    <p className="text-gray-400 text-sm">Múltiplos gradientes para profundidade</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard glowColor="secondary" intensity="low" className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-secondary-400" />
                Performance Otimizada
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">60 FPS</h4>
                    <p className="text-gray-400 text-sm">Animações otimizadas para 60fps</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Hardware Accelerated</h4>
                    <p className="text-gray-400 text-sm">GPU acceleration para smooth performance</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Mobile Support</h4>
                    <p className="text-gray-400 text-sm">Suporte completo para touch devices</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-white font-semibold">Memory Efficient</h4>
                    <p className="text-gray-400 text-sm">Otimizado para baixo consumo de memória</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Seção interativa */}
          <GlassCard glowColor="accent" intensity="medium" className="p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Experimente o Gradiente!
            </h2>
            <p className="text-gray-300 mb-6">
              Mova o mouse pela tela para ver o gradiente dinâmico seguindo seu movimento.
              O efeito é mais visível em áreas escuras do site.
            </p>
            
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-primary-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-primary-400 text-sm">Primary</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-500/20 rounded-full flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-secondary-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-secondary-400 text-sm">Secondary</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-500/20 rounded-full flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-accent-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-accent-400 text-sm">Accent</p>
              </div>
            </div>
          </GlassCard>

          {/* Footer info */}
          <div className="text-center text-gray-400">
            <p className="mb-2">
              <Sparkles className="inline-block w-4 h-4 mr-2" />
              Gradiente Radial Dinâmico v1.0
            </p>
            <p className="text-sm">
              Movimente o mouse para ver o efeito de iluminação dinâmica
            </p>
          </div>
        </div>
      </div>
    </DynamicGradientBackground>
  );
};

export default DynamicGradientExample;
