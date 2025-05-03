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

    // Add search, filter, and sort UI above the table
    const userListSection = document.querySelector('.user-list-section');
    if (userListSection) {
        const controls = document.createElement('div');
        controls.className = 'user-controls';
        controls.innerHTML = `
            <div class="search-wrapper">
                <input class="form-input" type="text" id="user-search" placeholder="Search users..."/>
                <span class="search-icon"><i class="fa fa-search" aria-hidden="true"></i></span>
            </div>
            <select id="user-filter" class="form-select">
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
            </select>
            <select id="user-sort" class="form-select">
                <option value="username-asc">Username (A-Z)</option>
                <option value="username-desc">Username (Z-A)</option>
                <option value="email-asc">Email (A-Z)</option>
                <option value="email-desc">Email (Z-A)</option>
                <option value="createdAt-desc">Newest</option>
                <option value="createdAt-asc">Oldest</option>
            </select>
        `;
        userListSection.insertBefore(controls, userListSection.firstChild);
    }

    // Load initial user list
    await loadUsers();

    // Add event listeners
    elements.addButton.addEventListener('click', showAddUserForm);

    // Initialize form submission handler
    elements.userForm.addEventListener('submit', handleUserFormSubmit);

    // Add event listeners for search, filter, and sort
    setTimeout(() => {
        const search = document.getElementById('user-search');
        const filter = document.getElementById('user-filter');
        const sort = document.getElementById('user-sort');
        if (search) search.addEventListener('input', () => loadUsers());
        if (filter) filter.addEventListener('change', () => loadUsers());
        if (sort) sort.addEventListener('change', () => loadUsers());
    }, 0);
}

async function loadUsers() {
    const userListBody = document.getElementById('user-list-body');
    if (!userListBody) return;
    const search = document.getElementById('user-search')?.value.trim() || '';
    const filter = document.getElementById('user-filter')?.value || 'all';
    const sort = document.getElementById('user-sort')?.value || 'username-asc';
    try {
        let users = [];
        if (search) {
            users = await window.adminUtils.makeApiRequest(`/api/admin/users/search?q=${encodeURIComponent(search)}`);
        } else {
            users = await window.adminUtils.makeApiRequest('/api/admin/users');
        }
        // Filter by role
        if (filter === 'admin') {
            users = users.filter(u => u.isAdmin);
        } else if (filter === 'user') {
            users = users.filter(u => !u.isAdmin);
        }
        // Sort
        users.sort((a, b) => {
            switch (sort) {
                case 'username-asc': return a.username.localeCompare(b.username);
                case 'username-desc': return b.username.localeCompare(a.username);
                case 'email-asc': return a.email.localeCompare(b.email);
                case 'email-desc': return b.email.localeCompare(a.email);
                case 'createdAt-asc': return new Date(a.createdAt) - new Date(b.createdAt);
                case 'createdAt-desc': return new Date(b.createdAt) - new Date(a.createdAt);
                default: return 0;
            }
        });
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
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (err) {
        // Silently fail and return empty string
        return '';
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
