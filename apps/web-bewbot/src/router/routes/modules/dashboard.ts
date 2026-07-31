import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      authority: ['superadmin', 'operator'],
      icon: 'lucide:layout-dashboard',
      title: $t('page.dashboard.title'),
      order: 10,
    },
    name: 'Dashboard',
    path: '/dashboard',
  },
];

export default routes;
