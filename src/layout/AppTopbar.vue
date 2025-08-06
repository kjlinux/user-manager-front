<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const roles = computed(() => authStore.roles);
const permissions = computed(() => authStore.permissions);

const username = computed(() => {
    if (user.value) {
        return user.value.name || 'Utilisateur';
    }
    return 'Profile';
});

const handleLogout = async () => {
    await authStore.logout();
    router.push('/auth/login');
};

const goToProfile = () => {
    router.push('/profile');
};

const goToAdmin = () => {
    router.push('/admin');
};

const canAccessAdmin = computed(() => {
    return roles.value?.includes('admin') || permissions.value?.includes('admin.*');
});

onMounted(() => {
    authStore.refreshProfile();
});
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo"> </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu hidden">
                <button type="button" class="layout-topbar-action hidden" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }, 'hidden']"></i>
                </button>
                <div class="relative hidden">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight hidden"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action" @click="goToProfile">
                        <i class="pi pi-user"></i>
                        <span>{{ username }}</span>
                    </button>

                    <button v-if="canAccessAdmin" type="button" class="layout-topbar-action" @click="goToAdmin">
                        <i class="pi pi-cog"></i>
                        <span>Administration</span>
                    </button>

                    <button type="button" class="layout-topbar-action" @click="handleLogout">
                        <i class="pi pi-power-off"></i>
                        <span>Déconnexion</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
