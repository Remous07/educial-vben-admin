import { requestClient } from '#/api/request';

export async function getPostListApi(params: Record<string, any>) {
  return requestClient.get('/admin/post/list', { params });
}

export async function getPostApi(id: number) {
  return requestClient.get(`/admin/post/info/${id}`);
}

export async function createPostApi(data: any) {
  return requestClient.post('/admin/post/save', data);
}

export async function updatePostApi(data: any) {
  return requestClient.post('/admin/post/update', data);
}

export async function deletePostApi(ids: number[]) {
  return requestClient.post('/admin/post/delete', ids);
}

export async function upPostApi(ids: number[]) {
  return requestClient.post('/admin/post/up', ids);
}

export async function downPostApi(ids: number[]) {
  return requestClient.post('/admin/post/down', ids);
}
