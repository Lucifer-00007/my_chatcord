# ChatCord Refactor Plan

## Implement eslint and prettier in the codebase
	- Add a `.eslint` and `.prettier` files, install the respective modules and update the `package.json` file and add npm scripts to run ESLint and Prettier.
	- Configure ESLint with a suitable ruleset (e.g., Airbnb or Standard) and integrate Prettier.
	- Run `npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-import eslint-config-airbnb-base`

## Enhance Input Validation.
	- Identify all routes that accept user input.
	- Implement or improve input validation using `joi` or `express-validator` for all request bodies, query parameters, and path parameters.
	- Ensure that validation errors are handled gracefully and return informative error messages.

## Strengthen Security Measures.
	- Review Helmet Configuration: Ensure Helmet is configured optimally for security headers, including CSP.
	- CSRF Protection: Implement CSRF protection using a library like `csurf` for all state-changing requests (POST, PUT, DELETE) that are session-based.
	- API Key Management: 
		- Move any hardcoded API keys for external services (AI, Image, Voice APIs) to environment variables or a secure secrets management system. 
		- Review how these keys are loaded and used.
		- Modified Mongoose models (AiApi, ImageApi, VoiceApi) with toJSON transforms to prevent leakage of curlCommand (potentially containing API keys) in responses.
	- Password Management: Ensure strong password policies are enforced during registration and password updates (e.g., complexity, length). Bcrypt is used for hashing, which is good.
	- Admin password updates needs to be correctly hash passwords. Recommendations for user-initiated password changes and resets needs to be added as well.

## Improve Error Handling and Logging.
	- Standardize Error Responses: Create a consistent error response format for all API endpoints.
	- Centralized Error Handler: Implement a centralized error handling middleware in Express to catch unhandled errors.
	- Refine Winston Logging:
		- Ensure all important events, errors, and application lifecycle stages are logged with appropriate levels (info, warn, error).
		- Include contextual information in logs (e.g., request ID, user ID, relevant data).
		- Review log rotation and storage.

## Optimize Database Performance.
	- Review Mongoose Schemas and Queries:
		- Identify potentially slow queries.
		- Ensure appropriate indexes are defined on Mongoose schemas for fields used in queries (especially for `User`, `Room`, `RoomChat`).
		- Use `lean()` for Read-Only Queries: For queries where Mongoose documents don't need to be modified, use `.lean()` to improve performance.
		- Repeated database queries: 
			- Each chat message handler does `Channel.findOne({ name: socket.room })` and possibly creates/saves a `Channel` and a `Message`.
			- In high-traffic scenarios this can be costly. Consider caching the channel ID for each room or pre-initializing channels to reduce redundant lookups. Also ensure an index on `Channel.name` to speed queries.
	- Unbounded message storage: The code saves every message to MongoDB without limits. Over time this can slow down writes and increase storage costs. Consider batching, time-to-live, or archiving old messages to maintain performance.		

## Implement Caching with Redis.
	- Identify data that can be cached (e.g., user session information, frequently accessed room details, results from external API calls).
    - Use the existing Redis client to implement caching logic for these data points.
    - Develop a cache invalidation strategy.

## Refactor and Modularize Code.
	- Break Down server.js: If server.js is too large, identify sections that can be moved into separate modules (e.g., Socket.io setup, route definitions if not already separated). 
	- Review utils and services: Ensure functions in these directories are well-defined, single-responsibility, and appropriately placed. 
	- Examine Model Logic: Move any business logic currently in routes or server.js into Mongoose models or controller layers where appropriate.

## Enhance API Design and Documentation.
	- Review API Endpoints: Ensure consistency in naming conventions and HTTP method usage.
	- Implement API Documentation:
		- Add Swagger/OpenAPI specification for all API routes.
    	- Use tools like swagger-ui-express to serve the documentation.

## Improve Frontend Code (General Suggestions).
	- Minification and Bundling: Set up a build process (e.g., using Webpack or Parcel) to minify and bundle static assets (JS, CSS) for production.
	- Review Frontend JavaScript: Look for opportunities to improve code structure, reduce redundancy, and enhance performance in client-side JavaScript files.

## Review and Update Dependencies.
	- Run `npm audit` to check for known vulnerabilities in dependencies and update them where possible.
    - Remove any unused dependencies from package.json.

## Create a Controller Layer.
	- Introduced a controller layer (`controllers/` and `controllers/admin/`).
	- Refactored all user-facing and admin routes to use a controller-based architecture, separating business logic from route definitions


---------------------------------------------
## Integrate CSRF Protection in Frontend:
	- In public/js/admin/system-settings.js:
    	- Utilize the getCsrfToken() function (from public/js/utils.js created in a previous step) to fetch the CSRF token when the page loads or before form submission.
    - Modify the submit event listener for the settings form:
    	- Fetch the CSRF token.
    	- Include the token in the POST request to /api/admin/settings. This can be done by adding it to the request headers (e.g., X-CSRF-Token) or as part of the JSON body (e.g., _csrf: token). The csurf middleware on the backend checks both.
    	- Do the same for the "Reset to Defaults" functionality.

## Enhance Frontend UX and Feedback:
	- In public/js/admin/system-settings.js: Loading State:
    	- Show a visual loading indicator (e.g., disable submit button, show spinner) when settings are being loaded and when they are being saved/reset. 
    	- Notifications: Improve the showMessage function or integrate a more robust notification library for displaying success/error messages. 
    	- Button Disabling: Disable the "Save Settings" and "Reset to Defaults" buttons during their respective fetch operations to prevent multiple submissions.


## Implement Client-Side Validation	
    - In public/js/admin/system-settings.js: 
    	- Add basic client-side validation to the form inputs (e.g., check for empty required fields, number ranges) to provide immediate feedback before submitting to the backend. 
    	- This complements the backend Joi validation.

## Refactor "Reset to Defaults" to use Backend Logic:
	- Backend:
    	- Create a new route in routes/admin/settings.js, e.g., POST /api/admin/settings/reset.
    	- Create a new controller function in controllers/admin/appSettingsController.js, e.g., resetAppSettings.
    	- This controller function should:
    		- Fetch the Settings schema default values directly from mongoose.model('Settings').schema.paths.
    		- Update the settings document with these schema defaults.
    		- Invalidate any cache for settings if caching is implemented later.
    		- Return the reset settings. 
   	- Frontend:
    	- In public/js/admin/system-settings.js, change the "Reset to Defaults" button's event listener to call this new /api/admin/settings/reset endpoint (remembering to include CSRF token).
    	- Populate the form with the returned reset settings.

## Review and Update Settings Model and Joi Validation:
	- In backend models/Settings.js: 
		- Review existing fields: maxUsersPerRoom, maxRoomsPerUser, maxMessageLength, messageRateLimit, requireEmailVerification, allowGuestAccess, enableProfanityFilter.
    	- Add any new system settings that have been identified as necessary during the project's evolution. For each new setting, define its type, default value, and any required or min/max constraints. 
    - In backend validators/admin/settingsSchemas.js (updateSettingsSchema):
    	- Update the Joi schema to include validations for any newly added settings fields.
    	- Ensure types and constraints match the Mongoose schema.

## Write Unit and Integration Tests.
	- Identify critical components and business logic (e.g., authentication, chat functionality, API integrations).
    - Write unit tests for individual functions and modules using a testing framework like Jest or Mocha.
    - Write integration tests for API endpoints to ensure different parts of the application work together correctly.


---------------------------------------------
##  Remove client-side JWT validation and instead implement a server-side validation endpoint (Chatcord).
	- In public/js/auth-guard.js between lines 26 and 40, the isTokenValid() method performs JWT validation on the client side, which is insecure and can be manipulated. Remove or minimize client-side JWT validation and instead implement a server-side validation endpoint that verifies the token's authenticity and expiration. Modify the client code to call this server-side endpoint asynchronously to check token validity, handling any errors properly. Also ensure any base64 decoding errors are caught and handled gracefully during this process.

## Large audio is fully buffered into memory – consider streaming.
	- In controllers/voiceController.js around lines 66 to 71, the code uses response.buffer() to fully load large binary audio into memory, which risks high memory usage. To fix this, replace response.buffer() with streaming the response directly to the client for the 'binary' case, using a pipe or stream approach to send data incrementally without buffering it all at once. Keep the existing buffering logic for 'base64' and 'url' response types unchanged.


## Binary API responses are coerced to text during testing.
	- await testResponse.text() converts any audio/binary payload into UTF-8, corrupting data and wasting memory. For responseType === 'binary' or content-type containing audio/, use arrayBuffer() and just report its size.

## Potential XSS vulnerability in dashboard statistics display and notification messages.
	- The updateDashboard function directly injects user data into the DOM using innerHTML without sanitization. If the statistics data from the server contains malicious scripts, it could lead to XSS attacks.

	- The showNotification function directly injects the message parameter into innerHTML without sanitization, which could allow XSS attacks if the message contains malicious content.
	
	- Consider sanitizing the data or using safer DOM manipulation methods. 


