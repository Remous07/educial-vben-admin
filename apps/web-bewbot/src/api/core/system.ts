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
  roles: string[];
  permissions: string[];
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
