async function initUserManagement() {
    // Redirect to login if not authenticated
    if (!window.AuthGuard || !AuthGuard.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const elements = {
        addButton: document.getElementById('add-user-btn'),
        userList: document.getElementById('user-list'),
        userForm: document.getElementById('user-form')
    };

    if (!elements.addButton || !elements.userList || !elements.userForm) {
        console.error('Required user management elements not found');
        return;
    }

    // Load initial user list
    await loadUsers();

    // Add event listeners
    elements.addButton.addEventListener('click', showAddUserForm);

    // Initialize form submission handler
    elements.userForm.addEventListener('submit', handleUserFormSubmit);
}

async function loadUsers() {
    const userListBody = document.getElementById('user-list-body');
    if (!userListBody) return; // Prevent error if not on user management page

    try {
        const users = await window.adminUtils.makeApiRequest('/api/admin/users');
        console.log('Loaded users:', users);

        userListBody.innerHTML = users.map(user => `
            <tr data-id="${user._id}">
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span>${user.isAdmin ? 'Admin' : 'User'}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="user-action">
                <a class="btn btn-icon btn-edit" onclick="editUser('${user._id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </a>
                <a class="btn btn-icon btn-danger" onclick="deleteUser('${user._id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </a>
                </div>
            </td>
            </tr>
        `).join('');
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function showAddUserForm() {
    const form = document.getElementById('user-form');
    const addButton = document.getElementById('add-user-btn');
    if (form && addButton) {
        form.reset();
        form.dataset.mode = 'add';
        form.style.display = 'block';
        addButton.style.display = 'none';
        // Move focus to the first input in the form
        const firstInput = form.querySelector('input:not([type="checkbox"])');
        if (firstInput) firstInput.focus();

        // Password visibility toggle
        togglePassword()
    }
}

async function handleUserFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const mode = form.dataset.mode;
    const userId = form.dataset.userId;
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword ? form.confirmPassword.value : null;
    // Validate confirm password if present
    if (confirmPassword !== null && password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        if (form.confirmPassword) form.confirmPassword.focus();
        return;
    }
    const isAdmin = form.isAdmin.checked;

    if (!username || !email || (mode === 'add' && !password)) {
        showNotification('All fields are required', 'error');
        return;
    }

    try {
        let endpoint = '/api/admin/users';
        let method = 'POST';
        let body = { username, email, isAdmin };
        if (mode === 'add') {
            body.password = password;
        } else if (mode === 'edit' && userId) {
            endpoint += `/${userId}`;
            method = 'PUT';
            if (password) body.password = password;
        }

        await window.adminUtils.makeApiRequest(endpoint, { method, body });
        showNotification(`User ${mode === 'add' ? 'created' : 'updated'} successfully`, 'success');
        form.reset();
        form.style.display = 'none';
        document.getElementById('add-user-btn').style.display = 'inline-block';
        await loadUsers();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Helper to format date as "DD/MM/YYYY"
function formatDate(dateString) {
    try {
        if (!dateString) throw new Error('Invalid date');
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error('Invalid date format');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (err) {
        console.error('Error formatting date:', err);
        showNotification('Error formatting date', 'error');
        return 'Invalid date';
    }
}

async function editUser(userId) {
    try {
        const user = await window.adminUtils.makeApiRequest(`/api/admin/users/${userId}`);
        const form = document.getElementById('user-form');
        form.reset();
        form.dataset.mode = 'edit';
        form.dataset.userId = userId;
        form.username.value = user.username;
        form.email.value = user.email;
        form.isAdmin.checked = !!user.isAdmin;
        form.password.value = '';
        if (form.confirmPassword) form.confirmPassword.value = '';
        form.style.display = 'block';
        document.getElementById('add-user-btn').style.display = 'none';
        
        // Show password field
        togglePassword()
        
        // Focus first input
        const firstInput = form.querySelector('input:not([type="checkbox"])');
        if (firstInput) firstInput.focus();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await window.adminUtils.makeApiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
        showNotification('User deleted successfully', 'success');
        await loadUsers();
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function togglePassword() {
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', () => {
            console.log('Password toggle clicked');
            const input = button.parentElement.querySelector('input');
            const icon = button.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Export functions for global use
window.initUserManagement = initUserManagement;
window.showAddUserForm = showAddUserForm;
window.editUser = editUser;
window.deleteUser = deleteUser;
