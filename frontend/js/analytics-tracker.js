/**
 * PSO Brasil - Analytics Tracker
 * Sistema de monitoramento de usuários em tempo real
 * Usa navigator.sendBeacon para performance otimizada
 */

(function() {
    'use strict';

    // Configurações
    const CONFIG = {
        API_ENDPOINT: '/api/analytics',
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
        HEARTBEAT_INTERVAL: 30000 // 30 segundos
    };

    // Estado da sessão
    const state = {
        sessionId: generateSessionId(),
        userId: null,
        currentPage: window.location.pathname,
        pageEntryTime: Date.now(),
        deviceType: detectDevice(),
        isNewUser: !localStorage.getItem('pso_returning_user'),
        lastActivity: Date.now()
    };

    // Gerar ID de sessão único
    function generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Detectar tipo de dispositivo
    function detectDevice() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
            return /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
        }
        return 'desktop';
    }

    // Obter ID do usuário se logado
    function getUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || user.username || null;
        } catch (e) {
            return null;
        }
    }

    // Enviar dados de analytics
    function sendAnalytics(data) {
        const payload = {
            ...data,
            session_id: state.sessionId,
            device_type: state.deviceType,
            user_id: getUserId()
        };

        // Usar sendBeacon se disponível (não bloqueia navegação)
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(CONFIG.API_ENDPOINT + '/track', blob);
        } else {
            // Fallback para fetch
            fetch(CONFIG.API_ENDPOINT + '/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    }

    // Registrar entrada em uma página
    function trackPageEntry(page) {
        state.currentPage = page;
        state.pageEntryTime = Date.now();

        sendAnalytics({
            page_visited: page,
            is_new_user: state.isNewUser,
            referrer: document.referrer
        });

        // Marcar como usuário retornante
        if (state.isNewUser) {
            localStorage.setItem('pso_returning_user', 'true');
            state.isNewUser = false;
        }
    }

    // Registrar saída de uma página
    function trackPageExit(lastAction) {
        const timeSpent = Math.floor((Date.now() - state.pageEntryTime) / 1000);

        sendAnalytics({
            page_visited: state.currentPage,
            is_exit: true,
            last_action: lastAction,
            time_spent_seconds: timeSpent
        });
    }

    // Registrar mudança de página
    function trackPageChange(toPage) {
        const timeSpent = Math.floor((Date.now() - state.pageEntryTime) / 1000);

        sendAnalytics({
            session_id: state.sessionId,
            from_page: state.currentPage,
            to_page: toPage,
            time_spent_seconds: timeSpent,
            device_type: state.deviceType,
            user_id: getUserId()
        });

        state.currentPage = toPage;
        state.pageEntryTime = Date.now();
    }

    // Registrar atividade do usuário
    function trackActivity(action) {
        state.lastActivity = Date.now();
        // Não envia imediatamente, apenas atualiza estado
    }

    // Detectar qual aba/seção está ativa baseado na URL ou elemento visível
    function getCurrentSection() {
        const path = window.location.pathname;
        
        // Mapear paths para seções
        if (path.includes('ranking') || path.includes('rankings')) return 'ranking';
        if (path.includes('perfil') || path.includes('profile')) return 'perfil';
        if (path.includes('torneio') || path.includes('tournament')) return 'torneios';
        if (path.includes('calendario') || path.includes('calendar')) return 'calendario';
        if (path.includes('noticia') || path.includes('news')) return 'noticias';
        if (path.includes('admin')) return 'admin';
        if (path === '/' || path === '') return 'home';
        
        // Verificar elementos visíveis na página
        if (document.getElementById('rankings')?.offsetParent !== null) return 'ranking';
        if (document.getElementById('playerProfileModal')?.classList.contains('active')) return 'perfil';
        if (document.getElementById('tournaments')?.offsetParent !== null) return 'torneios';
        
        return 'home';
    }

    // Observar mudanças de visibilidade (troca de abas)
    function handleVisibilityChange() {
        if (document.hidden) {
            // Usuário saiu da aba
            trackPageExit('tab_hidden');
        } else {
            // Usuário voltou para a aba
            const section = getCurrentSection();
            trackPageEntry(section);
        }
    }

    // Observar mudanças no hash (navegação SPA)
    function handleHashChange() {
        const section = getCurrentSection();
        trackPageChange(section);
    }

    // Registrar antes de sair da página
    function handleBeforeUnload() {
        trackPageExit('page_close');
    }

    // Registrar cliques em elementos importantes
    function handleClick(e) {
        const target = e.target.closest('[data-track], .ranking-item, .player-name, .nav-link, button');
        if (target) {
            const action = target.dataset.track || target.className || target.tagName;
            trackActivity('click_' + action);
        }
    }

    // Registrar scroll (indica engajamento)
    let scrollTimeout;
    function handleScroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackActivity('scroll');
        }, 250);
    }

    // Heartbeat - manter sessão ativa
    function sendHeartbeat() {
        const timeOnPage = Math.floor((Date.now() - state.pageEntryTime) / 1000);
        
        // Se passou muito tempo sem atividade, considerar nova sessão
        if (Date.now() - state.lastActivity > CONFIG.SESSION_TIMEOUT) {
            state.sessionId = generateSessionId();
            state.pageEntryTime = Date.now();
        }

        // Registrar atividade se estiver interagindo
        if (timeOnPage > 0 && timeOnPage % 60 === 0) { // A cada minuto
            trackActivity('heartbeat_' + timeOnPage + 's');
        }
    }

    // Inicializar tracking
    function init() {
        // Registrar entrada inicial
        trackPageEntry(getCurrentSection());

        // Event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('click', handleClick);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Heartbeat
        setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL);

        // Marcar usuário como ativo
        state.userId = getUserId();

        console.log('[ANALYTICS] Tracker inicializado', {
            sessionId: state.sessionId,
            device: state.deviceType,
            page: state.currentPage
        });
    }

    // API pública
    window.PSOAnalytics = {
        trackEvent: (eventName, data = {}) => {
            sendAnalytics({
                page_visited: state.currentPage,
                last_action: eventName,
                ...data
            });
        },
        trackPageView: (page) => {
            trackPageChange(page);
        },
        getSessionId: () => state.sessionId,
        getStats: () => ({
            sessionId: state.sessionId,
            currentPage: state.currentPage,
            timeOnPage: Math.floor((Date.now() - state.pageEntryTime) / 1000),
            deviceType: state.deviceType
        })
    };

    // Iniciar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
