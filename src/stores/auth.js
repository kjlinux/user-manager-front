import authService from '@/service/authService';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        loading: false,
        error: null
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

        async fetchUser() {
            return await this.getProfile();
        },

        async logout() {
            this.loading = true;

            try {
                await authService.logout();
            } catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
            } finally {
                this.clearAuthState();
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
            console.log('Déconnexion forcée - Token expiré');
            authService.clearLocalStorage();
            this.clearAuthState();
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
                
                if (error.response?.status === 401) {
                    this.forceLogout();
                    return null;
                }
                
                throw error;
            }
        },

        initializeAuth() {
            if (authService.isAuthenticated()) {
                this.user = authService.getUser();
                this.roles = authService.getRoles();
                this.permissions = authService.getPermissions();
                this.isAuthenticated = true;
            } else {
                this.clearAuthState();
                authService.clearLocalStorage();
            }
        },

        clearError() {
            this.error = null;
        }
    }
});