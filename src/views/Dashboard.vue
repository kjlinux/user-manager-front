<script setup>
import apiClient from '@/service/apiClient';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const FilterMatchMode = {
    STARTS_WITH: 'startsWith',
    CONTAINS: 'contains',
    ENDS_WITH: 'endsWith',
    EQUALS: 'equals',
    NOT_EQUALS: 'notEquals',
    IN: 'in',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL_TO: 'lte',
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL_TO: 'gte',
    BETWEEN: 'between',
    DATE_IS: 'dateIs',
    DATE_IS_NOT: 'dateIsNot',
    DATE_BEFORE: 'dateBefore',
    DATE_AFTER: 'dateAfter'
};

const FilterOperator = {
    AND: 'and',
    OR: 'or'
};

const router = useRouter();
const toast = useToast();
const dt = ref();

const roles = ref([]);
const loadingRoles = ref(false);

const users = ref([]);
const expandedRows = ref({});
const loading = ref(true);
const blockedUsers = ref([]);
const userDialog = ref(false);
const blockUserDialog = ref(false);
const blockUsersDialog = ref(false);
const showBlockedUsersDialog = ref(false);
const updateRoleDialog = ref(false);
const toggleStatusDialog = ref(false);
const user = ref({});
const selectedUsers = ref();
const filters = ref({});
const submitted = ref(false);
const filteredRoles = ref([]);
const savingUser = ref(false);

const statusOptions = reactive(['Actif', 'Inactif']);
const roleOptions = computed(() => roles.value.map((role) => ({ label: role.name, value: role.id })));

const API_BASE_URL = 'http://127.0.0.1:8000';

const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        'roles.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        created_at: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] }
    };
};

initFilters();

const clearFilter = () => {
    initFilters();
};

const expandAll = () => {
    const expandedRowsMap = {};
    users.value.forEach((user) => {
        expandedRowsMap[user.id] = true;
    });
    expandedRows.value = expandedRowsMap;
};

const collapseAll = () => {
    expandedRows.value = {};
};

const totalUsers = computed(() => users.value.length);
const totalActive = computed(() => users.value.filter((user) => user.status === true || user.status === 'active').length);
const totalInactive = computed(() => users.value.filter((user) => user.status === false || user.status === 'inactive').length);
const totalDeleted = computed(() => blockedUsers.value.length);

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
};

onMounted(async () => {
    await fetchRoles();
    await loadUsers();
    await loadBlockedUsers();
});

const refreshData = async () => {
    try {
        loading.value = true;
        await Promise.all([loadUsers(), loadBlockedUsers()]);
    } catch (error) {
        console.error('Erreur lors du rafraîchissement des données:', error);
    } finally {
        loading.value = false;
    }
};

const loadUsers = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/auth/users');
        users.value = response.data.data || [];
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les utilisateurs',
            life: 3000
        });
        console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
        loading.value = false;
    }
};

const loadBlockedUsers = async () => {
    try {
        const response = await apiClient.get('/auth/users/trash');
        blockedUsers.value = response.data.data || [];
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs supprimés:', error);
    }
};

const fetchRoles = async () => {
    loadingRoles.value = true;
    try {
        const response = await apiClient.get('/auth/users/roles/get');
        roles.value = response.data.data || [];
        filteredRoles.value = [...roles.value];
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les rôles',
            life: 3000
        });
        console.error('Erreur lors du chargement des rôles:', error);
    } finally {
        loadingRoles.value = false;
    }
};

function openNew() {
    user.value = {
        name: '',
        email: '',
        password: '',
        role_id: null,
        selectedRole: null
    };
    submitted.value = false;
    userDialog.value = true;
}

function hideDialog() {
    userDialog.value = false;
    submitted.value = false;
}

async function saveUser() {
    submitted.value = true;
    savingUser.value = true;

    if (user.value.selectedRole && user.value.selectedRole.id) {
        user.value.role_id = user.value.selectedRole.id;
    }

    if (user.value.name?.trim() && user.value.email?.trim() && user.value.role_id) {
        try {
            if (user.value.id) {
                await apiClient.put(`/auth/users/${user.value.id}`, user.value);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur mis à jour', life: 3000 });
            } else {
                const userData = {
                    name: user.value.name,
                    email: user.value.email,
                    role_id: user.value.role_id,
                    password: user.value.password || undefined
                };

                await apiClient.post('/auth/users', userData);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur créé', life: 3000 });
            }

            userDialog.value = false;
            user.value = {};
            submitted.value = false;

            await loadUsers();
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement",
                life: 3000
            });
            console.error("Erreur lors de l'enregistrement de l'utilisateur:", error);
        }
    }

    savingUser.value = false;
}

function editUser(userData) {
    user.value = JSON.parse(JSON.stringify(userData));

    const currentRole = getUserRole(userData);
    if (currentRole) {
        user.value.selectedRole = currentRole;
        user.value.role_id = currentRole.id;
    }

    userDialog.value = true;
}

function confirmBlockUser(userData) {
    user.value = userData;
    blockUserDialog.value = true;
}

async function blockUser() {
    try {
        await apiClient.delete(`/auth/users/${user.value.id}`);
        blockUserDialog.value = false;
        user.value = {};
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur supprimé', life: 3000 });

        await refreshData();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || "Une erreur est survenue lors de la suppression de l'utilisateur",
            life: 3000
        });
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
    }
}

async function restoreUser(userId) {
    try {
        await apiClient.post(`/auth/users/restore/${userId}`);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur restauré', life: 3000 });

        await refreshData();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || "Une erreur est survenue lors de la restauration de l'utilisateur",
            life: 3000
        });
        console.error("Erreur lors de la restauration de l'utilisateur:", error);
    }
}

function confirmToggleStatus(userData) {
    user.value = userData;
    toggleStatusDialog.value = true;
}

async function toggleUserStatus() {
    try {
        const response = await apiClient.patch(`/auth/users/toggle-status/${user.value.id}`);
        toggleStatusDialog.value = false;

        await refreshData();

        const userData = response.data.data;
        const statusText = userData?.status === true ? 'activé' : 'désactivé';
        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Utilisateur ${statusText}`,
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors du changement de statut',
            life: 3000
        });
        console.error('Erreur lors du changement de statut:', error);
    }
}

function openUpdateRoleDialog(userData) {
    user.value = JSON.parse(JSON.stringify(userData));

    const currentRole = getUserRole(userData);
    if (currentRole) {
        user.value.selectedRole = currentRole;
        user.value.role_id = currentRole.id;
    }

    updateRoleDialog.value = true;
}

async function updateRole() {
    if (user.value.role_id) {
        try {
            await apiClient.post(`/auth/users/update-role/${user.value.id}`, {
                role_id: user.value.role_id
            });
            updateRoleDialog.value = false;
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Rôle mis à jour', life: 3000 });

            await refreshData();
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Erreur',
                detail: error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour du rôle',
                life: 3000
            });
            console.error('Erreur lors de la mise à jour du rôle:', error);
        }
    }
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmBlockSelected() {
    blockUsersDialog.value = true;
}

async function blockSelectedUsers() {
    try {
        for (const user of selectedUsers.value) {
            await apiClient.delete(`/auth/users/${user.id}`);
        }

        blockUsersDialog.value = false;
        selectedUsers.value = null;
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateurs supprimés', life: 3000 });

        await refreshData();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Une erreur est survenue lors de la suppression des utilisateurs sélectionnés',
            life: 3000
        });
        console.error('Erreur lors de la suppression des utilisateurs:', error);
    }
}

async function showBlockedUsers() {
    showBlockedUsersDialog.value = true;
}

function searchRolesByName(event) {
    setTimeout(() => {
        if (!event.query.trim().length) {
            filteredRoles.value = [...roles.value];
        } else {
            filteredRoles.value = roles.value.filter((role) => {
                return role.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
}

function getUserRole(user) {
    if (user && user.roles && user.roles.length > 0) {
        return user.roles[0];
    }
    return null;
}

function findRoleName(user) {
    if (user && user.roles && user.roles.length > 0) {
        return user.roles[0].name;
    }

    if (user && user.role_id && roles.value && roles.value.length > 0) {
        const role = roles.value.find((role) => role.id === user.role_id);
        return role ? role.name : 'Non défini';
    }

    return 'Non défini';
}

function getFullName(user) {
    if (user.surname) {
        return `${user.name} ${user.surname}`;
    }
    return user.name || 'Nom non défini';
}

function getStatusSeverity(status) {
    if (status === true || status === 'active' || status === 'actif') {
        return 'success';
    } else if (status === false || status === 'inactive' || status === 'inactif') {
        return 'danger';
    } else {
        return 'info';
    }
}

function getStatusLabel(status) {
    if (status === true || status === 'active' || status === 'actif') {
        return 'Actif';
    } else if (status === false || status === 'inactive' || status === 'inactif') {
        return 'Inactif';
    } else {
        return status || 'Inconnu';
    }
}

function getProfilePhotoUrl(user) {
    if (user && user.profile_photo && user.profile_photo.file) {
        return `${API_BASE_URL}/storage/${user.profile_photo.file}`;
    }
    return null;
}

function handleImageError(event) {
    event.target.style.display = 'none';
}

function getUserDetails(user) {
    router.push({ name: 'user-details', params: { id: user.id } });
}
</script>

<template>
    <div class="card p-fluid">
        <DataTable
            ref="dt"
            :value="users"
            v-model:selection="selectedUsers"
            v-model:expandedRows="expandedRows"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            dataKey="id"
            :paginator="true"
            :rows="10"
            :rowsPerPageOptions="[5, 10, 25, 50]"
            :globalFilterFields="['email', 'name', 'surname', 'roles.name']"
            tableStyle="min-width: 60rem"
        >
            <template #header>
                <div class="flex flex-wrap justify-between gap-2">
                    <h2>Gestion des Utilisateurs</h2>
                    <div class="flex gap-2">
                        <Button label="Nouveau" icon="pi pi-plus" severity="secondary" @click="openNew" />
                        <Button label="Supprimer" icon="pi pi-trash" severity="danger" @click="confirmBlockSelected" :disabled="!selectedUsers || !selectedUsers.length" />
                        <Button label="Utilisateurs supprimés" icon="pi pi-user-minus" severity="secondary" @click="showBlockedUsers" />
                        <Button label="Historique des actions" icon="pi pi-list" severity="secondary" @click="" />
                        <Button type="button" icon="pi pi-filter-slash" label="Réinitialiser filtres" outlined @click="clearFilter()" />
                        <Button text icon="pi pi-plus" label="Développer tout" @click="expandAll" />
                        <Button text icon="pi pi-minus" label="Réduire tout" @click="collapseAll" />
                        <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                    </div>
                </div>
                <div class="flex justify-between mt-4">
                    <span></span>
                    <IconField>
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Recherche globale" />
                    </IconField>
                </div>
            </template>

            <template #empty> Aucun utilisateur trouvé. </template>
            <template #loading> ... </template>

            <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
            <Column expander style="width: 3rem" />

            <Column header="Photo" style="width: 5rem" :exportable="false">
                <template #body="slotProps">
                    <div class="flex justify-center">
                        <img
                            v-if="getProfilePhotoUrl(slotProps.data)"
                            :src="getProfilePhotoUrl(slotProps.data)"
                            :alt="`Photo de ${getFullName(slotProps.data)}`"
                            class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            @error="handleImageError"
                        />
                        <div v-else class="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                            <i class="pi pi-user text-gray-500"></i>
                        </div>
                    </div>
                </template>
            </Column>

            <Column field="email" header="Email" sortable>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher par email" />
                </template>
            </Column>

            <Column field="name" header="Nom" sortable>
                <template #body="slotProps">
                    {{ getFullName(slotProps.data) }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher par nom" />
                </template>
            </Column>

            <Column field="roles.name" header="Rôle" sortable>
                <template #body="slotProps">
                    {{ findRoleName(slotProps.data) }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" placeholder="Rechercher par rôle" />
                </template>
            </Column>

            <Column field="status" header="Statut" :filterMenuStyle="{ width: '14rem' }">
                <template #body="slotProps">
                    <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" />
                </template>
                <template #filter="{ filterModel }">
                    <Select v-model="filterModel.value" :options="statusOptions" placeholder="Sélectionner" showClear>
                        <template #option="slotProps">
                            <Tag :value="slotProps.option" :severity="getStatusSeverity(slotProps.option)" />
                        </template>
                    </Select>
                </template>
            </Column>

            <Column headerStyle="min-width:15rem">
                <template #header>
                    <div class="text-center">Actions</div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-center gap-2">
                        <Button icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm hover:scale-110 transition-all duration-300" title="Modifier" @click="editUser(slotProps.data)" />
                        <Button icon="pi pi-user-edit" class="p-button-rounded p-button-secondary p-button-sm hover:scale-110 transition-all duration-300" title="Modifier le rôle" @click="openUpdateRoleDialog(slotProps.data)" />
                        <Button
                            :icon="slotProps.data.status === 'active' || slotProps.data.status === true ? 'pi pi-pause' : 'pi pi-play'"
                            :class="slotProps.data.status === 'active' || slotProps.data.status === true ? 'p-button-rounded p-button-warning p-button-sm' : 'p-button-rounded p-button-success p-button-sm'"
                            class="hover:scale-110 transition-all duration-300"
                            :title="slotProps.data.status === 'active' || slotProps.data.status === true ? 'Désactiver' : 'Activer'"
                            @click="confirmToggleStatus(slotProps.data)"
                        />
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-sm hover:scale-110 transition-all duration-300" title="Supprimer" @click="confirmBlockUser(slotProps.data)" />
                    </div>
                </template>
            </Column>

            <template #expansion="slotProps">
                <div class="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center">
                        <i class="pi pi-history text-orange-500 mr-2"></i>
                        <h5 class="m-0 font-semibold">Informations d'activité</h5>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                <i class="pi pi-calendar text-blue-500 mb-2 block text-xl"></i>
                                <div class="font-medium text-gray-700 dark:text-gray-300 text-sm">Créé le</div>
                                <div class="text-lg">{{ formatDate(slotProps.data.created_at) }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                <i class="pi pi-clock text-green-500 mb-2 block text-xl"></i>
                                <div class="font-medium text-gray-700 dark:text-gray-300 text-sm">Dernière connexion</div>
                                <div class="text-lg">{{ formatDate(slotProps.data.last_login_at) || 'Jamais' }}</div>
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                <i class="pi pi-refresh text-purple-500 mb-2 block text-xl"></i>
                                <div class="font-medium text-gray-700 dark:text-gray-300 text-sm">Modifié le</div>
                                <div class="text-lg">{{ formatDate(slotProps.data.updated_at) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </DataTable>
    </div>

    <Dialog v-model:visible="userDialog" :style="{ width: '550px' }" header="Détails de l'Utilisateur" :modal="true">
        <div class="flex flex-col gap-4">
            <div>
                <label for="name" class="block font-bold mb-2">Nom</label>
                <InputText id="name" v-model.trim="user.name" required="true" :invalid="submitted && !user.name" fluid />
                <small v-if="submitted && !user.name" class="text-red-500"> Le nom est obligatoire. </small>
            </div>

            <div>
                <label for="email" class="block font-bold mb-2">Email</label>
                <InputText id="email" v-model.trim="user.email" required="true" :invalid="submitted && !user.email" fluid />
                <small v-if="submitted && !user.email" class="text-red-500"> L'email est obligatoire. </small>
            </div>

            <div>
                <label for="userRole" class="block font-bold mb-2">Rôle</label>
                <AutoComplete
                    id="userRole"
                    v-model="user.selectedRole"
                    :suggestions="filteredRoles"
                    optionLabel="name"
                    dropdown
                    @complete="searchRolesByName"
                    placeholder="Rechercher un rôle"
                    @item-select="(e) => (user.role_id = e.value.id)"
                    :invalid="submitted && !user.role_id"
                    fluid
                />
                <small v-if="submitted && !user.role_id" class="text-red-500"> Le rôle est obligatoire. </small>
            </div>

            <div>
                <label for="password" class="block font-bold mb-2">Mot de passe</label>
                <InputText id="password" v-model="user.password" type="password" fluid />
                <small class="text-gray-500"> Laissez vide pour générer un mot de passe aléatoire ou conserver l'actuel. </small>
            </div>
        </div>

        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
            <Button label="Enregistrer" icon="pi pi-check" @click="saveUser" :loading="savingUser" :disabled="savingUser" />
        </template>
    </Dialog>

    <!-- Dialog de confirmation pour la suppression -->
    <Dialog v-model:visible="blockUserDialog" :style="{ width: '450px', borderRadius: '8px' }" :modal="true" :closable="false" class="delete-confirmation-dialog">
        <template #header>
            <div class="flex items-center">
                <i class="pi pi-exclamation-triangle text-yellow-500 mr-2"></i>
                <span class="text-xl font-semibold">Confirmation de suppression</span>
            </div>
        </template>

        <div class="flex flex-col items-center p-4 pt-2">
            <div class="bg-red-50 dark:bg-red-900/20 rounded-full p-5 mb-4">
                <i class="pi pi-trash text-red-500" style="font-size: 2.5rem"></i>
            </div>

            <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-3">Confirmer la suppression</h3>

            <p v-if="user" class="text-center text-gray-600 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer l'utilisateur
                <span class="font-semibold text-gray-900 dark:text-white">
                    {{ getFullName(user) }}
                </span>
                ?
            </p>

            <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded text-sm text-yellow-800 dark:text-yellow-200">
                <i class="pi pi-info-circle mr-2"></i>
                Cette action supprimera l'utilisateur mais il pourra être restauré depuis la corbeille.
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button label="Annuler" icon="pi pi-times" class="p-button-text" @click="blockUserDialog = false" />
                <Button label="Supprimer" icon="pi pi-trash" class="p-button-danger p-button-raised" @click="blockUser" />
            </div>
        </template>
    </Dialog>

    <!-- Dialog de confirmation pour la suppression multiple -->
    <Dialog v-model:visible="blockUsersDialog" :style="{ width: '450px' }" header="Confirmer la suppression" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle !text-3xl" />
            <span>Êtes-vous sûr de vouloir supprimer les utilisateurs sélectionnés ?</span>
        </div>
        <template #footer>
            <Button label="Non" icon="pi pi-times" text @click="blockUsersDialog = false" />
            <Button label="Oui" icon="pi pi-check" severity="danger" @click="blockSelectedUsers" />
        </template>
    </Dialog>

    <!-- Dialog de confirmation pour le changement de statut -->
    <Dialog v-model:visible="toggleStatusDialog" :style="{ width: '450px' }" header="Confirmer le changement de statut" :modal="true">
        <div class="flex items-center gap-4">
            <i class="pi pi-question-circle !text-3xl" />
            <span v-if="user">
                Êtes-vous sûr de vouloir {{ user.status === true ? 'désactiver' : 'activer' }} <b>{{ getFullName(user) }}</b> ?
            </span>
        </div>
        <template #footer>
            <Button label="Non" icon="pi pi-times" text @click="toggleStatusDialog = false" />
            <Button label="Oui" icon="pi pi-check" :severity="user.status === true ? 'warning' : 'success'" @click="toggleUserStatus" />
        </template>
    </Dialog>

    <!-- Dialog des utilisateurs supprimés -->
    <Dialog v-model:visible="showBlockedUsersDialog" :style="{ width: '900px' }" header="Utilisateurs supprimés" :modal="true">
        <div class="flex flex-col gap-4">
            <div v-if="blockedUsers.length === 0" class="text-center p-4">
                <i class="pi pi-info-circle !text-3xl mb-3 block" />
                <p>Aucun utilisateur supprimé</p>
            </div>
            <DataTable v-else :value="blockedUsers" dataKey="id" :paginator="true" :rows="5">
                <Column header="Photo" style="width: 5rem">
                    <template #body="slotProps">
                        <div class="flex justify-center">
                            <img
                                v-if="getProfilePhotoUrl(slotProps.data)"
                                :src="getProfilePhotoUrl(slotProps.data)"
                                :alt="`Photo de ${getFullName(slotProps.data)}`"
                                class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                @error="handleImageError"
                            />
                            <div v-else class="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                <i class="pi pi-user text-gray-500"></i>
                            </div>
                        </div>
                    </template>
                </Column>
                <Column field="email" header="Email"></Column>
                <Column field="name" header="Nom">
                    <template #body="slotProps">
                        {{ getFullName(slotProps.data) }}
                    </template>
                </Column>
                <Column field="roles" header="Rôle">
                    <template #body="slotProps">
                        {{ findRoleName(slotProps.data) }}
                    </template>
                </Column>
                <Column field="deleted_at" header="Supprimé le">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.deleted_at) }}
                    </template>
                </Column>
                <Column style="width: 8rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-replay" outlined rounded severity="success" @click="restoreUser(slotProps.data.id)" v-tooltip.top="'Restaurer l\'utilisateur'" />
                    </template>
                </Column>
            </DataTable>
        </div>
        <template #footer>
            <Button label="Fermer" icon="pi pi-times" text @click="showBlockedUsersDialog = false" />
        </template>
    </Dialog>

    <!-- Dialog de modification de rôle -->
    <Dialog v-model:visible="updateRoleDialog" :style="{ width: '450px' }" header="Modifier le rôle" :modal="true">
        <div class="flex flex-col gap-4">
            <div>
                <label for="updateRole" class="block font-bold mb-2">Rôle</label>
                <AutoComplete
                    id="updateRole"
                    v-model="user.selectedRole"
                    :suggestions="filteredRoles"
                    optionLabel="name"
                    dropdown
                    @complete="searchRolesByName"
                    placeholder="Rechercher un rôle"
                    @item-select="(e) => (user.role_id = e.value.id)"
                    fluid
                />
            </div>
        </div>
        <template #footer>
            <Button label="Annuler" icon="pi pi-times" text @click="updateRoleDialog = false" />
            <Button label="Mettre à jour" icon="pi pi-check" @click="updateRole" />
        </template>
    </Dialog>
</template>

<style scoped>
.border-l-3 {
    border-left-width: 3px;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 0.75rem 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
    transition: background-color 0.2s;
}

:deep(.p-datatable .p-datatable-tbody > tr:nth-child(even)) {
    background-color: #f8fafc;
}

:deep(.p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):hover) {
    background-color: #e2e8f0;
}

.dark :deep(.p-datatable .p-datatable-thead > tr > th) {
    background-color: #334155;
    color: #e2e8f0;
}

.dark :deep(.p-datatable .p-datatable-tbody > tr:nth-child(even)) {
    background-color: #1e293b;
}

.dark :deep(.p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):hover) {
    background-color: #334155;
}

:deep(.p-dialog-header) {
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 1.5rem;
}

:deep(.p-dialog-content) {
    padding: 0;
}

:deep(.p-dialog-footer) {
    padding: 1rem 1.5rem;
    background-color: #f8fafc;
}

:deep(.p-dialog) {
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dark :deep(.p-dialog-header) {
    background-color: #1e293b;
    border-bottom: 1px solid #334155;
}

.dark :deep(.p-dialog-content) {
    background-color: #1e293b;
}

.dark :deep(.p-dialog-footer) {
    background-color: #0f172a;
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

.pi-trash {
    animation: pulse 2s infinite;
}
</style>
