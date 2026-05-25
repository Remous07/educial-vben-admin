import { requestClient } from '#/api/request';

export async function getSysLogListApi(params: Record<string, any>) {
  return requestClient.get('/sys/log/list', { params });
}
