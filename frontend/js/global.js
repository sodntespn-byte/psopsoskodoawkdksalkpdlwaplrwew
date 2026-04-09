/**
 * PSO BRASIL - Global JavaScript
 * Sistema Unificado de Navegação e Funcionalidades
 */

// ==========================================
// CONFIGURAÇÃO GLOBAL
// ==========================================
const CONFIG = {
    API_URL: window.location.origin,
    JWT_SECRET: 'sua_chave_secreta_aqui',
    DISCORD_WEBHOOK_URL: localStorage.getItem('discord_webhook_url') || '',
    ADMIN_ROLES: ['admin', 'moderator'],
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 150
};

// ==========================================
// UTILIDADES
// ==========================================
const Utils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatDate: (date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatNumber: (num) => {
        return new Intl.NumberFormat('pt-BR').format(num);
    },

    generateId: () => {
        return Math.random().toString(36).substr(2, 9);
    },

    sanitizeHtml: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================
const Auth = {
    getToken: () => localStorage.getItem('token'),
    
    getUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    isAuthenticated: () => !!Auth.getToken(),
    
    isAdmin: () => {
        const user = Auth.getUser();
        return user && (user.role === 'admin' || user.username === 'admin');
    },
    
    login: async (username, password) => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login falhou');
            }
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    register: async (userData) => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Registro falhou');
            }
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    },
    
    getAuthHeaders: () => {
        const token = Auth.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// ==========================================
// COMPONENTE HEADER GLOBAL
// ==========================================
const Header = {
    init: () => {
        const header = document.querySelector('header');
        if (!header) return;
        
        // Header scroll effect
        window.addEventListener('scroll', Utils.throttle(() => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, 100));
        
        // Initialize mobile menu
        Header.initMobileMenu();
        
        // Update auth state
        Header.updateAuthState();
        
        // Show admin icons if user is admin
        Header.updateAdminIcons();
    },
    
    initMobileMenu: () => {
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileBtn && navLinks) {
            mobileBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                const icon = mobileBtn.querySelector('i');
                if (icon) {
                    const isOpen = navLinks.classList.contains('active');
                    icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                    lucide.createIcons();
                }
            });
        }
    },
    
    updateAuthState: () => {
        const authContainer = document.querySelector('.nav-auth');
        if (!authContainer) return;
        
        const user = Auth.getUser();
        
        if (user) {
            authContainer.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">${user.username}</span>
                    <button class="btn-login" onclick="Auth.logout()">Sair</button>
                </div>
            `;
        } else {
            authContainer.innerHTML = `
                <a href="/registrar" class="btn-login">Registrar</a>
                <button class="btn-login" onclick="Header.showLoginModal()">Entrar</button>
            `;
        }
    },
    
    updateAdminIcons: () => {
        const adminNav = document.querySelector('.nav-admin');
        if (!adminNav) return;
        
        if (Auth.isAdmin()) {
            adminNav.classList.remove('hidden');
        } else {
            adminNav.classList.add('hidden');
        }
    },
    
    showLoginModal: () => {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('active');
        }
    },
    
    hideLoginModal: () => {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// ==========================================
// NOTIFICAÇÕES
// ==========================================
const Notifications = {
    show: (message, type = 'success', duration = 5000) => {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        document.body.appendChild(toast);
        lucide.createIcons();
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success: (message) => Notifications.show(message, 'success'),
    error: (message) => Notifications.show(message, 'error'),
    info: (message) => Notifications.show(message, 'info')
};

// ==========================================
// DISCORD WEBHOOK
// ==========================================
const DiscordWebhook = {
    send: async (title, description, fields = [], color = '#22C55E') => {
        const webhookUrl = CONFIG.DISCORD_WEBHOOK_URL;
        
        if (!webhookUrl) {
            console.error('Discord webhook URL não configurado');
            return false;
        }
        
        try {
            const embed = {
                title: title,
                description: description,
                color: parseInt(color.replace('#', ''), 16),
                fields: fields,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'PSO Brasil - Sistema de Notificações'
                }
            };
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Erro ao enviar webhook:', error);
            return false;
        }
    },
    
    // Enviar notificação em massa (apenas admin)
    sendMassNotification: async (title, content, type = 'info') => {
        if (!Auth.isAdmin()) {
            Notifications.error('Apenas administradores podem enviar notificações em massa');
            return false;
        }
        
        const colors = {
            info: '#22C55E',
            warning: '#FACC15',
            error: '#EF4444',
            success: '#22C55E'
        };
        
        const success = await DiscordWebhook.send(
            `📢 ${title}`,
            content,
            [],
            colors[type] || colors.info
        );
        
        if (success) {
            Notifications.success('Notificação enviada com sucesso!');
        } else {
            Notifications.error('Falha ao enviar notificação');
        }
        
        return success;
    }
};

// ==========================================
// ANIMAÇÕES DE SCROLL
// ==========================================
const ScrollAnimations = {
    init: () => {
        const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        reveals.forEach(el => observer.observe(el));
    },
    
    // Smooth scroll para âncoras
    initSmoothScroll: () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
};

// ==========================================
// FORMULÁRIOS
// ==========================================
const Forms = {
    initValidation: () => {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                let isValid = true;
                
                form.querySelectorAll('[required]').forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.classList.add('error');
                        
                        const errorMsg = field.parentElement.querySelector('.error-message');
                        if (errorMsg) {
                            errorMsg.textContent = 'Este campo é obrigatório';
                            errorMsg.style.display = 'block';
                        }
                    } else {
                        field.classList.remove('error');
                        const errorMsg = field.parentElement.querySelector('.error-message');
                        if (errorMsg) {
                            errorMsg.style.display = 'none';
                        }
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
    }
};

// ==========================================
// INICIALIZAÇÃO GLOBAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar ícones Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Inicializar header
    Header.init();
    
    // Inicializar animações de scroll
    ScrollAnimations.init();
    ScrollAnimations.initSmoothScroll();
    
    // Inicializar validação de formulários
    Forms.initValidation();
    
    // Adicionar classe de navegação ativa
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.replace('../', '/').replace('.html', ''))) {
            link.classList.add('active');
        }
    });
    
    console.log('🎮 PSO Brasil - Sistema inicializado');
});

// ==========================================
// EXPOR PARA O ESCOPO GLOBAL
// ==========================================
window.CONFIG = CONFIG;
window.Utils = Utils;
window.Auth = Auth;
window.Notifications = Notifications;
window.DiscordWebhook = DiscordWebhook;
window.Header = Header;
