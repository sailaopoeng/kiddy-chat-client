# AWS Amplify Environment Variables Setup

## How to Configure Environment Variables in AWS Amplify

### 1. Via AWS Amplify Console (Web Interface)

1. Go to your AWS Amplify Console
2. Select your app
3. Go to **App settings** → **Environment variables**
4. Add the following environment variables:

```
Key: VITE_API_URL
Value: http://localhost:3001

Key: VITE_API_TIMEOUT  
Value: 30000
```

5. Save and redeploy your application

### 2. Via AWS CLI

```bash
# Set environment variables for your Amplify app
aws amplify put-app \
  --app-id YOUR_APP_ID \
  --environment-variables VITE_API_URL=http://localhost:3001,VITE_API_TIMEOUT=30000

# Or update specific branch environment variables
aws amplify update-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --environment-variables VITE_API_URL=http://localhost:3001,VITE_API_TIMEOUT=30000
```

### 3. Via amplify.yml Build Settings

Add environment variables to your `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
  environment:
    variables:
      VITE_API_URL: http://localhost:3001
      VITE_API_TIMEOUT: 30000
```

## Important Notes

1. **VITE_ Prefix**: All environment variables that need to be accessible in the browser must be prefixed with `VITE_`

2. **Build Time Variables**: Vite environment variables are embedded at build time, not runtime

3. **Security**: Only use `VITE_` prefixed variables for non-sensitive data since they're exposed to the browser

4. **Fallback**: The app has fallback values in case environment variables are not set

## Verification

After deployment, check the browser console for environment variable debug logs:
- Environment check logs will show current MODE, PROD status, and VITE_API_URL value
- API requests will show the full URL being used

## Troubleshooting

If environment variables are not working:

1. Verify the variable names have `VITE_` prefix
2. Check AWS Amplify console for correct variable values
3. Redeploy the application after adding variables
4. Check browser console for debug logs
5. Ensure no typos in variable names
