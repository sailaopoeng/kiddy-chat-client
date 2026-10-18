import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Reads .env files plus real environment variables (e.g. from AWS Amplify).
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL

  // A production build without an API URL would ship an app that can't talk to
  // anything, so stop the build instead.
  if (command === 'build' && !apiUrl) {
    throw new Error(
      'VITE_API_URL is not set. Add it to .env for local builds, or under ' +
        'Hosting > Environment variables in the AWS Amplify console.'
    )
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Development only: forward /api/* to the backend to avoid CORS issues.
        '/api': {
          target: apiUrl || 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      environment: 'node',
    },
  }
})
