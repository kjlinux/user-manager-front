import { useAuthStore } from '@/stores/auth';

export const requireAuth = (to, from, next) => {
  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
  } else {
    next();
  }
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