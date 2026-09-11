/**
 * 登录态滑动续期。
 *
 * 后端 access token 的有效期同时就是「闲置窗口」（不勾记住我 1 天 / 勾选 30 天）。
 * token 有效期内主动调用 /auth/refresh 会换发一个全新窗口的 token —— 于是
 * 「一直在用」的会话永远不会过期，只有闲置超过窗口才需要重新登录。
 *
 * 触发时机：应用启动时一次 + 可见状态下每 6 小时一次。后台（不可见）标签页
 * 不续期，避免一个挂着的标签页把会话无限延长。
 */
import { useAccessStore } from '@vben/stores';

import { refreshTokenApi } from '#/api/core';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 续期一次（尽力而为：token 已过期/无 token 时静默跳过）。 */
export async function refreshSession(): Promise<void> {
  const accessStore = useAccessStore();
  if (!accessStore.accessToken) {
    return;
  }
  try {
    const newToken = await refreshTokenApi();
    if (newToken) {
      accessStore.setAccessToken(newToken);
    }
  } catch {
    // 闲置超时（token 已过期）或后端不可达——不在此处处理：
    // 下一次真正的请求会走 401 → 登出流程。
  }
}

/** 启动滑动续期：立即一次 + 定时轮询（仅在页面可见时）。 */
export function startSessionKeepAlive(): void {
  void refreshSession();
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      void refreshSession();
    }
  }, REFRESH_INTERVAL_MS);
}
