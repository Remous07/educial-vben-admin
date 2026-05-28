import { requestClient } from '#/api/request';

// --- 定时任务 ---
export async function getScheduleJobListApi(params: Record<string, any>) {
  return requestClient.get('/sys/schedule/list', { params });
}

export async function getScheduleJobApi(jobId: number) {
  return requestClient.get(`/sys/schedule/info/${jobId}`);
}

export async function createScheduleJobApi(data: any) {
  return requestClient.post('/sys/schedule/save', data);
}

export async function updateScheduleJobApi(data: any) {
  return requestClient.post('/sys/schedule/update', data);
}

export async function deleteScheduleJobApi(ids: number[]) {
  return requestClient.post('/sys/schedule/delete', ids);
}

export async function runScheduleJobApi(ids: number[]) {
  return requestClient.post('/sys/schedule/run', ids);
}

export async function pauseScheduleJobApi(ids: number[]) {
  return requestClient.post('/sys/schedule/pause', ids);
}

export async function resumeScheduleJobApi(ids: number[]) {
  return requestClient.post('/sys/schedule/resume', ids);
}

// --- 执行日志 ---
export async function getScheduleJobLogApi(params: Record<string, any>) {
  return requestClient.get('/sys/scheduleLog/list', { params });
}
