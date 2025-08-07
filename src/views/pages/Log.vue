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

const logs = ref([]);
const loadingLogs = ref(false);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

onMounted(async () => {
    await loadLogs();
});

const loadLogs = async () => {
    loadingLogs.value = true;
    try {
        const response = await apiClient.get('/auth/users/logs/get');
        logs.value = response.data.data || [];
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les logs',
            life: 3000
        });
        console.error('Erreur lors du chargement des logs:', error);
    } finally {
        loadingLogs.value = false;
    }
};

const refreshData = async () => {
    try {
        await loadLogs();
        toast.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Logs actualisés',
            life: 3000
        });
    } catch (error) {
        console.error('Erreur lors du rafraîchissement des données:', error);
    }
};

const goBack = () => {
    router.back();
};

const exportCSV = () => {
    dt.value.exportCSV();
};
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" class="mr-2" @click="goBack" />
                    <Button label="Actualiser" icon="pi pi-refresh" severity="primary" @click="refreshData" :loading="loadingLogs" />
                </template>

                <template #end>
                    <Button label="Exporter" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                :value="logs"
                dataKey="id"
                :paginator="true"
                :rows="20"
                :filters="filters"
                :loading="loadingLogs"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[10, 20, 50, 100]"
                currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} logs"
                sortMode="single"
                :sortField="'created_at'"
                :sortOrder="-1"
                responsiveLayout="scroll"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Historique des Logs</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Rechercher dans les logs..." />
                        </IconField>
                    </div>
                </template>

                <template #empty>
                    <div class="text-center p-4">
                        <i class="pi pi-info-circle !text-3xl mb-3 block text-gray-400" />
                        <p class="text-gray-500">Aucun log disponible</p>
                    </div>
                </template>

                <Column field="event" header="Événement" sortable style="min-width: 20rem">
                    <template #body="slotProps">
                        <div class="max-w-md">
                            <p class="text-l text-gray-700 break-words">
                                {{ slotProps.data.event }}
                            </p>
                        </div>
                    </template>
                </Column>

                <Column field="created_at_human" header="Date" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium text-gray-800">
                                {{ slotProps.data.created_at_human }}
                            </span>
                            <span class="text-xs text-gray-500">
                                {{
                                    new Date(slotProps.data.created_at).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                }}
                            </span>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<style scoped>
.card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
}

.max-w-md {
    max-width: 28rem;
}

.break-words {
    word-break: break-word;
}

code {
    font-family: 'Courier New', Courier, monospace;
}
</style>
