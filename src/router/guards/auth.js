import { useAuthStore } from '@/stores/auth';
import authService from '@/service/authService';

export const requireAuth = (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isLoggedIn) {
    console.log('Utilisateur non authentifié, redirection vers login');
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  if (!authService.isAuthenticated()) {
    console.log('Token invalide ou expiré, nettoyage et redirection');
    authStore.forceLogout();
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  next();
};

export const requireGuest = (to, from, next) => {
  const authStore = useAuthStore();

  if (authStore.isLoggedIn) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
};

export const requireRole = (roles) => (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
  } else if (!authStore.hasAnyRole(roles)) {
    next({ name: 'unauthorized' });
  } else {
    next();
  }
};

export const requirePermission = (permissions) => (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
  } else if (!authStore.hasAnyPermission(permissions)) {
    next({ name: 'unauthorized' });
  } else {
    next();
  }
};