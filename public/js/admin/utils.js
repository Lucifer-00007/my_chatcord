class ApiError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

// Enhanced API Request Helper
async function makeApiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${AuthGuard.getAuthToken()}`,
            'Content-Type': 'application/json'
        }
    };

    const config = { ...defaultOptions, ...options };
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(endpoint, config);
        const data = await response.json().catch(() => null);
        
        if (!response.ok) {
            throw new ApiError(
                data?.message || `Request failed with status ${response.status}`,
                response.status,
                data?.code
            );
        }
        
        return data;
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        console.error('API Request failed:', err);
        throw new ApiError('Network or server error', 500);
    }
}

// Enhanced Form Helper
function getFormData(form, fields, validations = {}) {
    const data = {};
    const errors = [];

    fields.forEach(field => {
        const element = document.getElementById(field);
        if (!element) {
            errors.push(`Field '${field}' not found`);
            return;
        }

        const value = element.value.trim();
        data[field] = value;

        // Apply validations if any
        if (validations[field]) {
            const validation = validations[field];
            if (validation.required && !value) {
                errors.push(`${field} is required`);
            }
            if (validation.pattern && !validation.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }
            if (validation.custom) {
                const customError = validation.custom(value);
                if (customError) {
                    errors.push(customError);
                }
            }
        }
    });

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return data;
}

// Enhanced Loading State Helper
function setLoadingState(element, isLoading, options = {}) {
    if (!element) return;
    
    const {
        loadingText = 'Loading...',
        loadingIcon = '<i class="fas fa-spinner fa-spin"></i>',
        originalContent = element.innerHTML
    } = options;
    
    element.disabled = isLoading;
    if (isLoading) {
        element.setAttribute('data-original-content', originalContent);
        element.innerHTML = `${loadingIcon} ${loadingText}`;
    } else {
        element.innerHTML = element.getAttribute('data-original-content') || originalContent;
        element.removeAttribute('data-original-content');
    }
}

// Centralized Error Notification
function showApiError(err) {
    if (err instanceof ApiError) {
        showNotification(err.message, 'error');
    } else {
        console.error('Unexpected error:', err);
        showNotification('An unexpected error occurred', 'error');
    }
}

// Initialize admin utils with constants from backend
async function initAdminUtils() {
    try {
        const constants = await makeApiRequest('/api/admin/room-management/constants');
        window.adminUtils = {
            makeApiRequest,
            getFormData,
            setLoadingState,
            ApiError,
            showApiError,
            constants: {
                ROOM_MANAGEMENT: constants
            }
        };
    } catch (err) {
        console.error('Failed to initialize admin utils:', err);
        // Fallback to default values if API fails
        window.adminUtils = {
            makeApiRequest,
            getFormData,
            setLoadingState,
            ApiError,
            showApiError,
            constants: {
                ROOM_MANAGEMENT: {
                    BLOCK_REASONS: ['Inappropriate behavior', 'Spam', 'Harassment', 'Other'],
                    BLOCK_DURATIONS: [
                        { value: 1, label: '1 day' },
                        { value: 7, label: '1 week' }
                    ]
                }
            }
        };
    }
}

// Initialize when the script loads
initAdminUtils();
