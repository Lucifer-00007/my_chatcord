## Auto-Reloader (Production)

The application includes an auto-reloader utility to prevent hosting services (like Render) from spinning down due to inactivity.

### Purpose
- Keeps the application active by sending periodic HTTP requests
- Prevents cold starts and service downtime on free hosting tiers
- Maintains consistent availability for users

### Configuration
Add these environment variables to enable auto-reloading:

```env
RENDER_APP_URL=https://your-app-domain.com
APP_RELOAD_INTERVAL=30
```

**Environment Variables:**
- `RENDER_APP_URL`: Your deployed application URL (required for auto-reloader to work)
- `APP_RELOAD_INTERVAL`: Interval in seconds between reload requests (default: 30 seconds)

### Usage
The auto-reloader starts automatically when:
1. `RENDER_APP_URL` is set in environment variables
2. The application is running in production mode
3. Called via `startReloader()` in your server initialization

**Note:** Only enable this for production deployments on services that spin down due to inactivity. Not recommended for local development.