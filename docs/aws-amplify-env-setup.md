# AWS Amplify Environment Variables Setup

The app needs `VITE_API_URL` at **build time**. If it is missing, `npm run build` stops with an error, so a deploy can never quietly point at `localhost`.

| Variable | Required | Example |
| --- | --- | --- |
| `VITE_API_URL` | Yes | `https://api.your-domain.com` |
| `VITE_API_TIMEOUT` | No (default `30000`) | `30000` |

## 1. Via AWS Amplify Console (recommended)

1. Go to your AWS Amplify Console
2. Select your app
3. Go to **Hosting** → **Environment variables**
4. Add:

```
Key: VITE_API_URL
Value: https://api.your-domain.com

Key: VITE_API_TIMEOUT        (optional)
Value: 30000
```

5. Save and redeploy your application

## 2. Via AWS CLI

```bash
# For the whole app
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables VITE_API_URL=https://api.your-domain.com,VITE_API_TIMEOUT=30000

# Or for one branch
aws amplify update-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --environment-variables VITE_API_URL=https://api.your-domain.com,VITE_API_TIMEOUT=30000
```

## Build settings

`amplify.yml` in the repository root installs dependencies, prints the API URL being used, and builds into `dist/`. It deliberately does **not** set a default `VITE_API_URL`; set it in the console as above.

## Important Notes

1. **`VITE_` prefix**: only variables starting with `VITE_` reach the browser code.
2. **Build time, not runtime**: values are baked into the bundle when it is built. After changing a variable, redeploy.
3. **Not secret**: anyone can read these values in the browser, so never put API keys or passwords in them.
4. **CORS**: in production the browser calls `VITE_API_URL` directly, so the backend must allow your Amplify domain.

## Troubleshooting

- **Build fails with "VITE_API_URL is not set"**: add the variable in the Amplify console and redeploy.
- **App shows "I can't connect to my brain right now!"**: check that the URL in the build log ("Building against API at ...") is correct and reachable, uses `https`, and that the backend allows your domain (CORS).
- **Changes don't show up**: redeploy after changing variables.
