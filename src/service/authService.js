import axios from 'axios';

class AuthService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_URL;
        this.redirecting = false;
        this.setupAxiosInterceptors();
    }

    setupAxiosInterceptors() {
        axios.defaults.withCredentials = true;

        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401 && !this.redirecting) {
                    this.redirecting = true;
                    console.log('Token expiré - Déconnexion');

                    const authStore = useAuthStore();
                    authStore.forceLogout();
                }
                return Promise.reject(error);
            }
        );
    }

    clearLocalStorage() {
        localStorage.removeItem('user');
        localStorage.removeItem('roles');
        localStorage.removeItem('permissions');
        localStorage.removeItem('isAuthenticated');
    }

    async login(email, password) {
        try {
            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email,
                password
            });

            if (response.data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.data.profile));
                localStorage.setItem('roles', JSON.stringify(response.data.roles));
                localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
                localStorage.setItem('isAuthenticated', 'true');

                return {
                    success: true,
                    user: response.data.profile,
                    roles: response.data.roles,
                    permissions: response.data.permissions,
                    message: response.data.message
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur de connexion'
            };
        }
    }

    async getProfile() {
        try {
            const response = await axios.get(`${this.baseURL}/auth/profile/get`);

            if (response.data.status === 'success') {
                const userData = response.data.data;

                const roles = userData.roles ? userData.roles.map((role) => role.code) : [];

                const permissions = userData.permissions ? userData.permissions.map((perm) => perm.code) : [];

                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('roles', JSON.stringify(roles));
                localStorage.setItem('permissions', JSON.stringify(permissions));
                localStorage.setItem('isAuthenticated', 'true');

                return userData;
            } else {
                throw new Error(response.data.message || 'Erreur lors de la récupération du profil');
            }
        } catch (error) {
            console.error('Erreur getProfile:', error);

            if (error.response?.status === 401) {
                throw error;
            }

            throw new Error(error.response?.data?.message || 'Erreur lors de la récupération du profil');
        }
    }

    async logout() {
        try {
            this.clearLocalStorage();
            await axios.post(`${this.baseURL}/auth/users/logout`);
        } catch (error) {
            console.warn('Erreur logout serveur:', error);
        }
    }

    isAuthenticated() {
        return localStorage.getItem('isAuthenticated') === 'true' && this.getUser() !== null;
    }

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    getRoles() {
        const roles = localStorage.getItem('roles');
        return roles ? JSON.parse(roles) : [];
    }

    getPermissions() {
        const permissions = localStorage.getItem('permissions');
        return permissions ? JSON.parse(permissions) : [];
    }

    hasRole(role) {
        return this.getRoles().includes(role);
    }

    hasPermission(permission) {
        return this.getPermissions().includes(permission);
    }

    hasAnyRole(roles) {
        const userRoles = this.getRoles();
        return roles.some((role) => userRoles.includes(role));
    }

    hasAnyPermission(permissions) {
        const userPermissions = this.getPermissions();
        return permissions.some((permission) => userPermissions.includes(permission));
    }
}

export default new AuthService();
