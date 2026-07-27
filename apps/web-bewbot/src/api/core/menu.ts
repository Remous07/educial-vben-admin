import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/** 获取所有菜单 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/menu/all');
}
