import { requestClient } from '#/api/request';

export async function getModerationLogApi(params: Record<string, any>) {
  return requestClient.get('/admin/moderation/log/list', { params });
}

export async function getModerationConfigApi() {
  return requestClient.get('/admin/moderation/config');
}

export async function setModerationConfigApi(mode?: string, attachmentMode?: string, autoBan?: boolean) {
  const body: Record<string, any> = {};
  if (mode !== undefined) body.mode = mode;
  if (attachmentMode !== undefined) body.attachmentMode = attachmentMode;
  if (autoBan !== undefined) body.autoBan = autoBan;
  return requestClient.post('/admin/moderation/config', body);
}

export async function manualReviewApi(data: { targetType: string; targetId: number; result: number; reason?: string }) {
  return requestClient.post('/admin/moderation/manual-review', data);
}

export async function getAiConfigApi() {
  return requestClient.get('/admin/moderation/config/ai');
}

export async function saveAiConfigApi(data: { apiKey?: string; apiUrl?: string; model?: string }) {
  return requestClient.post('/admin/moderation/config/ai', data);
}

export async function getTencentConfigApi() {
  return requestClient.get('/admin/moderation/config/tencent');
}

export async function saveTencentConfigApi(data: { secretId?: string; secretKey?: string; region?: string; bizType?: string }) {
  return requestClient.post('/admin/moderation/config/tencent', data);
}

export async function getSmsConfigApi() {
  return requestClient.get('/admin/moderation/config/sms');
}

export async function saveSmsConfigApi(data: {
  secretId?: string;
  secretKey?: string;
  sdkAppId?: string;
  signName?: string;
  templateId?: string;
  region?: string;
  dailyLimit?: number;
  enabled?: boolean;
}) {
  return requestClient.post('/admin/moderation/config/sms', data);
}
