import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { requireAuth, requireGuest } from './guards/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                    beforeEnter: requireAuth,
                    meta: {
                        title: 'Tableau de bord',
                        requiresAuth: true
                    }
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('@/views/pages/Profile.vue'),
                    beforeEnter: requireAuth,
                    meta: {
                        title: 'Profil',
                        requiresAuth: true
                    }
                },
                {
                    path: '/log',
                    name: 'log',
                    component: () => import('@/views/pages/Log.vue'),
                    beforeEnter: requireAuth,
                    meta: {
                        title: 'Log',
                        requiresAuth: true
                    }
                }
            ]
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue'),
            beforeEnter: requireGuest,
            meta: {
                title: 'Connexion',
                requiresGuest: true
            }
        }
    ]
});

export default router;
