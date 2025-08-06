<script setup>
import apiClient from '@/service/apiClient';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
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

const router = useRouter();
const toast = useToast();
const dt = ref();

const roles = ref([]);
const loadingRoles = ref(false);

const users = ref([]);
const blockedUsers = ref([]);
const userDialog = ref(false);
const blockUserDialog = ref(false);
const blockUsersDialog = ref(false);
const showBlockedUsersDialog = ref(false);
const updateRoleDialog = ref(false);
const toggleStatusDialog = ref(false);
const user = ref({});
const selectedUsers = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const filteredRoles = ref([]);

onMounted(async () => {
    await fetchRoles();
    await loadUsers();
});

const refreshData = async () => {
    try {
        await loadUsers();
    } catch (error) {
        console.error('Erreur lors du rafraîchissement des données:', error);
    }
};

const loadUsers = async () => {
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
    user.value = {};
    submitted.value = false;
    userDialog.value = true;
}

function hideDialog() {
    userDialog.value = false;
    submitted.value = false;
}

async function saveUser() {
    submitted.value = true;

    if (user.value.name?.trim() && user.value.email?.trim() && user.value.role_id) {
        try {
            if (user.value.id) {
                await apiClient.put(`/auth/users/${user.value.id}`, user.value);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur mis à jour', life: 3000 });
            } else {
                await apiClient.post('/auth/users/register', user.value);
                toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur créé', life: 3000 });
            }

            userDialog.value = false;
            user.value = {};

            await refreshData();
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
        blockedUsers.value = blockedUsers.value.filter((user) => user.id !== userId);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur restauré', life: 3000 });

        if (blockedUsers.value.length === 0) {
            showBlockedUsersDialog.value = false;
        }

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

async function updateUserProfile(userData) {
    try {
        await apiClient.post(`/auth/users/update-profile/${userData.id}`, userData);
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Profil mis à jour', life: 3000 });

        await refreshData();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour du profil',
            life: 3000
        });
        console.error('Erreur lors de la mise à jour du profil:', error);
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

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < users.value.length; i++) {
        if (users.value[i].id === id) {
            index = i;
            break;
        }
    }
    return index;
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
    try {
        const response = await apiClient.get('/auth/users/trash');
        blockedUsers.value = response.data.data || [];
        showBlockedUsersDialog.value = true;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les utilisateurs supprimés',
            life: 3000
        });
        console.error('Erreur lors du chargement des utilisateurs supprimés:', error);
    }
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
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Nouveau" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Supprimer" icon="pi pi-trash" severity="danger" class="mr-2" @click="confirmBlockSelected" :disabled="!selectedUsers || !selectedUsers.length" />
                    <Button label="Utilisateurs supprimés" icon="pi pi-users" severity="secondary" @click="showBlockedUsers" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedUsers"
                :value="users"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} utilisateurs"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Gestion des Utilisateurs</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="email" header="Email" sortable style="min-width: 14rem"></Column>
                <Column field="name" header="Nom" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        {{ getFullName(slotProps.data) }}
                    </template>
                </Column>
                <Column field="roles" header="Rôle" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ findRoleName(slotProps.data) }}
                    </template>
                </Column>
                <Column field="status" header="Statut" sortable style="min-width: 8rem">
                    <template #body="slotProps">
                        <Tag :value="getStatusLabel(slotProps.data.status)" :severity="getStatusSeverity(slotProps.data.status)" />
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 20rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded severity="primary" class="mr-2" @click="editUser(slotProps.data)" v-tooltip.top="'Modifier'" />
                        <Button icon="pi pi-user-edit" outlined rounded severity="secondary" class="mr-2" @click="openUpdateRoleDialog(slotProps.data)" v-tooltip.top="'Modifier le rôle'" />
                        <Button
                            :icon="slotProps.data.status === 'active' || slotProps.data.status === true ? 'pi pi-pause' : 'pi pi-play'"
                            outlined
                            rounded
                            :severity="slotProps.data.status === 'active' || slotProps.data.status === true ? 'warning' : 'success'"
                            class="mr-2"
                            @click="confirmToggleStatus(slotProps.data)"
                            v-tooltip.top="slotProps.data.status === 'active' || slotProps.data.status === true ? 'Désactiver' : 'Activer'"
                        />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmBlockUser(slotProps.data)" v-tooltip.top="'Supprimer'" />
                    </template>
                </Column>
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
                    <label for="password" class="block font-bold mb-2">Mot de passe</label>
                    <InputText id="password" v-model="user.password" type="password" fluid />
                    <small class="text-gray-500"> Laissez vide pour générer un mot de passe aléatoire ou conserver l'actuel. </small>
                </div>
            </div>

            <template #footer>
                <Button label="Annuler" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Enregistrer" icon="pi pi-check" @click="saveUser" />
            </template>
        </Dialog>

        <Dialog v-model:visible="blockUserDialog" :style="{ width: '450px' }" header="Confirmer la suppression" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="user">
                    Êtes-vous sûr de vouloir supprimer <b>{{ getFullName(user) }}</b> ?
                </span>
            </div>
            <template #footer>
                <Button label="Non" icon="pi pi-times" text @click="blockUserDialog = false" />
                <Button label="Oui" icon="pi pi-check" severity="danger" @click="blockUser" />
            </template>
        </Dialog>

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

        <Dialog v-model:visible="showBlockedUsersDialog" :style="{ width: '800px' }" header="Utilisateurs supprimés" :modal="true">
            <div class="flex flex-col gap-4">
                <div v-if="blockedUsers.length === 0" class="text-center p-4">
                    <i class="pi pi-info-circle !text-3xl mb-3 block" />
                    <p>Aucun utilisateur supprimé</p>
                </div>
                <DataTable v-else :value="blockedUsers" dataKey="id">
                    <Column field="username" header="Nom d'utilisateur"></Column>
                    <Column field="email" header="Email"></Column>
                    <Column field="name" header="Nom complet">
                        <template #body="slotProps">
                            {{ getFullName(slotProps.data) }}
                        </template>
                    </Column>
                    <Column field="roles" header="Rôle">
                        <template #body="slotProps">
                            {{ findRoleName(slotProps.data) }}
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
    </div>
</template>
