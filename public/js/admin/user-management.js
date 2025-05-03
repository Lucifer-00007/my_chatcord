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
        
        userListBody.innerHTML = users.map(user => `
            <tr data-id="${user._id}">
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.isAdmin ? 'Admin' : 'User'}</td>
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
    }
}

function handleUserFormSubmit(event) {
    event.preventDefault();
    showNotification('User form submitted (implement logic here)', 'info');
    // TODO: Implement add/edit user logic here
}

// Export functions for global use
window.initUserManagement = initUserManagement;
window.showAddUserForm = showAddUserForm;
