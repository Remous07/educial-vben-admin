import { requestClient } from '#/api/request';

export async function getCommentListApi(params: Record<string, any>) {
  return requestClient.get('/admin/comment/list', { params });
}

export async function getCommentApi(id: number) {
  return requestClient.get(`/admin/comment/info/${id}`);
}

export async function createCommentApi(data: any) {
  return requestClient.post('/admin/comment/save', data);
}

export async function updateCommentApi(data: any) {
  return requestClient.post('/admin/comment/update', data);
}

export async function deleteCommentApi(ids: number[]) {
  return requestClient.post('/admin/comment/delete', ids);
}

export async function upCommentApi(ids: number[]) {
  return requestClient.post('/admin/comment/up', ids);
}

export async function downCommentApi(ids: number[]) {
  return requestClient.post('/admin/comment/down', ids);
}
