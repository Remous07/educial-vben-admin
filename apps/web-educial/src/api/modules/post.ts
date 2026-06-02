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

export async function downPostApi(data: { ids: number[]; reason?: string }) {
  return requestClient.post('/admin/post/down', data);
}

export async function topPostApi(id: number) {
  return requestClient.post(`/admin/post/top/${id}`);
}

export async function untopPostApi(id: number) {
  return requestClient.post(`/admin/post/untop/${id}`);
}

// 批量置顶 / 取消置顶 (后端支持)
export async function batchTopPostApi(ids: number[]) {
  return requestClient.post('/admin/post/top', ids);
}

export async function batchUntopPostApi(ids: number[]) {
  return requestClient.post('/admin/post/untop', ids);
}

export interface PostStats {
  postId: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  readCount: number;
}

export async function getPostStatsApi(id: number) {
  return requestClient.get(`/admin/post/stats/${id}`);
}

export async function batchPostStatsApi(ids: number[]) {
  return requestClient.post('/admin/post/stats/batch', ids);
}

// --- 热门配置 ---
export interface HotConfig {
  readThreshold: number;
  likeThreshold: number;
  commentThreshold: number;
  favoriteThreshold: number;
}

export async function getHotConfigApi() {
  return requestClient.get('/admin/post/config/hot');
}

export async function saveHotConfigApi(config: HotConfig) {
  return requestClient.post('/admin/post/config/hot', config);
}
