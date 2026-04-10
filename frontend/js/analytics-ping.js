/**
 * PSO Brasil - Analytics Ping Script
 * Envia pulso de telemetria para o site de análises a cada 30 segundos
 */

(function() {
    'use strict';

    const CONFIG = {
        ANALYTICS_URL: 'https://psobradminanalisesbot.squareweb.app',
        PING_INTERVAL: 30000, // 30 segundos
        SESSION_TIMEOUT: 30 * 60 * 1000 // 30 minutos
    };

    // Estado da sessão
    const state = {
        sessionId: generateSessionId(),
        userId: null,
        currentPage: window.location.pathname,
        sessionStartTime: Date.now(),
        lastPingTime: Date.now(),
        deviceType: detectDevice(),
        isActive: true
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

    // Obter página atual
    function getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('ranking')) return 'ranking';
        if (path.includes('perfil') || path.includes('profile')) return 'perfil';
        if (path.includes('torneio')) return 'torneios';
        if (path.includes('calendario')) return 'calendario';
        if (path === '/' || path === '') return 'home';
        return path.replace(/\//g, '');
    }

    // Enviar ping para o servidor de análises
    async function sendPing(eventType = 'ping') {
        try {
            const now = Date.now();
            const timeInSession = Math.floor((now - state.sessionStartTime) / 1000);
            
            const payload = {
                session_id: state.sessionId,
                user_id: getUserId(),
                page_visited: getCurrentPage(),
                device_type: state.deviceType,
                event: eventType,
                time_in_session: timeInSession,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer || null
            };

            // Usar sendBeacon se disponível
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`${CONFIG.ANALYTICS_URL}/api/analytics/track`, blob);
            } else {
                // Fallback fetch
                await fetch(`${CONFIG.ANALYTICS_URL}/api/analytics/track`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                });
            }

            state.lastPingTime = now;
            console.log(`[ANALYTICS PING] ${eventType} - ${payload.page_visited} - ${timeInSession}s`);

        } catch (error) {
            console.error('[ANALYTICS PING] Erro ao enviar:', error);
        }
    }

    // Enviar evento específico
    function trackEvent(eventName, data = {}) {
        const payload = {
            session_id: state.sessionId,
            user_id: getUserId(),
            page_visited: getCurrentPage(),
            device_type: state.deviceType,
            event: eventName,
            time_in_session: Math.floor((Date.now() - state.sessionStartTime) / 1000),
            data: data,
            timestamp: new Date().toISOString()
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${CONFIG.ANALYTICS_URL}/api/analytics/track`, blob);
        } else {
            fetch(`${CONFIG.ANALYTICS_URL}/api/analytics/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    }

    // Registrar saída do site
    function trackExit() {
        const payload = {
            session_id: state.sessionId,
            is_exit: true,
            last_action: 'site_exit',
            time_spent_seconds: Math.floor((Date.now() - state.sessionStartTime) / 1000),
            page_visited: getCurrentPage()
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${CONFIG.ANALYTICS_URL}/api/analytics/track`, blob);
        }
    }

    // Configurar listeners de eventos
    function setupEventListeners() {
        // Registrar cliques em elementos importantes
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-track], .ranking-item, .player-name, .nav-link, button, a');
            if (target) {
                const action = target.dataset.track || 
                               target.className?.split(' ')[0] || 
                               target.tagName?.toLowerCase() ||
                               'click';
                
                trackEvent('click_' + action, {
                    text: target.textContent?.substring(0, 50),
                    href: target.href || null
                });
            }
        });

        // Rastrear mudanças de página (SPA)
        let lastPath = window.location.pathname;
        setInterval(() => {
            const currentPath = window.location.pathname;
            if (currentPath !== lastPath) {
                trackEvent('page_change', { from: lastPath, to: currentPath });
                lastPath = currentPath;
                state.currentPage = currentPath;
            }
        }, 1000);

        // Registrar saída da página
        window.addEventListener('beforeunload', trackExit);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                trackEvent('tab_hidden');
            } else {
                trackEvent('tab_visible');
            }
        });
    }

    // Iniciar ping periódico
    function startPingInterval() {
        // Ping inicial
        sendPing('session_start');

        // Ping a cada 30 segundos
        setInterval(() => {
            if (state.isActive) {
                sendPing('ping');
            }
        }, CONFIG.PING_INTERVAL);
    }

    // Verificar se usuário está ativo
    function checkActivity() {
        let lastActivity = Date.now();
        
        ['click', 'scroll', 'keypress', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
                state.isActive = true;
            }, { passive: true });
        });

        // Verificar inatividade a cada minuto
        setInterval(() => {
            const inactive = Date.now() - lastActivity > CONFIG.SESSION_TIMEOUT;
            if (inactive && state.isActive) {
                state.isActive = false;
                trackEvent('session_inactive');
            }
        }, 60000);
    }

    // Inicializar
    function init() {
        state.userId = getUserId();
        
        setupEventListeners();
        startPingInterval();
        checkActivity();

        console.log('[ANALYTICS] Ping tracker inicializado', {
            sessionId: state.sessionId,
            analyticsUrl: CONFIG.ANALYTICS_URL
        });
    }

    // API pública
    window.PSOAnalyticsPing = {
        trackEvent,
        getSessionId: () => state.sessionId,
        getStats: () => ({
            sessionId: state.sessionId,
            sessionDuration: Math.floor((Date.now() - state.sessionStartTime) / 1000),
            currentPage: getCurrentPage(),
            isActive: state.isActive
        })
    };

    // Iniciar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
