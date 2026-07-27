import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    accessToken: string;
  }

  export interface RegisterParams {
    email: string;
    invite_code: string;
    password: string;
    username: string;
  }

  export interface RegisterResult {
    message: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/** 登录 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/** TOTP 二次验证登录 */
export async function loginTotpApi(tempToken: string, totpCode: string) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login-totp', {
    temp_token: tempToken,
    totp_code: totpCode,
  });
}

/** TOTP 状态 */
export async function getTotpStatusApi() {
  return requestClient.get<{ enabled: boolean }>('/account/totp/status');
}

/** TOTP 设置 - 生成密钥 */
export async function totpSetupApi() {
  return requestClient.post<{ secret: string; uri: string }>(
    '/account/totp/setup',
  );
}

/** TOTP 启用 - 验证并开启 */
export async function totpEnableApi(code: string) {
  return requestClient.post('/account/totp/enable', { code });
}

/** TOTP 禁用 - 验证并关闭 */
export async function totpDisableApi(code: string) {
  return requestClient.post('/account/totp/disable', { code });
}

/** 修改邮箱 */
export async function changeEmailApi(
  currentPassword: string,
  newEmail: string,
) {
  return requestClient.post('/account/change-email', {
    current_password: currentPassword,
    new_email: newEmail,
  });
}

/** Telegram 绑定状态 */
export async function getTelegramBindStatusApi() {
  return requestClient.get<{
    bound: boolean;
    telegram_id: number | null;
    telegram_first_name: string | null;
    telegram_username: string | null;
  }>('/account/bind-telegram/status');
}

/** Telegram 绑定 - 生成绑定密钥 */
export async function setupTelegramBindApi() {
  return requestClient.post<{ key: string }>(
    '/account/bind-telegram/setup',
  );
}

/** Telegram 解绑 */
export async function unbindTelegramApi() {
  return requestClient.post('/account/bind-telegram/unbind');
}

/** 修改密码 */
export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
  totpCode?: string,
) {
  return requestClient.post('/account/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    totp_code: totpCode,
  });
}

/** 注册 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return requestClient.post<AuthApi.RegisterResult>('/auth/register', data);
}

/** 刷新 token */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/** 退出登录 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', {
    withCredentials: true,
  });
}

/** 获取用户权限码 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}

/** 忘记密码 — 发送重置邮件 */
export async function forgotPasswordApi(data: {
  email: string;
  turnstile_token?: string;
}) {
  return requestClient.post('/auth/forgot-password', data);
}

/** 重置密码 */
export async function resetPasswordApi(data: {
  new_password: string;
  token: string;
}) {
  return requestClient.post('/auth/reset-password', data);
}
