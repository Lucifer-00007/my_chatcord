// Wait for adminUtils to be initialized
async function waitForAdminUtils() {
    return new Promise(resolve => {
        if (window.adminUtils) {
            resolve();
            return;
        }

        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.adminUtils) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                window.showNotification('Error: Failed to initialize admin utilities', 'error');
                resolve(); // Resolve anyway to prevent hanging
            }
        }, 100);
    });
}

async function initRoomManagement() {
    await waitForAdminUtils();

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

    // Verify all required elements exist
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements);
        return;
    }

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
    elements.blockUserButton.addEventListener('click', async () => {
        if (!selectedRoom) {
            showNotification('Please select a room first', 'error');
            return;
        }
        try {
            await showBlockModal();
        } catch (err) {
            console.error('Error in showBlockModal:', err);
            showNotification('Failed to open block user modal', 'error');
        }
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
        const userId = document.getElementById('user-select').value;
        const reason = document.getElementById('block-reason').value;
        const duration = parseFloat(document.getElementById('block-duration').value);
        const roomId = selectedRoom;

        // Check if user is already blocked in this room
        try {
            const blocks = await window.adminUtils.makeApiRequest(`/api/admin/room-management/rooms/${roomId}/blocks`);
            const userBlock = blocks.find(block => block.user && block.user._id === userId && block.isActive);
            if (userBlock) {
                const username = userBlock.user && userBlock.user.username ? userBlock.user.username : 'User';
                const roomName = elements.selectedRoomName ? elements.selectedRoomName.textContent : 'this';
                showNotification(`${username} is already blocked in the ${roomName} room!`, 'warning');
                return;
            }
        } catch (err) {
            showNotification('Could not verify existing blocks. Please try again.', 'error');
            return;
        }

        const formData = {
            userId,
            reason,
            duration,
            roomId
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
                        <i class="fas fa-users"></i> ${room.blockedCount || 0} Blocked Users
                    </div>
                </div>
                <div class="room-actions">
                    <button class="btn-icon btn-edit edit-room" title="Edit Room">
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
        container.innerHTML = blocks.map(block => {
            // Defensive checks for block fields
            const blockId = block && block._id ? block._id : '';
            const username = block && block.user && block.user.username ? block.user.username : 'Unknown User';
            const reason = block && block.reason ? block.reason : 'No reason provided';
            // Show 'Blocked for lifetime' if duration is 9999999
            let durationText;
            if (block && block.duration === 9999999) {
                durationText = '<span class="block-lifetime">Blocked for lifetime</span>';
            } else {
                const endDate = block && block.endDate ? new Date(block.endDate) : null;
                const time = endDate ? endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--';
                const date = endDate ? `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}` : '--';
                durationText = `<span class="block-until">Blocked until <b>${time}, ${date}</b></span>`;
            }
            // Blocked date
            const startDate = block && block.startDate ? new Date(block.startDate) : null;
            const blockedDate = startDate ? `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}` : '--';
            // Blocked by (show username if available)
            let blockedBy = (block && block.blockedBy && block.blockedBy.username)
                ? block.blockedBy.username
                : (block && block.blockedByName ? block.blockedByName : 'Unknown');

            const durationsConstant = window.adminUtils.constants?.ROOM_MANAGEMENT?.BLOCK_DURATIONS || [];
            const blockedDuration = durationsConstant.find(duration => duration.value === block?.duration)?.label || 'Unknown';
            return `
                <div class="block-item improved-block-item" data-id="${blockId}">
                    <div class="block-info">
                        <div class="block-user"><span class="block-user-label">Name:</span> <span class="block-user-name">${username}</span></div>
                        <div class="block-reason">Reason: <b>${reason}</b></div>
                        <div class="block-by">Blocked-by: <b>${blockedBy}</b></div>
                        <div class="block-date">Blocked-on: <b>${blockedDate}</b></div>
                        <div class="block-duration">Blocked-span: <b>${blockedDuration}</b></div>
                        <div class="block-duration-text">${durationText}</div>
                    </div>
                    <div class="block-actions">
                        <button class="btn-icon btn-danger" title="Remove block" onclick="removeBlock('${blockId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('') || '<div class="empty-state">No blocks for this room</div>';
    } catch (err) {
        showNotification(err.message, 'error');
    }
}

async function showBlockModal() {
    const modal = document.getElementById('block-user-modal');
    const userSelect = document.getElementById('user-select');
    const reasonSelect = document.getElementById('block-reason');
    const durationSelect = document.getElementById('block-duration');

    if (!modal || !userSelect || !reasonSelect || !durationSelect) {
        window.showNotification('Error: Modal elements not found', 'error');
        return;
    }

    try {
        await waitForAdminUtils();
        await loadUsersForModal();

        if (!window.adminUtils.constants?.ROOM_MANAGEMENT) {
            throw new Error('Room management constants not found');
        }

        reasonSelect.innerHTML = window.adminUtils.constants.ROOM_MANAGEMENT.BLOCK_REASONS
            .map(reason => `<option value="${reason}">${reason}</option>`)
            .join('');

        const durations = window.adminUtils.constants.ROOM_MANAGEMENT.BLOCK_DURATIONS;
        console.log('User Block Durations:', durations);
        durationSelect.innerHTML = durations
            .map(duration => `<option value="${duration.value}">${duration.label}</option>`)
            .join('');

        modal.style.display = 'block';
    } catch (err) {
        window.showNotification('Failed to initialize block user modal: ' + err.message, 'error');
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

function hideBlockModal() {
    const modal = document.getElementById('block-user-modal');
    modal.style.display = 'none';
}

async function loadUsers() {
    const userSelect = document.getElementById('user-select');

    if (!userSelect) {
        window.showNotification('Error: Could not find user selection element', 'error');
        return;
    }

    try {
        await waitForAdminUtils();

        const users = await window.adminUtils.makeApiRequest('/api/admin/users');

        if (!Array.isArray(users)) {
            throw new Error('Invalid response from server');
        }

        if (users.length === 0) {
            userSelect.innerHTML = '<option value="">No users available</option>';
            return;
        }

        userSelect.innerHTML = `
            <option value="">Select a user...</option>
            ${users.map(user =>
            `<option value="${user._id}">${user.username}${user.email ? ` (${user.email})` : ''}</option>`
        ).join('')}
        `;

    } catch (err) {
        window.showNotification(err.message || 'Failed to load users', 'error');
        userSelect.innerHTML = '<option value="">Error loading users</option>';
    }
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

async function loadUsersForModal() {
    const userSelect = document.getElementById('user-select');
    if (!userSelect) {
        window.showNotification('Error: Could not find user selection element', 'error');
        return;
    }

    try {
        await waitForAdminUtils();
        const users = await window.adminUtils.makeApiRequest('/api/admin/users');

        if (!Array.isArray(users)) {
            throw new Error('API did not return an array');
        }

        if (users.length === 0) {
            userSelect.innerHTML = '<option value="">No users available</option>';
            return;
        }

        userSelect.innerHTML = `
            <option value="">Select a user...</option>
            ${users.map(user =>
            `<option value="${user._id}">${user.username} (${user.email || 'No email'})</option>`
        ).join('')}
        `;
    } catch (err) {
        window.showNotification(err.message || 'Failed to load users', 'error');
        userSelect.innerHTML = '<option value="">Error loading users</option>';
    }
}

// Export functions for global use
window.initRoomManagement = initRoomManagement;
window.removeBlock = removeBlock;