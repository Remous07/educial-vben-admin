import {
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
  },
});

export const preferencesExtension = definePreferencesExtension({
  tabLabel: 'bewbot.tabLabel',
  title: 'bewbot.title',
  fields: [],
});
