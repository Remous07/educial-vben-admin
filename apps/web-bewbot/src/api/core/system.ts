import { requestClient } from '#/api/request';

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface RoleItem {
  id: number;
  name: string;
  description?: string;
  is_default?: boolean;
  permissions: PermissionItem[];
}

export interface AdminUserItem {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  created_at: null | string;
  conversation_code: null | string;
  is_banned: boolean;
  email_verified: boolean;
  totp_enabled: boolean;
  invite_code: null | string;
  invited_by: null | string;
  is_bound: boolean;
  telegram_id: null | number;
  telegram_first_name: null | string;
  telegram_username: null | string;
  bound_at: null | string;
  telegram_is_premium: boolean;
}

export interface RolePayload {
  name: string;
  description?: string;
  permission_ids: number[];
}

/** 获取所有权限 */
export function getPermissionsApi() {
  return requestClient.get<PermissionItem[]>('/permissions');
}

/** 获取所有角色 */
export function getRolesApi() {
  return requestClient.get<RoleItem[]>('/roles');
}

/** 创建角色 */
export function createRoleApi(payload: RolePayload) {
  return requestClient.post<RoleItem>('/roles', payload);
}

/** 更新角色 */
export function updateRoleApi(id: number, payload: Partial<RolePayload>) {
  return requestClient.put<RoleItem>(`/roles/${id}`, payload);
}

/** 删除角色 */
export function deleteRoleApi(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

/** 获取所有管理员 */
export function getAdminUsersApi() {
  return requestClient.get<AdminUserItem[]>('/admin-users');
}

/** 分配角色 */
export function assignRolesApi(userId: number, roleIds: number[]) {
  return requestClient.put<AdminUserItem>(
    `/admin-users/${userId}/roles`,
    roleIds,
  );
}

/** 封禁系统用户 */
export function banAdminUserApi(id: number) {
  return requestClient.put(`/admin-users/${id}/ban`);
}

/** 解封系统用户 */
export function unbanAdminUserApi(id: number) {
  return requestClient.put(`/admin-users/${id}/unban`);
}

/** 删除系统用户 */
export function deleteAdminUserApi(id: number) {
  return requestClient.delete(`/admin-users/${id}`);
}

/** 获取系统用户详情 */
export function getAdminUserApi(id: number) {
  return requestClient.get<AdminUserItem>(`/admin-users/${id}`);
}

// ── Invite Codes ─────────────────────────────────────

export interface InviteCodeItem {
  id: number;
  code: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: null | string;
  remark: null | string;
  created_at: null | string;
  created_by_username: null | string;
  default_role_id: null | number;
  default_role_name: null | string;
}

export interface AvailableRoleItem {
  id: number;
  name: string;
  description?: string;
}

/** 获取可分配的角色（排除 superadmin） */
export function getAvailableRolesApi() {
  return requestClient.get<AvailableRoleItem[]>(
    '/invite-codes/available-roles',
  );
}

/** 获取邀请码列表 */
export function getInviteCodesApi() {
  return requestClient.get<InviteCodeItem[]>('/invite-codes');
}

/** 生成邀请码 */
export function createInviteCodeApi(payload: {
  default_role_id: number;
  expires_at?: string;
  expires_days?: number;
  max_uses?: number;
  remark?: string;
}) {
  return requestClient.post<InviteCodeItem>('/invite-codes', payload);
}

/** 编辑邀请码 */
export function editInviteCodeApi(
  id: number,
  payload: {
    default_role_id?: number;
    expires_at?: string;
    expires_days?: null | number;
    max_uses: number;
    remark?: string;
  },
) {
  return requestClient.put(`/invite-codes/${id}`, payload);
}

/** 重新激活邀请码 */
export function reactivateInviteCodeApi(id: number) {
  return requestClient.put(`/invite-codes/${id}/reactivate`);
}

/** 撤销邀请码（软删除） */
export function deleteInviteCodeApi(id: number) {
  return requestClient.delete(`/invite-codes/${id}`);
}

/** 永久删除邀请码 */
export function permanentlyDeleteInviteCodeApi(id: number) {
  return requestClient.delete(`/invite-codes/${id}/permanent`);
}

/** 测试用户名审核 */
export function testUsernameAuditApi(username: string) {
  return requestClient.post<{ approved: boolean; reason: string }>(
    '/system-settings/test-audit',
    { username },
  );
}

/** 获取 AI 模型列表 */
export function fetchAiModelsApi(baseUrl: string, apiKey: string) {
  return requestClient.post<string[]>('/system-settings/fetch-ai-models', {
    api_key: apiKey,
    base_url: baseUrl,
  });
}

/** 批量获取系统设置 */
export function getSystemSettingsBatchApi(keys: string[]) {
  return requestClient.get<Record<string, string>>(
    `/system-settings/batch?keys=${keys.join(',')}`,
  );
}

/** 获取系统设置 */
export function getSystemSettingApi(key: string) {
  return requestClient.get<string>(`/system-settings/${key}`);
}

/** 设置系统设置 */
export function setSystemSettingApi(key: string, value: string) {
  return requestClient.put(`/system-settings/${key}`, { value });
}

/** 获取使用指定邀请码的系统用户 */
export function getUsersByInviteCodeApi(codeId: number) {
  return requestClient.get<
    { created_at: null | string; email: string; id: number; username: string }[]
  >(`/admin-users/by-invite-code/${codeId}`);
}
