import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    accessMode: 'frontend',
    defaultHomePath: '/dashboard',
    name: import.meta.env.VITE_APP_TITLE,
  },
});
