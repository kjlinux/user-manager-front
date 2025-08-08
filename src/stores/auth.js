import authService from '@/service/authService';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        loading: false,
        error: null,
        isLoggingOut: false
    }),

    getters: {
        isLoggedIn: (state) => state.isAuthenticated && state.user !== null,
        userName: (state) => state.user?.name || '',
        userEmail: (state) => state.user?.email || '',

        hasRole: (state) => (role) => {
            return state.roles.includes(role);
        },

        hasPermission: (state) => (permission) => {
            return state.permissions.includes(permission);
        },

        hasAnyRole: (state) => (roles) => {
            return roles.some((role) => state.roles.includes(role));
        },

        hasAnyPermission: (state) => (permissions) => {
            return permissions.some((permission) => state.permissions.includes(permission));
        }
    },

    actions: {
        async login(email, password) {
            this.loading = true;
            this.error = null;

            try {
                const result = await authService.login(email, password);

                if (result.success) {
                    this.user = result.user;
                    this.roles = result.roles || [];
                    this.permissions = result.permissions || [];
                    this.isAuthenticated = true;
                    return { success: true, message: result.message };
                } else {
                    this.error = result.message;
                    return { success: false, message: result.message };
                }
            } catch (error) {
                this.error = 'Erreur de connexion';
                return { success: false, message: 'Erreur de connexion' };
            } finally {
                this.loading = false;
            }
        },

        async register(userData) {
            this.loading = true;
            this.error = null;

            try {
                const result = await authService.register(userData);

                if (result.success) {
                    this.user = result.user;
                    this.isAuthenticated = true;
                    return { success: true, message: result.message };
                } else {
                    this.error = result.message;
                    return { success: false, message: result.message };
                }
            } catch (error) {
                this.error = "Erreur lors de l'inscription";
                return { success: false, message: "Erreur lors de l'inscription" };
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            if (this.isLoggingOut) {
                return;
            }

            this.isLoggingOut = true;
            this.loading = true;

            try {
                await authService.logout();
            } catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
            } finally {
                this.clearAuthState();
                this.isLoggingOut = false;
            }
        },

        clearAuthState() {
            this.user = null;
            this.roles = [];
            this.permissions = [];
            this.isAuthenticated = false;
            this.error = null;
            this.loading = false;
        },

        forceLogout() {
            if (this.isLoggingOut) return;

            this.isLoggingOut = true;
            console.log('Déconnexion forcée - Token expiré');

            this.clearAuthState();
            authService.clearLocalStorage();

            router.replace('/auth/login');

            this.isLoggingOut = false;
        },

        async updateProfile(userData) {
            this.loading = true;
            this.error = null;

            try {
                const result = await authService.updateProfile(userData);

                if (result.success) {
                    this.user = result.user;
                    return { success: true, message: result.message };
                } else {
                    this.error = result.message;
                    return { success: false, message: result.message };
                }
            } catch (error) {
                this.error = 'Erreur lors de la mise à jour';
                return { success: false, message: 'Erreur lors de la mise à jour' };
            } finally {
                this.loading = false;
            }
        },

        async getProfile() {
            try {
                const user = await authService.getProfile();
                this.user = user;
                return user;
            } catch (error) {
                console.error('Erreur lors de la récupération du profil:', error);

                if (error.response?.status !== 401) {
                    throw error;
                }

                return null;
            }
        },

        initializeAuth() {
            try {
                if (authService.isAuthenticated()) {
                    const user = authService.getUser();
                    const roles = authService.getRoles();
                    const permissions = authService.getPermissions();

                    if (user && user.id) {
                        this.user = user;
                        this.roles = roles;
                        this.permissions = permissions;
                        this.isAuthenticated = true;
                    } else {
                        this.clearAuthState();
                        authService.clearLocalStorage();
                    }
                } else {
                    this.clearAuthState();
                    authService.clearLocalStorage();
                }
            } catch (error) {
                console.error("Erreur lors de l'initialisation auth:", error);
                this.clearAuthState();
                authService.clearLocalStorage();
            }
        },

        clearError() {
            this.error = null;
        }
    }
});
