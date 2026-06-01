import { requestClient } from '#/api/request';

export interface TitleTier {
  title: string;
  min: number;
}

/** 积分配置接口 */
export interface IntegralConfig {
  postCreate: number;
  commentCreate: number;
  postLiked: number;
  postFavorited: number;
  commentLiked: number;
  dailyPostLimit: number;
  dailyCommentLimit: number;
  dailyTotalLimit: number;
  /** 是否全局冻结所有人积分收益 */
  globalFrozen?: boolean;
  /** 头衔档位列表（从高到低） */
  titles?: TitleTier[];
}

/** 获取积分规则配置 */
export async function getIntegralConfigApi() {
  return requestClient.get('/admin/moderation/config/integral');
}

/** 保存积分规则配置 */
export async function saveIntegralConfigApi(config: IntegralConfig) {
  return requestClient.post('/admin/moderation/config/integral', config);
}

/** 管理员调整用户积分（增减，需填写原因） */
export async function adjustUserIntegralApi(data: { uid: number; amount: number; reason: string }) {
  return requestClient.post('/admin/user/integral/adjust', data);
}

/** 管理员直接设置用户积分为目标值（需填写原因） */
export async function setUserIntegralApi(data: { uid: number; targetValue: number; reason: string }) {
  return requestClient.post('/admin/user/integral/set', data);
}

/** 获取指定用户的积分变动流水 */
export async function getUserIntegralLogApi(uid: number, params: Record<string, any> = {}) {
  return requestClient.get(`/admin/user/integral/log/${uid}`, { params });
}
