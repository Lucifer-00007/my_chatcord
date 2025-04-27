async function initUserManagement() {
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
    const userList = document.getElementById('user-list');
    
    try {
        const users = await window.adminUtils.makeApiRequest('/api/admin/users');
        
        userList.innerHTML = users.map(user => `
            <div class="user-item" data-id="${user._id}">
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-email">${user.email}</div>
                    <div class="user-role">${user.isAdmin ? 'Admin' : 'User'}</div>
                </div>
                <div class="user-controls">
                    <button class="btn btn-icon" onclick="editUser('${user._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="deleteUser('${user._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
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
    }
}

// Export functions for global use
window.initUserManagement = initUserManagement;
window.showAddUserForm = showAddUserForm;
