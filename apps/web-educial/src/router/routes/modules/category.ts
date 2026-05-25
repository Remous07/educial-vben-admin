import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/category/index.vue'),
    meta: { icon: 'lucide:folder-tree', title: '分类管理' },
    name: 'CategoryManage',
    path: '/category',
  },
];

export default routes;
