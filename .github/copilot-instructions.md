# Copilot Instructions for ChatCord

## General Coding Practices
- Avoid code repetition or duplication across the backend and frontend (HTML, CSS, and JavaScript). Extract reusable logic into functions, partials, or modules.
- Always use `config/constants.js` to store constant values. Follow the existing structure of the file. Do not hardcode values in the codebase.
- When adding a new feature or refactoring, ensure existing functionality remains unaffected. Use best practices and tools to avoid regressions.
- Remove or replace deprecated or unused code to maintain a clean and efficient codebase.
- Reuse components, logic, and styles where possible to reduce redundancy and promote maintainability.

---

## Project Architecture
- **Layer by components**: Separate routes/controllers, services, and data-access layers (models) to maintain a clean architecture.
- **Environment configs**: Centralize config settings using `config/constants.js`; avoid direct usage of environment variables elsewhere.

---

## Backend: Node.js + Express
- Use **CommonJS** syntax for consistency (`require/module.exports`).
- Prefer `async/await` with `try/catch` for async flows. Always propagate errors using `next(err)` in Express.
- Validate inputs using Joi or built-in Mongoose validators.
- Include meaningful JSDoc comments for all exported functions and methods.
- Sanitize and escape user input in routes and socket events to prevent injection and XSS.

---

## Mongoose Models
- Define `required`, `unique`, and `indexed` fields in schemas.
- Always call `Model.init()` to build indexes properly.
- Avoid placing business logic inside models; use service layers for logic-heavy operations.
- Use custom validators for domain-specific rules.

---

## Real-Time: Socket.IO
- Authenticate clients using `io.use()` middleware.
- Define and organize event handlers in dedicated modules (e.g., `socketHandlers.js`).
- Validate all emitted data, sanitize user input, and avoid broadcasting raw messages.
- Prepare for Redis-based scaling using socket adapters if necessary.

---

## Security Best Practices
- Use `helmet` for setting secure HTTP headers.
- Apply rate-limiting to all routes to prevent brute-force attacks.
- Always read secrets from `process.env` (e.g., JWT secrets, DB credentials).
- Secure cookies with `httpOnly`, `secure`, and appropriate `sameSite` settings.
- Verify JWTs on both HTTP and WebSocket connections.

---

## Frontend: HTML
- Follow the [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html#HTML).
- Use semantic tags (`<header>`, `<main>`, `<nav>`, etc.) to improve accessibility and SEO.
- Always include `alt` text on images and use appropriate ARIA labels.
- Ensure proper heading structure (`h1 → h2 → h3`).
- Avoid inline styles; use external CSS or classes.
- Use HTML validation tools to maintain syntax quality.

---

## Frontend: CSS
- Follow BEM naming convention or a consistent naming strategy.
- Follow the [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html#CSS).
- Keep selectors modular and scoped to avoid conflicts.
- Group related properties and use shorthand (e.g., `margin: 0 auto;`).
- Avoid `!important` unless absolutely necessary.
- Use CSS variables or constants for colors and spacing.
- Minimize duplication by reusing utility classes and styles.

---

## Frontend: JavaScript
- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).
- Declare variables using `const` and `let`; avoid `var`.
- Write pure, modular functions and keep logic separated from DOM manipulation where possible.
- Document functions with JSDoc comments for maintainability.
- Use event delegation for handling multiple similar DOM events.
- Avoid using deprecated or obsolete methods.

---

## Testing
- Write unit tests for services and utility functions.
- Test Mongoose schema validations and indexes.
- Include integration tests for Express endpoints using Supertest.
- Mock external services and database calls in tests.

---

## Performance
- Avoid blocking operations in the request lifecycle.
- Compress HTTP responses and cache static files with appropriate headers.
- Consider caching frequent DB queries in Redis.

---

## Logging & Monitoring
- Use structured logging libraries (e.g., Winston or Pino).
- Include correlation/request IDs in logs for traceability.

---

## Code Refactoring

When asked to refactor a code file, folder, or the entire codebase, apply the following rules:

- **Eliminate Duplication**  
  Avoid code repetition or duplication in both backend and frontend (HTML, CSS, JavaScript). Extract common logic into reusable functions, classes, or components (DRY principle).

- **Centralize Constants**  
  Always store constant values in `config/constants.js`, adhering to its existing structure. Never hardcode values in your code.

- **Non-Disruptive Changes**  
  When introducing a new flow or refactoring, ensure existing functionality remains unaffected by writing regression tests and using feature flags or branching.

- **Remove Dead Code**  
  Delete or replace deprecated, unused functions, and files. Confirm removals via tests to ensure nothing breaks.

- **Maximize Reuse**  
  Refactor to reuse existing modules, components, and utilities wherever possible to reduce maintenance overhead.

- **Syntax & Style Corrections**  
  Fix syntax issues and conform to project style guides (e.g., Airbnb JS, BEM for CSS). Use linters (ESLint, Stylelint) with auto-fix enabled.

- **Clean Up Files**  
  Remove duplicate or obsolete code files. Ensure folder structure remains logical and intuitive.

- **Enhance Security**  
  During refactor, revisit authentication, authorization, input validation, and output encoding to close any potential vulnerabilities.

- **Maintain and Measure Test Coverage**  
  Ensure you have an exhaustive suite of automated tests before refactoring, and track code-coverage metrics to verify no regressions are introduced during the process.

- **Preserve Backward Compatibility & Versioning**  
  Treat refactors as patch-level changes under Semantic Versioning when public APIs remain unchanged. If internal behavior changes require a version bump, follow SemVer rules to communicate those changes to consumers.

- **Automate Vulnerability Scanning**  
  Run `npm audit` (or Snyk/Dependabot) in CI and fail the build on high- or critical-severity findings; address or explicitly triage all vulnerabilities as part of the refactor.

- **Keep Dependencies Up-to-Date**  
  Regularly update third-party libraries and leverage the GitHub Advisory Database (Dependabot) so that your refactored code never relies on obsolete or insecure versions.

- **Update Documentation & READMEs**  
  After structural changes, refactor in-code comments, README sections, and any design docs to reflect new module locations, APIs, and usage examples.

- **Advanced Logging Practices**  
  Abstract your logging behind a facade or plugin framework; avoid logging inside loops and ensure all log statements include correlation IDs for traceability.

- **Benchmark Performance Impacts**  
  Before/after refactor, capture key performance metrics (e.g. response times, DB query counts) to prove that your changes meet or exceed previous benchmarks.

- **Refactor in Small, Safe Increments**  
  Break large refactors into minimal, reviewable pull requests—apply the Red-Green-Refactor cycle and validate each step with passing tests to reduce risk.

- **Adopt a Clear Branching Strategy**  
  Create a dedicated “refactor” feature branch off `main`, merge incrementally, and integrate frequently (feature-branch or trunk-based models) to avoid long-lived diverging branches.

- **Refactor Report**  
  At completion, generate a `refactor_report.md` report that includes:  
  1. **Summary of Changes** – high-level overview  
  2. **Detailed Changes** – list of files modified, functions extracted, tests added/removed  
  3. **Suggested Improvements** – further enhancements or areas needing attention  
  4. **Regression Results** – confirmation that existing tests pass and new tests cover refactored code

---

## Update README.md Rule

When instructing the agent to update the `README.md` file, it must perform an automated, end-to-end comparison between the existing documentation and the live codebase, then reconcile any differences. Specifically:

1. **Full Diff Analysis**  
   - Load the current `README.md` and parse its sections: headings, code examples, configuration tables, API listings, etc.  
   - Traverse the entire source tree (all folders/files) to extract actual module names, function signatures, CLI commands, environment variables, and usage examples.  
   - Compute a diff mapping documented items to code artifacts, identifying additions, removals, renames, and signature changes.  

2. **Targeted In-Place Updates**  
   - For each discrepancy, update only the affected fragment in `README.md`.  
   - If a function or module was renamed or moved, update its name/path in the docs.  
   - If a new feature or CLI flag exists, append a new entry in the appropriate section.  
   - If a feature was removed or deprecated, remove or annotate its doc entry.  
   - Preserve all unrelated prose, formatting, badges, and user-written examples.  

3. **Automated Validation**  
   - Execute every code snippet, sample command, and API example in the updated README to ensure they run without error.  
   - Validate hyperlinks within the README (to files, sections, external URLs) and correct any broken links.  

4. **Atomic Documentation Commit**  
   - Include README changes in the **same pull request** as the code changes that created drift.  
   - In the PR description, add a “Documentation Updates” subsection that lists each README fragment changed, with before/after summaries.  

5. **Review Checklist**  
   - Confirm Markdown syntax validity (headings, lists, tables, code blocks). 
   - Ensure any new endpoints or socket events are reflected in the API or Usage Examples section.  
   - Check that badges (build status, coverage) remain accurate and link to the correct endpoints.

## Commit Message Guidelines
- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  - Format: `<type>(<scope>): <description>`
  - Example: `feat(auth): add JWT-based login`
- Use types like `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Keep subject lines under 50 characters; wrap body lines at 72.
- Link related issues and mention breaking changes.

---

## Pull Requests
- PR title should follow Conventional Commit format.
- PR description should include:
  - **What** changed
  - **Why** it changed
  - **How to test** it
- Link related issues and mention required migrations (if any).
