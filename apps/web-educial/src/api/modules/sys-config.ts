import { requestClient } from '#/api/request';

export async function getSysConfigListApi(params: Record<string, any>) {
  return requestClient.get('/sys/config/list', { params });
}

export async function getSysConfigApi(id: number) {
  return requestClient.get(`/sys/config/info/${id}`);
}

export async function createSysConfigApi(data: any) {
  return requestClient.post('/sys/config/save', data);
}

export async function updateSysConfigApi(data: any) {
  return requestClient.post('/sys/config/update', data);
}

export async function deleteSysConfigApi(ids: number[]) {
  return requestClient.post('/sys/config/delete', ids);
}
