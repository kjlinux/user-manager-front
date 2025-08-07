import { useAuthStore } from '@/stores/auth'

export const roleDirective = {
    mounted(el, binding) {
        checkRole(el, binding);
    },

    updated(el, binding) {
        checkRole(el, binding);
    }
};

function checkRole(el, binding) {
    const authStore = useAuthStore();
    const requiredRoles = binding.value;

    if (!requiredRoles) {
        el.style.display = '';
        return;
    }

    if (!authStore.isAuthenticated) {
        el.style.display = 'none';
        return;
    }

    let hasAccess = false;

    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    hasAccess = authStore.hasAnyRole(rolesArray);

    el.style.display = hasAccess ? '' : 'none';
}

export const roleDirectiveWithModifiers = {
    mounted(el, binding) {
        checkRoleWithModifiers(el, binding);
    },

    updated(el, binding) {
        checkRoleWithModifiers(el, binding);
    }
};

function checkRoleWithModifiers(el, binding) {
    const authStore = useAuthStore();
    const requiredRoles = binding.value;
    const modifiers = binding.modifiers;

    if (!requiredRoles) {
        el.style.display = '';
        return;
    }

    if (!authStore.isAuthenticated) {
        el.style.display = 'none';
        return;
    }

    let hasAccess = false;
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (modifiers.all) {
        hasAccess = rolesArray.every((role) => authStore.hasRole(role));
    } else {
        hasAccess = authStore.hasAnyRole(rolesArray);
    }

    el.style.display = hasAccess ? '' : 'none';
}
