import { requestClient } from '#/api/request';

export interface AuditOperationItem {
  id: number;
  admin_username: null | string;
  action: string;
  action_label: string;
  detail: null | string;
  ip: null | string;
  country: null | string;
  created_at: null | string;
}

export interface RuntimeLogItem {
  id: number;
  level: string;
  logger: string;
  message: string;
  created_at: null | string;
}

export interface AuditListResponse<T> {
  items: T[];
  total: number;
}

export interface RetentionConfig {
  audit_days: number;
  log_days: number;
}

export interface AuditStats {
  operation_total: number;
  operation_today: number;
  log_total: number;
  log_error: number;
}

/** 日志审计统计（顶部卡片） */
export function getAuditStatsApi() {
  return requestClient.get<AuditStats>('/audit/stats');
}

/** 操作记录列表 */
export function getAuditOperationsApi(params: {
  action?: string;
  admin_username?: string;
  end?: string;
  limit?: number;
  offset?: number;
  start?: string;
}) {
  return requestClient.get<AuditListResponse<AuditOperationItem>>(
    '/audit/operations',
    { params },
  );
}

/** 运行日志列表 */
export function getRuntimeLogsApi(params: {
  end?: string;
  level?: string;
  limit?: number;
  offset?: number;
  start?: string;
}) {
  return requestClient.get<AuditListResponse<RuntimeLogItem>>(
    '/audit/runtime-logs',
    { params },
  );
}

/** 获取日志保留天数 */
export function getAuditRetentionApi() {
  return requestClient.get<RetentionConfig>('/audit/retention');
}

/** 设置日志保留天数 */
export function setAuditRetentionApi(payload: RetentionConfig) {
  return requestClient.put('/audit/retention', payload);
}

/** 一键清空操作记录 */
export function clearAuditOperationsApi() {
  return requestClient.delete('/audit/operations');
}

/** 一键清空运行日志 */
export function clearRuntimeLogsApi() {
  return requestClient.delete('/audit/runtime-logs');
}
