<script setup>
import apiClient from '@/service/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();
const fileInput = ref(null);

const user = ref({
    name: '',
    email: ''
});

const userId = ref(null);
const passwords = ref({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
});

const changePassword = ref(false);
const errors = ref({});
const passwordStrength = ref(0);
const loading = ref(false);
const uploadingPhoto = ref(false);
const API_BASE_URL = 'http://127.0.0.1:8000';

onMounted(async () => {
    if (!authStore.user) {
        try {
            await authStore.fetchUser();
        } catch (error) {
            console.error('Erreur lors du chargement des données utilisateur:', error);
            showErrorToast('Erreur lors du chargement des données utilisateur');
        }
    }
    if (authStore.user) {
        user.value = {
            name: authStore.user.name || '',
            email: authStore.user.email || ''
        };
        userId.value = authStore.user.id;
    }
});

const strengthColor = computed(() => {
    if (passwordStrength.value < 50) return '#ef4444';
    if (passwordStrength.value < 75) return '#f59e0b';
    return '#10b981';
});

const strengthText = computed(() => {
    if (passwordStrength.value < 50) return 'Faible';
    if (passwordStrength.value < 75) return 'Moyen';
    return 'Fort';
});

const getInitials = computed(() => {
    if (!user.value.name) return 'U';
    const names = user.value.name.trim().split(' ');
    if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return user.value.name.charAt(0).toUpperCase();
});

const getProfilePhotoUrl = computed(() => {
    if (authStore.user && authStore.user.profile_photo && authStore.user.profile_photo.file) {
        return `${API_BASE_URL}/storage/${authStore.user.profile_photo.file}`;
    }
    return null;
});

const handleImageError = (event) => {
    console.warn("Erreur lors du chargement de l'image:", event);
};

const triggerFileUpload = () => {
    if (!uploadingPhoto.value && fileInput.value) {
        fileInput.value.click();
    }
};

const handleFileSelect = async (event) => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const maxSize = 4 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
        showErrorToast('La taille du fichier ne doit pas dépasser 4MB');
        event.target.value = '';
        return;
    }

    if (!allowedTypes.includes(file.type)) {
        showErrorToast('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP');
        event.target.value = '';
        return;
    }

    await uploadProfilePhoto(file);
    event.target.value = '';
};

const uploadProfilePhoto = async (file) => {
    if (!userId.value) {
        showErrorToast('Impossible de mettre à jour la photo: ID utilisateur manquant');
        return;
    }

    uploadingPhoto.value = true;

    try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await apiClient.post(`auth/users/update-profile-photo/${userId.value}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        await authStore.fetchUser();

        showSuccessToast('Photo de profil mise à jour avec succès!');
    } catch (error) {
        console.error('Erreur lors du téléchargement de la photo:', error);
        showErrorToast('Erreur de validation du fichier');
    } finally {
        uploadingPhoto.value = false;
    }
};

const calculateStrength = () => {
    let strength = 0;
    const password = passwords.value.new_password;

    if (!password) {
        passwordStrength.value = 0;
        return;
    }

    if (password.length >= 8) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;

    passwordStrength.value = strength;
};

const showSuccessToast = (message) => {
    toast.add({
        severity: 'success',
        summary: 'Succès',
        detail: message,
        life: 5000
    });
};

const showErrorToast = (message) => {
    toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: message,
        life: 5000
    });
};

const updateProfile = async () => {
    errors.value = {};

    if (!userId.value) {
        showErrorToast('Impossible de mettre à jour le profil: ID utilisateur manquant');
        return;
    }

    if (!user.value.name?.trim()) {
        errors.value.name = 'Le nom est requis';
    }

    if (!user.value.email?.trim()) {
        errors.value.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email.trim())) {
        errors.value.email = 'Format email invalide';
    }

    if (changePassword.value) {
        if (!passwords.value.current_password) {
            errors.value.current_password = 'Mot de passe actuel requis';
        }

        if (!passwords.value.new_password) {
            errors.value.new_password = 'Nouveau mot de passe requis';
        } else if (passwords.value.new_password.length < 8) {
            errors.value.new_password = '8 caractères minimum requis';
        }

        if (!passwords.value.confirm_new_password) {
            errors.value.confirm_new_password = 'Confirmation requise';
        } else if (passwords.value.new_password !== passwords.value.confirm_new_password) {
            errors.value.confirm_new_password = 'Les mots de passe ne correspondent pas';
        }
    }

    if (Object.keys(errors.value).length > 0) {
        showErrorToast('Veuillez corriger les erreurs dans le formulaire');
        return;
    }

    loading.value = true;

    try {
        const formData = {
            name: user.value.name.trim(),
            email: user.value.email.trim()
        };

        if (changePassword.value) {
            formData.current_password = passwords.value.current_password;
            formData.new_password = passwords.value.new_password;
            formData.confirm_new_password = passwords.value.confirm_new_password;
        }

        const response = await apiClient.post(`auth/users/update-profile/${userId.value}`, formData);

        await authStore.fetchUser();

        if (authStore.user) {
            user.value = {
                name: authStore.user.name || '',
                email: authStore.user.email || ''
            };
            userId.value = authStore.user.id;
        }

        showSuccessToast('Profil mis à jour avec succès!');

        if (changePassword.value) {
            passwords.value = {
                current_password: '',
                new_password: '',
                confirm_new_password: ''
            };
            changePassword.value = false;
            passwordStrength.value = 0;
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);

        if (error.response?.status === 400 && error.response?.data?.errors) {
            errors.value = error.response.data.errors;
        } else if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors;
        } else if (error.response?.data?.message) {
            showErrorToast(error.response.data.message);
        } else {
            showErrorToast('Une erreur est survenue lors de la mise à jour du profil');
        }
    } finally {
        loading.value = false;
    }
};

const resetForm = async () => {
    try {
        if (authStore.user) {
            user.value = {
                name: authStore.user.name || '',
                email: authStore.user.email || ''
            };
            userId.value = authStore.user.id;
        }

        passwords.value = {
            current_password: '',
            new_password: '',
            confirm_new_password: ''
        };

        changePassword.value = false;
        errors.value = {};
        passwordStrength.value = 0;

        toast.add({
            severity: 'info',
            summary: 'Information',
            detail: 'Formulaire réinitialisé',
            life: 3000
        });
    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        showErrorToast('Erreur lors de la réinitialisation du formulaire');
    }
};

function goBack() {
    router.back();
}
</script>

<template>
    <div class="profile-container">
        <Toast position="top-right" />

        <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" class="hidden-upload" />
        <div class="flex gap-3">
            <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" @click="goBack" />
        </div>
        <div class="profile-header">
            <div class="header-content">
                <div class="avatar-section">
                    <div class="avatar-container" @click="triggerFileUpload">
                        <div class="avatar-wrapper">
                            <img v-if="getProfilePhotoUrl" :src="getProfilePhotoUrl" :alt="`Photo de ${user.name || 'profil'}`" class="profile-photo" @error="handleImageError" />
                            <div v-else class="avatar-placeholder">
                                {{ getInitials }}
                            </div>

                            <div class="upload-overlay" :class="{ disabled: uploadingPhoto }">
                                <i v-if="!uploadingPhoto" class="pi pi-camera"></i>
                                <ProgressSpinner v-else size="small" />
                                <span class="upload-text">
                                    {{ uploadingPhoto ? 'Upload...' : 'Changer' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="upload-status" v-if="uploadingPhoto">
                        <span>Upload en cours...</span>
                    </div>
                </div>

                <div class="profile-info">
                    <h1 class="profile-title">{{ user.name || 'Votre profil' }}</h1>
                    <p class="profile-subtitle">{{ user.email }}</p>
                    <div class="profile-badge">
                        <i class="pi pi-user"></i>
                        <span>Membre actif</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="profile-content">
            <form @submit.prevent="updateProfile" class="profile-form">
                <div class="form-card">
                    <div class="card-header">
                        <div class="header-icon">
                            <i class="pi pi-user"></i>
                        </div>
                        <div>
                            <h2 class="card-title">Informations personnelles</h2>
                            <p class="card-subtitle">Gérez vos données de profil</p>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="name" class="form-label">
                                    <i class="pi pi-user"></i>
                                    Nom *
                                </label>
                                <InputText id="name" v-model="user.name" type="text" :class="{ 'p-invalid': errors.name }" class="form-input" placeholder="Entrez votre nom complet" maxlength="255" />
                                <small v-if="errors.name" class="error-message">{{ errors.name }}</small>
                            </div>

                            <div class="form-group">
                                <label for="email" class="form-label">
                                    <i class="pi pi-envelope"></i>
                                    Adresse email *
                                </label>
                                <InputText id="email" v-model="user.email" type="email" :class="{ 'p-invalid': errors.email }" class="form-input" placeholder="votre@email.com" maxlength="255" />
                                <small v-if="errors.email" class="error-message">{{ errors.email }}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-card">
                    <div class="card-header">
                        <div class="header-icon security">
                            <i class="pi pi-shield"></i>
                        </div>
                        <div>
                            <h2 class="card-title">Sécurité</h2>
                            <p class="card-subtitle">Gérez votre mot de passe</p>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="security-toggle">
                            <Checkbox v-model="changePassword" inputId="changePassword" :binary="true" class="security-checkbox" />
                            <label for="changePassword" class="toggle-label">
                                <span class="toggle-title">Modifier le mot de passe</span>
                                <span class="toggle-subtitle">Changez votre mot de passe actuel</span>
                            </label>
                        </div>

                        <Transition name="password-section">
                            <div v-if="changePassword" class="password-section">
                                <div class="password-grid">
                                    <div class="form-group full-width">
                                        <label for="current_password" class="form-label">
                                            <i class="pi pi-lock"></i>
                                            Mot de passe actuel *
                                        </label>
                                        <Password
                                            id="current_password"
                                            v-model="passwords.current_password"
                                            :feedback="false"
                                            toggleMask
                                            :class="{ 'p-invalid': errors.current_password }"
                                            class="form-input"
                                            placeholder="Entrez votre mot de passe actuel"
                                        />
                                        <small v-if="errors.current_password" class="error-message">{{ errors.current_password }}</small>
                                    </div>

                                    <div class="form-group">
                                        <label for="new_password" class="form-label">
                                            <i class="pi pi-key"></i>
                                            Nouveau mot de passe *
                                        </label>
                                        <Password
                                            id="new_password"
                                            v-model="passwords.new_password"
                                            :feedback="false"
                                            toggleMask
                                            :class="{ 'p-invalid': errors.new_password }"
                                            class="form-input"
                                            placeholder="Nouveau mot de passe (min. 8 caractères)"
                                            @input="calculateStrength"
                                        />

                                        <div v-if="passwords.new_password" class="password-strength">
                                            <div class="strength-bar">
                                                <div class="strength-fill" :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }"></div>
                                            </div>
                                            <div class="strength-info">
                                                <span class="strength-label">Force: {{ strengthText }}</span>
                                                <span class="strength-percentage">{{ passwordStrength }}%</span>
                                            </div>
                                        </div>

                                        <small v-if="errors.new_password" class="error-message">{{ errors.new_password }}</small>
                                    </div>

                                    <div class="form-group">
                                        <label for="confirm_new_password" class="form-label">
                                            <i class="pi pi-check"></i>
                                            Confirmer le mot de passe *
                                        </label>
                                        <Password
                                            id="confirm_new_password"
                                            v-model="passwords.confirm_new_password"
                                            :feedback="false"
                                            toggleMask
                                            :class="{ 'p-invalid': errors.confirm_new_password }"
                                            class="form-input"
                                            placeholder="Confirmez le nouveau mot de passe"
                                        />
                                        <small v-if="errors.confirm_new_password" class="error-message">{{ errors.confirm_new_password }}</small>
                                    </div>
                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>

                <div class="form-actions">
                    <Button label="Annuler" severity="secondary" @click="resetForm" type="button" class="action-button secondary" :disabled="loading || uploadingPhoto" icon="pi pi-times" />
                    <Button label="Enregistrer les modifications" severity="primary" type="submit" :loading="loading" :disabled="uploadingPhoto" class="action-button primary" icon="pi pi-check" />
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.profile-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
}

.hidden-upload {
    display: none;
}

.profile-header {
    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
    border-radius: 20px;
    padding: 2.5rem;
    margin-bottom: 2rem;
    position: relative;
    overflow: hidden;
}

.profile-header::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(50%, -50%);
}

.header-content {
    display: flex;
    align-items: center;
    gap: 2rem;
    position: relative;
    z-index: 1;
}

.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.avatar-container {
    cursor: pointer;
    transition: transform 0.3s ease;
}

.avatar-container:hover {
    transform: scale(1.05);
}

.avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
}

.profile-photo {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;
}

.avatar-placeholder {
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: bold;
    color: white;
    border: 4px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
}

.upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    color: white;
    gap: 0.5rem;
}

.upload-overlay.disabled {
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.5);
}

.avatar-container:hover .upload-overlay:not(.disabled) {
    opacity: 1;
}

.upload-overlay.disabled {
    opacity: 0.8;
}

.upload-overlay i {
    font-size: 1.5rem;
}

.upload-text {
    font-size: 0.8rem;
    font-weight: 500;
}

.upload-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    font-size: 0.9rem;
}

.profile-info {
    flex: 1;
    color: white;
}

.profile-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 0 0 1rem 0;
}

.profile-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 25px;
    font-size: 0.9rem;
    backdrop-filter: blur(10px);
}

.form-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
}

.header-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #0ea5e9, #0369a1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
}

.header-icon.security {
    background: linear-gradient(135deg, #10b981, #059669);
}

.card-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: #1e293b;
}

.card-subtitle {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0.25rem 0 0 0;
}

.card-content {
    padding: 1.5rem;
}

.form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
}

.form-label i {
    color: #0ea5e9;
    font-size: 0.9rem;
}

.form-input {
    width: 100%;
}

.error-message {
    color: #ef4444;
    font-size: 0.8rem;
    margin-top: 0.25rem;
}

.security-toggle {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 1rem;
}

.security-checkbox {
    margin-top: 0.25rem;
}

.toggle-label {
    flex: 1;
    cursor: pointer;
}

.toggle-title {
    display: block;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.25rem;
}

.toggle-subtitle {
    display: block;
    font-size: 0.85rem;
    color: #64748b;
}

.password-section {
    background: linear-gradient(135deg, #e0f2fe 0%, #e6fffa 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #0ea5e9;
}

.password-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.password-strength {
    margin-top: 0.75rem;
}

.strength-bar {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.strength-fill {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 3px;
}

.strength-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
}

.strength-label {
    color: #64748b;
    font-weight: 500;
}

.strength-percentage {
    color: #0ea5e9;
    font-weight: 600;
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding: 1.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    margin-top: 1rem;
    border-radius: 0 0 16px 16px;
}

.action-button {
    min-width: 140px;
}

.action-button.primary {
    background: linear-gradient(135deg, #0ea5e9, #0369a1);
    border: none;
}

.action-button.secondary {
    background: white;
    color: #64748b;
    border: 1px solid #d1d5db;
}

.password-section-enter-active,
.password-section-leave-active {
    transition: all 0.3s ease;
}

.password-section-enter-from,
.password-section-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 768px) {
    .profile-container {
        padding: 0.5rem;
    }

    .profile-header {
        padding: 1.5rem;
        border-radius: 16px;
    }

    .header-content {
        flex-direction: column;
        text-align: center;
        gap: 1.5rem;
    }

    .avatar-wrapper,
    .profile-photo,
    .avatar-placeholder {
        width: 100px;
        height: 100px;
    }

    .avatar-placeholder {
        font-size: 2.5rem;
    }

    .profile-title {
        font-size: 2rem;
    }

    .form-row,
    .password-grid {
        grid-template-columns: 1fr;
    }

    .form-actions {
        flex-direction: column;
    }

    .action-button {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .card-header {
        padding: 1rem;
    }

    .card-content {
        padding: 1rem;
    }

    .profile-header {
        padding: 1rem;
    }

    .profile-title {
        font-size: 1.75rem;
    }

    .avatar-wrapper,
    .profile-photo,
    .avatar-placeholder {
        width: 80px;
        height: 80px;
    }

    .avatar-placeholder {
        font-size: 2rem;
    }

    .form-actions {
        padding: 1rem;
    }
}

.avatar-container:hover:not(:has(.disabled)) {
    cursor: pointer;
}

.avatar-container:has(.disabled) {
    cursor: not-allowed;
}

.form-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    border-color: #0ea5e9;
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.upload-overlay:has(.p-progress-spinner) {
    opacity: 0.9;
}

@keyframes uploadPulse {
    0%,
    100% {
        opacity: 0.7;
    }
    50% {
        opacity: 1;
    }
}

.upload-overlay.disabled {
    animation: uploadPulse 2s infinite;
}
</style>
