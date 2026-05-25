import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      icon: 'lucide:layout-dashboard',
      title: $t('page.dashboard'),
    },
    name: 'Dashboard',
    path: '/dashboard',
  },
];

export default routes;
