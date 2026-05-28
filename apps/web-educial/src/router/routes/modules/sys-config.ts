import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/oss/index.vue'),
    meta: { icon: 'lucide:hard-drive', title: 'OSS管理' },
    name: 'OssManage',
    path: '/oss',
  },
];

export default routes;
