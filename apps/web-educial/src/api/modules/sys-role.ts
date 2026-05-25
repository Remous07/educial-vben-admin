import { requestClient } from '#/api/request';

export async function getSysRoleListApi(params: Record<string, any>) {
  return requestClient.get('/sys/role/list', { params });
}

export async function getSysRoleSelectApi() {
  return requestClient.get('/sys/role/select');
}

export async function getSysRoleApi(roleId: number) {
  return requestClient.get(`/sys/role/info/${roleId}`);
}

export async function createSysRoleApi(data: any) {
  return requestClient.post('/sys/role/save', data);
}

export async function updateSysRoleApi(data: any) {
  return requestClient.post('/sys/role/update', data);
}

export async function deleteSysRoleApi(ids: number[]) {
  return requestClient.post('/sys/role/delete', ids);
}
