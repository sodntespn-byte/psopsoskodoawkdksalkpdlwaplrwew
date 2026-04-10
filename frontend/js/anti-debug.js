/**
 * PSO BRASIL - Anti-Debugger Protection
 * Sistema de proteção contra inspeção de código
 * AVISO: Uso legítimo para proteção de propriedade intelectual
 */

(function() {
    'use strict';
    
    // ==========================================
    // CONFIGURAÇÃO E ESTADO
    // ==========================================
    const CONFIG = {
        DEBUG: false,
        CHECK_INTERVAL: 100,
        THRESHOLD: 100,
        REDIRECT_URL: 'about:blank'
    };
    
    let isDevToolsOpen = false;
    let checkCount = 0;
    let startTime = Date.now();
    
    // ==========================================
    // OFUSCAÇÃO - Funções codificadas
    // ==========================================
    const _0x4f3a = ['log', 'warn', 'error', 'dir', 'info', 'debug', 'table', 'trace', 'clear'];
    const _0x2b1c = function(s) { return String.fromCharCode.apply(null, s.split(',').map(Number)); };
    
    // String encoding
    const _s = function(str) {
        return str.split('').map(c => c.charCodeAt(0)).join(',');
    };
    
    // ==========================================
    // CONSOLE POISONING
    // ==========================================
    (function() {
        const originalConsole = {};
        const methods = ['log', 'warn', 'error', 'info', 'debug', 'table', 'trace', 'dir', 'group', 'groupEnd', 'time', 'timeEnd', 'assert', 'count', 'clear'];
        
        methods.forEach(method => {
            if (typeof console[method] === 'function') {
                originalConsole[method] = console[method];
                
                console[method] = function() {
                    // Clear console immediately
                    if (originalConsole.clear) {
                        originalConsole.clear.call(console);
                    }
                    
                    // Override with empty function
                    return function() {};
                }();
            }
        });
        
        // Make console object non-writable
        try {
            Object.defineProperty(window, 'console', {
                writable: false,
                configurable: false
            });
        } catch(e) {}
    })();
    
    // ==========================================
    // DETECÇÃO DE DEVTOOLS
    // ==========================================
    const devtoolsDetector = {
        // Método 1: Diferença de dimensões
        checkDimensions: function() {
            const threshold = 160;
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            return widthThreshold || heightThreshold;
        },
        
        // Método 2: Detecção via console API
        checkConsoleAPI: function() {
            const start = performance.now();
            console.log('');
            console.clear();
            const end = performance.now();
            
            return (end - start) > 100;
        },
        
        // Método 3: Debugger timing
        checkDebuggerTiming: function() {
            const start = performance.now();
            debugger;
            const end = performance.now();
            
            return (end - start) > 100;
        },
        
        // Método 4: Stack trace analysis
        checkStackTrace: function() {
            const stack = new Error().stack;
            return stack && (
                stack.includes('devtools') ||
                stack.includes('debugger') ||
                stack.includes('chrome-extension')
            );
        }
    };
    
    // ==========================================
    // LOOP DE DEBUGGER INFINITO
    // ==========================================
    function infiniteDebugger() {
        const _0xdeadbeef = function() {
            debugger;
            _0xdeadbeef();
        };
        
        // Recursive call with delay to prevent complete freeze
        setInterval(function() {
            if (isDevToolsOpen) {
                (function() {
                    (function() {
                        (function() {
                            (function() {
                                debugger;
                                return ![];
                            })();
                        })();
                    })();
                })();
            }
        }, 50);
    }
    
    // ==========================================
    // DETECÇÃO DE TEMPO DE EXECUÇÃO
    // ==========================================
    function timingCheck() {
        const operations = 1000000;
        let sum = 0;
        
        const start = performance.now();
        
        for (let i = 0; i < operations; i++) {
            sum += Math.sqrt(i);
        }
        
        const end = performance.now();
        const duration = end - start;
        
        // Se está muito lento, provavelmente está sendo debugado
        if (duration > 500) {
            triggerProtection();
        }
        
        return sum; // Prevent optimization
    }
    
    // ==========================================
    // FUNÇÕES DE PROTEÇÃO
    // ==========================================
    function triggerProtection() {
        if (isDevToolsOpen) return;
        isDevToolsOpen = true;
        
        // Iniciar loop infinito de debugger
        infiniteDebugger();
        
        // Limpar todas as informações
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}
        
        // Redirecionar após delay
        setTimeout(function() {
            window.location.href = CONFIG.REDIRECT_URL;
        }, 1000);
        
        // Freeze the page
        document.body.innerHTML = '';
        document.body.style.cssText = 'background: #000 !important; overflow: hidden !important;';
        
        // Prevent further execution
        throw new Error('Security violation detected');
    }
    
    // ==========================================
    // MONITORAMENTO CONTÍNUO
    // ==========================================
    function startMonitoring() {
        // Check 1: Dimensões da janela
        setInterval(function() {
            if (devtoolsDetector.checkDimensions()) {
                triggerProtection();
            }
        }, CONFIG.CHECK_INTERVAL);
        
        // Check 2: Timing aleatório
        setInterval(function() {
            if (Math.random() > 0.7) {
                timingCheck();
            }
        }, 5000);
        
        // Check 3: Stack trace
        setInterval(function() {
            if (devtoolsDetector.checkStackTrace()) {
                triggerProtection();
            }
        }, 2000);
        
        // Check 4: Detecção via propriedades
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: function() {
                triggerProtection();
                return 'debug';
            }
        });
        
        // Check 5: Mutation observer
        let lastMutation = Date.now();
        const observer = new MutationObserver(function() {
            const now = Date.now();
            if (now - lastMutation > 100) {
                checkCount++;
                if (checkCount > 50) {
                    triggerProtection();
                }
            }
            lastMutation = now;
        });
        
        observer.observe(document, {
            subtree: true,
            childList: true
        });
    }
    
    // ==========================================
    // OFUSCAÇÃO ADICIONAL
    // ==========================================
    function obfuscate() {
        // Reordenar funções
        const funcs = [startMonitoring, timingCheck, triggerProtection];
        funcs.sort(function() { return Math.random() - 0.5; });
        
        // Codificar strings críticas
        const encodedStrings = {
            d: _s('debugger'),
            c: _s('console'),
            l: _s('log'),
            w: _s('warn'),
            e: _s('error')
        };
        
        return encodedStrings;
    }
    
    // ==========================================
    // PREVENÇÃO DE BYPASS
    // ==========================================
    (function() {
        // Prevenir override de funções de proteção
        const protectFunction = function(func, name) {
            if (typeof func !== 'function') return;
            
            try {
                Object.defineProperty(window, name, {
                    value: func,
                    writable: false,
                    configurable: false
                });
            } catch(e) {}
        };
        
        // Proteger funções críticas
        protectFunction(startMonitoring, '_0x1a2b');
        protectFunction(timingCheck, '_0x3c4d');
        protectFunction(triggerProtection, '_0x5e6f');
    })();
    
    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    function init() {
        // Ofuscar antes de iniciar
        obfuscate();
        
        // Iniciar monitoramento após delay aleatório
        setTimeout(function() {
            startMonitoring();
        }, Math.random() * 1000 + 500);
        
        // Verificação inicial
        if (devtoolsDetector.checkDimensions() || 
            devtoolsDetector.checkStackTrace()) {
            triggerProtection();
        }
    }
    
    // Iniciar proteção
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Backup initialization
    window.addEventListener('load', function() {
        setTimeout(init, 100);
    });
    
})();
