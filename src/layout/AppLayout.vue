<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppFooter from './AppFooter.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, isSidebarActive } = useLayout();
const authStore = useAuthStore();
const router = useRouter();

const outsideClickListener = ref(null);

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive
    };
});

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener.value);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const sidebarEl = document.querySelector('.layout-sidebar');
    const topbarEl = document.querySelector('.layout-menu-button');

    if (!sidebarEl || !topbarEl) {
        return false;
    }

    return !(sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target) || topbarEl.isSameNode(event.target) || topbarEl.contains(event.target));
}

onMounted(() => {
    if (!authStore.isAuthenticated) {
        authStore.initializeAuth();
    }
});

onBeforeUnmount(() => {
    unbindOutsideClickListener();
});
</script>

<template>
    <div v-if="authStore.isAuthenticated" class="layout-wrapper" :class="containerClass">
        <app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view></router-view>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask animate-fadein"></div>
    </div>

    <div v-else-if="authStore.loading" class="loading-container">
        <div class="loading-spinner">Chargement...</div>
    </div>

    <div v-else class="auth-required">
        <p>Redirection vers la page de connexion...</p>
    </div>

    <Toast />
</template>

<style scoped>
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.loading-spinner {
    padding: 2rem;
    font-size: 1.2rem;
}

.auth-required {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    flex-direction: column;
}
</style>
