import axios from 'axios';
import { createPinia } from 'pinia';
import { createApp, onMounted } from 'vue';
import App from './App.vue';
import router from './router';

import { roleDirective } from '@/directives/roleDirective';
import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import '@/assets/styles.scss';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_APP_URL;

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.app-dark'
        }
    }
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('role', roleDirective);

import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
onMounted(() => {
    authStore.initializeAuth();
});

app.mount('#app');
