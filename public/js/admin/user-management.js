async function initUserManagement() {
    const elements = {
        addButton: document.getElementById('add-user-btn'),
        userList: document.getElementById('user-list')
    };

    if (!elements.userList) return;

    await loadUsers();

    elements.addButton?.addEventListener('click', showAddUserForm);
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

window.initUserManagement = initUserManagement;
