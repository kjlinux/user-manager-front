import axios from 'axios';

class AuthService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_URL;
        this.isLoggingOut = false;
        this.setupAxiosInterceptors();
    }

    setupAxiosInterceptors() {
        axios.defaults.withCredentials = true;

        axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    if (this.isLoggingOut) {
                        return Promise.reject(error);
                    }

                    console.log('Token expiré ou invalide, déconnexion...');

                    this.isLoggingOut = true;

                    try {
                        await this.logout();

                        if (window.location.pathname !== '/auth/login' && !window.location.pathname.includes('/auth/')) {
                            window.location.href = '/auth/login';
                        }
                    } catch (logoutError) {
                        console.error('Erreur lors de la déconnexion:', logoutError);
                    } finally {
                        this.isLoggingOut = false;
                    }
                }
                return Promise.reject(error);
            }
        );
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

    async register(userData) {
        try {
            const response = await axios.post(`${this.baseURL}/auth/users/register`, userData);

            if (response.data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.data.data));
                localStorage.setItem('isAuthenticated', 'true');

                return {
                    success: true,
                    user: response.data.data,
                    message: response.data.message
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Erreur lors de l'inscription"
            };
        }
    }

    async logout() {
        try {
            if (!this.isLoggingOut) {
                await axios.post(`${this.baseURL}/auth/users/logout`);
            }
        } catch (error) {
            console.warn('Erreur lors de la déconnexion serveur (ignorée):', error.message);
        } finally {
            this.clearLocalStorage();
        }
    }

    clearLocalStorage() {
        localStorage.removeItem('user');
        localStorage.removeItem('roles');
        localStorage.removeItem('permissions');
        localStorage.removeItem('isAuthenticated');
    }

    async getProfile() {
        try {
            const response = await axios.get(`${this.baseURL}/auth/users/profile/get`);
            if (response.data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.data.data));
                return response.data.data;
            }
        } catch (error) {
            throw error;
        }
    }

    async updateProfile(userData) {
        try {
            const user = this.getUser();
            const response = await axios.post(`${this.baseURL}/auth/users/update-profile/${user.id}`, userData);

            if (response.data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(response.data.data));
                return {
                    success: true,
                    user: response.data.data,
                    message: response.data.message
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Erreur lors de la mise à jour'
            };
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
