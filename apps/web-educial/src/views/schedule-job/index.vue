<script lang="ts" setup>
import { h, ref } from 'vue';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createScheduleJobApi,
  deleteScheduleJobApi,
  getScheduleJobApi,
  getScheduleJobListApi,
  getScheduleJobLogApi,
  pauseScheduleJobApi,
  resumeScheduleJobApi,
  runScheduleJobApi,
  updateScheduleJobApi,
} from '#/api/modules/schedule-job';

defineOptions({ name: 'ScheduleJobManage' });

// --- 任务列表 ---
const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const columns = [
  { title: 'ID', dataIndex: 'jobId', width: 60 },
  { title: 'Bean名称', dataIndex: 'beanName', width: 130 },
  { title: '参数', dataIndex: 'params', width: 120, ellipsis: true },
  {
    title: '执行规则',
    dataIndex: 'cronExpression',
    width: 200,
    customRender: ({ text }: any) =>
      h('span', { title: text }, cronToHuman(text)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'green' }, () => '运行中')
        : h(Tag, { color: 'default' }, () => '暂停'),
  },
  { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true },
  {
    title: '操作',
    width: 320,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.jobId) },
          () => '编辑',
        ),
        h(
          Button,
          { size: 'small', onClick: () => handleRun(record.jobId) },
          () => '执行',
        ),
        record.status === 1
          ? h(
              Button,
              { size: 'small', onClick: () => handlePause(record.jobId) },
              () => '暂停',
            )
          : h(
              Button,
              { size: 'small', onClick: () => handleResume(record.jobId) },
              () => '恢复',
            ),
        h(
          Button,
          { size: 'small', onClick: () => handleViewLogs(record.jobId) },
          () => '日志',
        ),
        h(
          Popconfirm,
          { title: '确认删除?', onConfirm: () => handleDelete([record.jobId]) },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getScheduleJobListApi({
      page: page.value,
      limit: pageSize.value,
    });
    const data = res?.page;
    tableData.value = data?.list ?? [];
    total.value = data?.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleRun(jobId: number) {
  try {
    await runScheduleJobApi([jobId]);
    message.success('任务已执行');
    await loadData();
  } catch {
    /* */
  }
}

async function handlePause(jobId: number) {
  try {
    await pauseScheduleJobApi([jobId]);
    message.success('任务已暂停');
    tableData.value = tableData.value.map((item: any) =>
      item.jobId === jobId ? { ...item, status: 0 } : item,
    );
  } catch {
    /* */
  }
}

async function handleResume(jobId: number) {
  try {
    await resumeScheduleJobApi([jobId]);
    message.success('任务已恢复');
    tableData.value = tableData.value.map((item: any) =>
      item.jobId === jobId ? { ...item, status: 1 } : item,
    );
  } catch {
    /* */
  }
}

async function handleDelete(ids: number[]) {
  try {
    await deleteScheduleJobApi(ids);
    message.success('删除成功');
    await loadData();
  } catch {
    /* */
  }
}

// --- 新增/编辑 ---
const modalVisible = ref(false);
const modalTitle = ref('新增任务');
const formData = ref<Record<string, any>>({ status: 1 });
const formRef = ref();

// 调度模式：simple = 可视化选择，advanced = Cron 表达式
const scheduleMode = ref<'simple' | 'advanced'>('simple');
const simpleSchedule = ref({
  frequency: 'every5min' as string,
  minutes: 5,
  hours: 1,
  hour: 3,
  minute: 0,
  weekday: 1,
  monthDay: 1,
});

// 预设选项
const schedulePresets = [
  { label: '每分钟', value: 'everyMin' },
  { label: '每5分钟', value: 'every5min' },
  { label: '每10分钟', value: 'every10min' },
  { label: '每30分钟', value: 'every30min' },
  { label: '每小时', value: 'hourly' },
  { label: '每N小时', value: 'everyNHours' },
  { label: '每N分钟', value: 'everyNMin' },
  { label: '每天固定时间', value: 'daily' },
  { label: '每周固定时间', value: 'weekly' },
  { label: '每月固定时间', value: 'monthly' },
];

function buildCron(): string {
  if (scheduleMode.value === 'advanced') return formData.value.cronExpression || '';
  const s = simpleSchedule.value;
  switch (s.frequency) {
    case 'everyMin': return '0 * * * * ?';
    case 'every5min': return '0 0/5 * * * ?';
    case 'every10min': return '0 0/10 * * * ?';
    case 'every30min': return '0 0/30 * * * ?';
    case 'hourly': return '0 0 * * * ?';
    case 'everyNHours': return `0 0 0/${s.hours} * * ?`;
    case 'everyNMin': return `0 0/${s.minutes} * * * ?`;
    case 'daily': return `0 ${s.minute} ${s.hour} * * ?`;
    case 'weekly': return `0 ${s.minute} ${s.hour} ? * ${s.weekday}`;
    case 'monthly': return `0 ${s.minute} ${s.hour} ${s.monthDay} * ?`;
    default: return '0 0/5 * * * ?';
  }
}

function cronToHuman(cron: string): string {
  if (!cron) return '-';
  const parts = cron.split(/\s+/);
  if (parts.length < 6) return cron;
  const [, min, hour, day, month, week] = parts;
  if (min === '*' && hour === '*' && day === '*' && month === '*' && week === '?') return '每分钟';
  if (min.startsWith('0/') && hour === '*' && day === '*' && month === '*' && week === '?')
    return `每${min.split('/')[1]}分钟`;
  if (min === '0' && hour === '*' && day === '*' && month === '*' && week === '?')
    return '每小时整点';
  if (min === '0' && hour.startsWith('0/') && day === '*' && month === '*' && week === '?')
    return `每${hour.split('/')[1]}小时整点`;
  if (min !== '*' && hour !== '*' && day === '*' && month === '*' && week === '?')
    return `每天 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (min !== '*' && hour !== '*' && day === '*' && month === '*' && week !== '?' && week !== '*') {
    const weekMap: Record<string, string> = { '1': '周日', '2': '周一', '3': '周二', '4': '周三', '5': '周四', '6': '周五', '7': '周六' };
    return `每${weekMap[week] || week} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (min !== '*' && hour !== '*' && day !== '*' && month === '*' && week === '?')
    return `每月${day}日 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  return cron;
}

// 编辑时尝试解析 Cron 回简单模式
function parseCronToSimple(cron: string) {
  if (!cron) { scheduleMode.value = 'simple'; return; }
  const parts = cron.split(/\s+/);
  if (parts.length < 6) { scheduleMode.value = 'advanced'; return; }
  const [, min, hour, day, month, week] = parts;
  if (min === '*' && hour === '*' && day === '*' && month === '*' && week === '?')
    { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'everyMin'; }
  else if (min === '0/5' || min === '0/5') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'every5min'; }
  else if (min === '0/10') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'every10min'; }
  else if (min === '0/30') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'every30min'; }
  else if (min === '0' && hour === '*') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'hourly'; }
  else if (min === '0' && hour.startsWith('0/')) { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'everyNHours'; simpleSchedule.value.hours = parseInt(hour.split('/')[1]); }
  else if (min.startsWith('0/') && hour === '*') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'everyNMin'; simpleSchedule.value.minutes = parseInt(min.split('/')[1]); }
  else if (min !== '*' && hour !== '*' && day === '*' && week === '?') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'daily'; simpleSchedule.value.hour = parseInt(hour); simpleSchedule.value.minute = parseInt(min); }
  else if (min !== '*' && hour !== '*' && week !== '?' && week !== '*') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'weekly'; simpleSchedule.value.hour = parseInt(hour); simpleSchedule.value.minute = parseInt(min); simpleSchedule.value.weekday = parseInt(week); }
  else if (min !== '*' && hour !== '*' && day !== '*' && week === '?') { scheduleMode.value = 'simple'; simpleSchedule.value.frequency = 'monthly'; simpleSchedule.value.hour = parseInt(hour); simpleSchedule.value.minute = parseInt(min); simpleSchedule.value.monthDay = parseInt(day); }
  else { scheduleMode.value = 'advanced'; }
}

function openModal() {
  modalTitle.value = '新增任务';
  formData.value = { status: 1, cronExpression: buildCron() };
  scheduleMode.value = 'simple';
  simpleSchedule.value = { frequency: 'every5min', minutes: 5, hours: 1, hour: 3, minute: 0, weekday: 1, monthDay: 1 };
  modalVisible.value = true;
}

async function handleEdit(jobId: number) {
  modalTitle.value = '编辑任务';
  try {
    const res = await getScheduleJobApi(jobId);
    formData.value = res?.schedule ?? {};
    parseCronToSimple(formData.value.cronExpression || '');
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (scheduleMode.value === 'simple') {
    formData.value.cronExpression = buildCron();
  }
  await (formData.value.jobId
    ? updateScheduleJobApi(formData.value)
    : createScheduleJobApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  await loadData();
}

// --- 日志 ---
const logModalVisible = ref(false);
const logData = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(10);
const logJobId = ref<number>(0);

const logColumns = [
  { title: 'ID', dataIndex: 'logId', width: 60 },
  { title: 'Bean名称', dataIndex: 'beanName', width: 130 },
  { title: '参数', dataIndex: 'params', width: 120, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) =>
      text === 0
        ? h(Tag, { color: 'green' }, () => '成功')
        : h(Tag, { color: 'red' }, () => '失败'),
  },
  { title: '耗时(ms)', dataIndex: 'times', width: 90 },
  { title: '错误信息', dataIndex: 'error', width: 200, ellipsis: true },
  {
    title: '执行时间',
    dataIndex: 'createTime',
    width: 170,
    customRender: ({ text }: any) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
];

async function loadLogs() {
  try {
    const res = await getScheduleJobLogApi({
      page: logPage.value,
      limit: logPageSize.value,
      jobId: logJobId.value,
    });
    const data = res?.page;
    logData.value = data?.list ?? [];
    logTotal.value = data?.totalCount ?? 0;
  } catch {
    /* */
  }
}

function handleViewLogs(jobId: number) {
  logJobId.value = jobId;
  logPage.value = 1;
  logModalVisible.value = true;
  loadLogs();
}

function onLogPageChange(p: number, ps: number) {
  logPage.value = p;
  logPageSize.value = ps;
  loadLogs();
}

loadData();
</script>

<template>
  <Page description="管理系统定时任务" title="定时任务">
    <Card title="任务列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增任务</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="jobId"
        size="middle"
        :scroll="{ x: 1200 }"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          show-size-changer
          @change="onPageChange"
        />
      </div>
    </Card>

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      width="600px"
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item
          label="Bean名称"
          name="beanName"
          :rules="[{ required: true, message: '请输入Spring Bean名称' }]"
        >
          <Input v-model:value="formData.beanName" placeholder="例如 testTask" />
        </Form.Item>

        <Form.Item label="执行规则" name="cronExpression" :rules="[{ required: true, message: '请设置执行规则' }]">
          <div>
            <Radio.Group
              v-model:value="scheduleMode"
              size="small"
              option-type="button"
              button-style="solid"
            >
              <Radio.Button value="simple">可视化</Radio.Button>
              <Radio.Button value="advanced">Cron表达式</Radio.Button>
            </Radio.Group>

            <template v-if="scheduleMode === 'simple'">
              <div class="mt-3 flex items-center gap-2">
                <Select
                  v-model:value="simpleSchedule.frequency"
                  style="flex: 1"
                  size="small"
                  @change="() => (formData.cronExpression = buildCron())"
                >
                  <Select.Option v-for="p in schedulePresets" :key="p.value" :value="p.value">{{ p.label }}</Select.Option>
                </Select>
                <template v-if="simpleSchedule.frequency === 'everyNMin'">
                  <InputNumber v-model:value="simpleSchedule.minutes" :min="1" :max="59" size="small" style="width: 64px" @change="() => (formData.cronExpression = buildCron())" />
                  <span class="text-xs text-gray-400">分钟</span>
                </template>
                <template v-if="simpleSchedule.frequency === 'everyNHours'">
                  <InputNumber v-model:value="simpleSchedule.hours" :min="1" :max="23" size="small" style="width: 64px" @change="() => (formData.cronExpression = buildCron())" />
                  <span class="text-xs text-gray-400">小时</span>
                </template>
              </div>
              <div v-if="['daily','weekly','monthly'].includes(simpleSchedule.frequency)" class="mt-2 flex items-center gap-1">
                <InputNumber v-model:value="simpleSchedule.hour" :min="0" :max="23" size="small" style="width: 52px" @change="() => (formData.cronExpression = buildCron())" />
                <span class="text-gray-400">:</span>
                <InputNumber v-model:value="simpleSchedule.minute" :min="0" :max="59" size="small" style="width: 52px" @change="() => (formData.cronExpression = buildCron())" />
                <Select v-if="simpleSchedule.frequency === 'weekly'" v-model:value="simpleSchedule.weekday" size="small" style="width: 80px" @change="() => (formData.cronExpression = buildCron())">
                  <Select.Option v-for="d in [{v:1,l:'周日'},{v:2,l:'周一'},{v:3,l:'周二'},{v:4,l:'周三'},{v:5,l:'周四'},{v:6,l:'周五'},{v:7,l:'周六'}]" :key="d.v" :value="d.v">{{ d.l }}</Select.Option>
                </Select>
                <template v-if="simpleSchedule.frequency === 'monthly'">
                  <span class="text-xs text-gray-400 ml-1">每月</span>
                  <InputNumber v-model:value="simpleSchedule.monthDay" :min="1" :max="31" size="small" style="width: 56px" @change="() => (formData.cronExpression = buildCron())" />
                  <span class="text-xs text-gray-400">日</span>
                </template>
              </div>
              <div class="mt-2 flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
                <Tag color="blue" size="small">{{ cronToHuman(formData.cronExpression) }}</Tag>
                <code class="text-xs text-gray-400">{{ formData.cronExpression }}</code>
              </div>
            </template>

            <Input
              v-if="scheduleMode === 'advanced'"
              v-model:value="formData.cronExpression"
              placeholder="0 0/5 * * * ?"
            />
          </div>
        </Form.Item>

        <Form.Item label="参数">
          <Input v-model:value="formData.params" placeholder="JSON 参数，可留空" />
        </Form.Item>

        <Form.Item label="备注">
          <Input v-model:value="formData.remark" placeholder="任务描述" />
        </Form.Item>

        <Form.Item label="状态">
          <Radio.Group v-model:value="formData.status" option-type="button" button-style="solid" size="small">
            <Radio.Button :value="1">运行</Radio.Button>
            <Radio.Button :value="0">暂停</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="logModalVisible"
      title="执行日志"
      :footer="null"
      width="900px"
    >
      <Table
        :columns="logColumns"
        :data-source="logData"
        :pagination="false"
        row-key="logId"
        size="small"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="logPage"
          v-model:page-size="logPageSize"
          :total="logTotal"
          show-size-changer
          @change="onLogPageChange"
        />
      </div>
    </Modal>
  </Page>
</template>
