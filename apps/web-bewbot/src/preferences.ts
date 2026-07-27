import {
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    accessMode: 'backend',
    name: import.meta.env.VITE_APP_TITLE,
  },
});

export const preferencesExtension = definePreferencesExtension({
  tabLabel: 'bewbot.tabLabel',
  title: 'bewbot.title',
  fields: [],
});
