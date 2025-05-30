# Plan: Update System Settings Functionality

This plan outlines the steps to enhance the "System Settings" feature within the admin panel.

## 1. Integrate CSRF Protection in Frontend

*   **Objective:** Ensure that all state-changing operations on the System Settings page are protected against Cross-Site Request Forgery.
*   **Tasks:**
    *   In `public/js/admin/system-settings.js`:
        *   Utilize the global `window.getCsrfToken()` function (from `public/js/utils.js`) to fetch the CSRF token.
        *   Modify the event listener for the settings form (`systemSettingsForm`):
            *   Fetch the CSRF token upon page initialization.
            *   Include the fetched CSRF token in the `POST` request to `/api/admin/settings` (e.g., in the `X-CSRF-Token` header).
        *   Modify the "Reset to Defaults" button's event listener:
            *   Include the CSRF token in its `POST` request.
        *   Handle errors related to CSRF token fetching.
*   **Status:** Done.

## 2. Enhance Frontend UX and Feedback

*   **Objective:** Improve the user experience by providing clear loading states and notifications.
*   **Tasks (in `public/js/admin/system-settings.js`):**
    *   **Loading State:**
        *   Implement visual feedback (e.g., disable relevant buttons, show a spinner icon or "Loading..." text) during:
            *   Initial loading of settings.
            *   Saving settings.
            *   Resetting settings to default.
    *   **Notifications:**
        *   Review and potentially enhance the existing `showMessage` function for clarity and appearance.
        *   Consider using a more standardized notification component/library if one is adopted project-wide.
    *   **Button Disabling:**
        *   Ensure "Save Settings" and "Reset to Defaults" buttons are disabled while their respective operations are in progress to prevent multiple submissions.

## 3. Implement Client-Side Validation

*   **Objective:** Provide immediate feedback to you for basic input errors before submitting to the backend.
*   **Tasks (in `public/js/admin/system-settings.js`):**
    *   Add client-side validation to the form inputs in `public/admin/system-settings.html`.
    *   Examples:
        *   Check that numeric fields (`maxUsersPerRoom`, `maxMessageLength`, etc.) are not empty and contain valid numbers.
        *   Check if numbers are within acceptable ranges (e.g., greater than 0).
    *   Display clear, user-friendly error messages next to the respective fields or in a summary area if validation fails.
    *   This complements the existing backend Joi validation.

## 4. Refactor "Reset to Defaults" to use Backend Logic

*   **Objective:** Centralize the source of default settings values on the backend to ensure consistency.
*   **Tasks:**
    *   **Backend:**
        *   In `routes/admin/settings.js`: Create a new route, e.g., `POST /api/admin/settings/reset`. This route should be protected by `authMiddleware` and `adminAuth`.
        *   In `controllers/admin/appSettingsController.js`: Create a new controller function, e.g., `resetAppSettings(req, res, next)`.
            *   This function should retrieve the default values directly from the `Settings` Mongoose schema definition (`mongoose.model('Settings').schema.paths[fieldName].defaultValue`).
            *   It will then update the single settings document in the database with these defaults.
            *   If caching is implemented for settings, ensure the cache is invalidated here.
            *   Return the newly reset settings object in the response.
    *   **Frontend (`public/js/admin/system-settings.js`):**
        *   Modify the event listener for the "Reset to Defaults" button.
        *   Change it to make a `POST` request to the new `/api/admin/settings/reset` endpoint (including the CSRF token).
        *   On success, repopulate the form fields with the settings data returned from the backend.

## 5. Review and Update `Settings` Model and Joi Validation

*   **Objective:** Ensure the settings schema and its validation are comprehensive and up-to-date.
*   **Tasks:**
    *   **`models/Settings.js`:**
        *   Review all existing fields: `maxUsersPerRoom`, `maxRoomsPerUser`, `maxMessageLength`, `messageRateLimit`, `requireEmailVerification`, `allowGuestAccess`, `enableProfanityFilter`.
        *   Identify if any new system-wide settings are needed for the application (e.g., default theme, specific API behavior toggles, etc.).
        *   For any new settings, add them to the `settingsSchema` with appropriate types (`String`, `Number`, `Boolean`), default values, and Mongoose validation (e.g., `required`, `min`, `max`, `enum`).
    *   **`validators/admin/settingsSchemas.js` (`updateSettingsSchema`):**
        *   Update the Joi schema to reflect any changes (new fields, modified constraints) in the `Settings` Mongoose model.
        *   Ensure Joi validation rules for types and constraints (e.g., `Joi.number().min(1)`, `Joi.boolean()`) align with the Mongoose schema.

## 6. Testing

*   **Objective:** Verify the correctness and robustness of the updated System Settings functionality.
*   **Tasks:**
    *   Manually test all aspects of the System Settings page:
        *   **CSRF Protection:** Confirm that POST requests (save, reset) fail if the CSRF token is missing or invalid. (Already verified as part of Step 1 completion).
        *   **Loading Settings:** Verify settings are correctly loaded and displayed in the form on page load.
        *   **Saving Settings:**
            *   Test saving valid data for all fields.
            *   Test saving invalid data (e.g., non-numeric values for number fields, values outside min/max limits if client-side validation is bypassed) and verify backend validation errors are correctly handled and displayed.
        *   **Client-Side Validation:** If implemented, test that appropriate error messages appear directly in the form for invalid inputs.
        *   **Reset to Defaults:** Verify the "Reset to Defaults" button uses the new backend endpoint (if implemented) and correctly resets all form fields and database values to their schema defaults.
        *   **UX Enhancements:** Check that loading indicators and success/error notifications work as expected. Ensure buttons are appropriately disabled during operations.
        *   **New/Modified Settings:** If any new settings fields were added, test their functionality thoroughly.

## 7. Documentation (Code Comments)

*   **Objective:** Ensure the code is understandable and maintainable.
*   **Tasks:**
    *   Add or update comments in `public/js/admin/system-settings.js`, `controllers/admin/appSettingsController.js`, and `models/Settings.js` to explain any new or complex logic, decisions made, or important considerations for future developers.

