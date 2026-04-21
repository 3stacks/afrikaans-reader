import { request } from '@playwright/test';

const BASE_URL = 'http://localhost:3456';

export default async function globalSetup() {
  const context = await request.newContext({ baseURL: BASE_URL });

  // Seed targetLanguage setting so e2e tests don't get redirected to /setup
  await context.put('/api/settings/targetLanguage', {
    data: { value: 'af' },
  });

  await context.dispose();
}
