<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const roles = computed(() => authStore.roles);
const permissions = computed(() => authStore.permissions);

const API_BASE_URL = 'http://127.0.0.1:8000';

const username = computed(() => {
    if (user.value) {
        return user.value.name || 'Utilisateur';
    }
    return 'Profile';
});

const getProfilePhotoUrl = computed(() => {
    if (user.value && user.value.profile_photo && user.value.profile_photo.file) {
        return `${API_BASE_URL}/storage/${user.value.profile_photo.file}`;
    }
    return null;
});

const handleImageError = (event) => {
    event.target.style.display = 'none';
    const iconElement = event.target.nextElementSibling;
    if (iconElement) {
        iconElement.style.display = 'inline';
    }
};

const handleLogout = async () => {
    await authStore.logout();
    router.push('/auth/login');
};

const goToProfile = () => {
    router.push('/profile');
};

const goToAdmin = () => {
    router.push('/dashboard');
};

const canAccessAdmin = computed(() => {
    return roles.value?.includes('admin') || permissions.value?.includes('admin.*');
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
                        <div class="profile-photo-container">
                            <img v-if="getProfilePhotoUrl" :src="getProfilePhotoUrl" :alt="`Photo de ${username}`" class="profile-photo" @error="handleImageError" />
                            <i class="pi pi-user profile-icon" :style="{ display: getProfilePhotoUrl ? 'none' : 'inline' }"></i>
                        </div>
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

<style scoped>
.profile-photo-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 5px;
}

.profile-photo {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.profile-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.layout-topbar[data-theme='dark'] .profile-photo {
    border-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
    .profile-photo-container {
        width: 20px;
        height: 20px;
    }

    .profile-photo {
        width: 20px;
        height: 20px;
    }

    .profile-icon {
        width: 20px;
        height: 20px;
        font-size: 14px;
    }
}
</style>
