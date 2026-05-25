import { requestClient } from '#/api/request';

/**
 * 菜单列表 (raw List, not wrapped in R)
 * GET /sys/menu/list
 */
export async function getSysMenuListApi() {
  return requestClient.get('/sys/menu/list');
}

export async function getSysMenuSelectApi() {
  return requestClient.get('/sys/menu/select');
}

export async function getSysMenuApi(menuId: number) {
  return requestClient.get(`/sys/menu/info/${menuId}`);
}

export async function createSysMenuApi(data: any) {
  return requestClient.post('/sys/menu/save', data);
}

export async function updateSysMenuApi(data: any) {
  return requestClient.post('/sys/menu/update', data);
}

export async function deleteSysMenuApi(menuId: number) {
  return requestClient.post(`/sys/menu/delete/${menuId}`);
}
