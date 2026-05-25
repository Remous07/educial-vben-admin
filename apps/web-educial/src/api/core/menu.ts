import { requestClient } from '#/api/request';

/**
 * 获取导航菜单列表
 * GET /sys/menu/nav
 * Returns: { menuList: SysMenuEntity[], permissions: string[] }
 */
export async function getMenuNavApi() {
  return requestClient.get<{ menuList: any[]; permissions: string[] }>(
    '/sys/menu/nav',
  );
}
