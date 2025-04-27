async function initRoomManagement() {
    const elements = {
        roomsContainer: document.getElementById('rooms-container'),
        blocksContainer: document.getElementById('blocks-container'),
        addRoomButton: document.getElementById('add-room-btn'),
        blockUserButton: document.getElementById('block-user-btn'),
        selectedRoomName: document.getElementById('selected-room-name'),
        roomModal: document.getElementById('room-modal'),
        blockModal: document.getElementById('block-user-modal'),
        roomForm: document.getElementById('room-form'),
        blockForm: document.getElementById('block-user-form')
    };

    let selectedRoom = null;

    // Load initial rooms
    await loadRooms();

    // Room click handler
    elements.roomsContainer.addEventListener('click', async (e) => {
        const roomItem = e.target.closest('.room-item');
        if (!roomItem) return;

        // Remove active class from all rooms
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked room
        roomItem.classList.add('active');
        selectedRoom = roomItem.dataset.id;
        elements.selectedRoomName.textContent = roomItem.dataset.name;

        // Load blocks for selected room
        await loadBlocks(selectedRoom);

        // Enable block user button
        elements.blockUserButton.disabled = false;
    });

    // Add room button click handler
    elements.addRoomButton.addEventListener('click', () => {
        showRoomModal('create');
    });

    // Block user button click handler
    elements.blockUserButton.addEventListener('click', () => {
        if (!selectedRoom) {
            showNotification('Please select a room first', 'error');
            return;
        }
        showBlockModal();
    });

    // Room form submit handler
    elements.roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('room-name').value,
            topic: document.getElementById('room-topic').value,
            description: document.getElementById('room-description').value,
            isDefault: document.getElementById('room-is-default').checked
        };

        try {
            const method = elements.roomForm.dataset.mode === 'edit' ? 'PUT' : 'POST';
            const endpoint = method === 'PUT' 
                ? `/api/admin/room-management/rooms/${elements.roomForm.dataset.roomId}`
                : '/api/admin/room-management/rooms';

            await window.adminUtils.makeApiRequest(endpoint, {
                method,
                body: formData
            });

            showNotification(`Room ${method === 'PUT' ? 'updated' : 'created'} successfully`, 'success');
            hideRoomModal();
            await loadRooms();
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // Block form submit handler
    elements.blockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            userId: document.getElementById('user-select').value,
            reason: document.getElementById('block-reason').value,
            duration: parseInt(document.getElementById('block-duration').value),
            roomId: selectedRoom
        };

        try {
            await window.adminUtils.makeApiRequest('/api/admin/room-management/blocks', {
                method: 'POST',
                body: formData
            });

            showNotification('User blocked successfully', 'success');
            hideBlockModal();
            await loadBlocks(selectedRoom);
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // Close modal handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            hideRoomModal();
            hideBlockModal();
        });
    });

    // Initialize room action handlers
    initRoomActions();
}

async function loadRooms() {
    const container = document.getElementById('rooms-container');
    try {
        const rooms = await window.adminUtils.makeApiRequest('/api/admin/room-management/rooms');
        
        container.innerHTML = rooms.map(room => `
            <div class="room-item" data-id="${room._id}" data-name="${room.name}">
                <div class="room-info">
                    <div class="room-name">${room.name}</div>
                    <div class="room-topic">${room.topic}</div>
                    ${room.description ? `<div class="room-description">${room.description}</div>` : ''}
                    <div class="room-stats">
                        <i class="fas fa-users"></i> ${room.userCount || 0} users
                    </div>
                </div>
                <div class="room-actions">
                    <button class="btn-icon edit-room" title="Edit Room">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!room.isDefault ? `
                        <button class="btn-icon btn-danger delete-room" title="Delete Room">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function loadBlocks(roomId) {
    const container = document.querySelector('.blocks-list');
    try {
        const blocks = await window.adminUtils.makeApiRequest(`/api/admin/room-management/rooms/${roomId}/blocks`);
        
        container.innerHTML = blocks.map(block => `
            <div class="block-item" data-id="${block._id}">
                <div class="block-info">
                    <div class="block-user">${block.user.username}</div>
                    <div class="block-reason">${block.reason}</div>
                    <div class="block-duration">Blocked until ${new Date(block.endDate).toLocaleDateString()}</div>
                </div>
                <div class="block-actions">
                    <button class="btn-icon btn-danger" onclick="removeBlock('${block._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('') || '<div class="empty-state">No blocks for this room</div>';
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function showRoomModal(mode, roomData = null) {
    const modal = document.getElementById('room-modal');
    const form = document.getElementById('room-form');
    const title = modal.querySelector('.modal-title');
    const btnName = modal.querySelector('#room-model-btn');

    form.reset();
    form.dataset.mode = mode;

    if (mode === 'edit' && roomData) {
        title.textContent = 'Edit Room';
        btnName.textContent = 'Update Room';
        form.dataset.roomId = roomData._id;
        document.getElementById('room-name').value = roomData.name;
        document.getElementById('room-topic').value = roomData.topic;
        document.getElementById('room-description').value = roomData.description || '';
        document.getElementById('room-is-default').checked = roomData.isDefault;
    } else {
        title.textContent = 'Create New Room';
        delete form.dataset.roomId;
    }

    modal.style.display = 'block';
}

function hideRoomModal() {
    const modal = document.getElementById('room-modal');
    modal.style.display = 'none';
}

function showBlockModal() {
    const modal = document.getElementById('block-user-modal');
    const userSelect = document.getElementById('user-select');
    const reasonSelect = document.getElementById('block-reason');
    const durationSelect = document.getElementById('block-duration');

    // Create and add search input
    if (!document.getElementById('user-search')) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'form-group';
        searchDiv.innerHTML = `
            <input type="text" id="user-search" class="form-input" placeholder="Search users...">
        `;
        userSelect.parentNode.insertBefore(searchDiv, userSelect);

        // Add search functionality
        const searchInput = document.getElementById('user-search');
        searchInput.addEventListener('input', debounce(async (e) => {
            const searchTerm = e.target.value;
            try {
                const users = await window.adminUtils.makeApiRequest(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
                populateUserSelect(users);
            } catch (err) {
                showNotification(err.message, 'error');
            }
        }, 300));
    }

    // Load initial users list
    loadUsers();
    
    // Populate reason options
    reasonSelect.innerHTML = window.adminUtils.constants.ROOM_MANAGEMENT.BLOCK_REASONS
        .map(reason => `<option value="${reason}">${reason}</option>`)
        .join('');

    // Populate duration options
    durationSelect.innerHTML = window.adminUtils.constants.ROOM_MANAGEMENT.BLOCK_DURATIONS
        .map(duration => `<option value="${duration.value}">${duration.label}</option>`)
        .join('');

    modal.style.display = 'block';
}

async function loadUsers() {
    const userSelect = document.getElementById('user-select');
    try {
        const users = await window.adminUtils.makeApiRequest('/api/admin/users');
        populateUserSelect(users);
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

function populateUserSelect(users) {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = `
        <option value="">Select a user...</option>
        ${users.map(user => `<option value="${user._id}">${user.username} (${user.email})</option>`).join('')}
    `;
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function hideBlockModal() {
    const modal = document.getElementById('block-user-modal');
    modal.style.display = 'none';
}

function initRoomActions() {
    document.getElementById('rooms-container').addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const roomItem = target.closest('.room-item');
        const roomId = roomItem.dataset.id;

        if (target.classList.contains('edit-room')) {
            const roomData = {
                _id: roomId,
                name: roomItem.querySelector('.room-name').textContent,
                topic: roomItem.querySelector('.room-topic').textContent,
                description: roomItem.querySelector('.room-description')?.textContent || '',
                isDefault: !target.nextElementSibling // If no delete button, it's a default room
            };
            showRoomModal('edit', roomData);
        } else if (target.classList.contains('delete-room')) {
            if (confirm('Are you sure you want to delete this room?')) {
                try {
                    await window.adminUtils.makeApiRequest(`/api/admin/room-management/rooms/${roomId}`, {
                        method: 'DELETE'
                    });
                    showNotification('Room deleted successfully', 'success');
                    await loadRooms();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            }
        }
    });
}

async function removeBlock(blockId) {
    if (!confirm('Are you sure you want to remove this block?')) return;

    try {
        await window.adminUtils.makeApiRequest(`/api/admin/room-management/blocks/${blockId}`, {
            method: 'DELETE'
        });
        showNotification('Block removed successfully', 'success');
        const roomId = document.querySelector('.room-item.active').dataset.id;
        await loadBlocks(roomId);
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

// Export functions for global use
window.initRoomManagement = initRoomManagement;
window.removeBlock = removeBlock;