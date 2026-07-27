import {
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    companyName: 'Bewbot',
    companyLink: 'https://bewbot.lik.li',
    enable: false,
    icp: '',
    icpLink: '',
  },
});

export const preferencesExtension = definePreferencesExtension({
  tabLabel: 'bewbot.tabLabel',
  title: 'bewbot.title',
  fields: [],
});
