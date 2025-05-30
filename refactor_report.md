Refactor: Implement controllers, enhance security, logging, and settings
This commit includes a comprehensive set of improvements across the application:

**1. Major Structural Refactoring:**
- Introduced a controller layer (`controllers/` and `controllers/admin/`).
- Migrated all business logic from route handlers (in `routes/` and `routes/admin/`) to their respective controllers, significantly improving separation of concerns, maintainability, and testability.

**2. Enhanced Security Measures:**
- **CSRF Protection:** Implemented `csurf` middleware globally. Added an API endpoint for CSRF token generation and integrated token handling into frontend AJAX requests (demonstrated with auth forms and system settings).
- **Helmet Configuration:** Reviewed and updated Helmet CSP directives to tighten security (e.g., `imgSrc`, `frame-ancestors`, `object-src`, `base-uri`). Added comments for future `'unsafe-inline'` refactoring.
- **API Key Management:** Modified Mongoose models (`AiApi`, `ImageApi`, `VoiceApi`) with `toJSON` transforms to prevent leakage of `curlCommand` (potentially containing API keys) in responses.
- **Password Management:**
    - Fixed a critical vulnerability in the admin user update route (`routes/admin/users.js`) to ensure new passwords set by admins are correctly hashed using the model's pre-save hook.
    - Documented recommendations for user-initiated password changes and resets.

**3. Improved Error Handling and Logging:**
- **Standardized Error Handling:** Introduced a custom `AppError` class and a centralized error handling middleware in `server.js` for consistent and secure error responses (detailed in dev, generic in prod for non-operational errors).
- **Refined Winston Logging:**
    - Enhanced `logger.js` with environment-specific console formatting and robust DB logging fallback.
    - Systematically replaced most `console.*` calls throughout the backend with contextualized `logger` calls.

**4. Database Performance Optimization:**
- **Indexing:** Reviewed all Mongoose schemas and added appropriate indexes to key fields to improve query performance.
- **Lean Queries:** Applied `.lean()` to applicable read-only Mongoose queries to reduce overhead and improve speed.

**5. System Settings Functionality Update (Admin):**
- **CSRF Protection:** Integrated CSRF token handling in the frontend for save and reset operations.
- **UX Enhancements:** Added loading states (button disabling, text changes) and improved user feedback for asynchronous operations.
- **Client-Side Validation:** Implemented basic input validation on the client-side.
- **Backend Reset Logic:** Refactored "Reset to Defaults" to fetch default values directly from the Mongoose schema via a new dedicated backend endpoint.
- **Model/Validator Alignment:** Ensured consistency between the `Settings` Mongoose model, Joi validation schemas, and HTML form constraints.
- **Documentation:** Added code comments.

These changes result in a more robust, secure, maintainable, and performant application
