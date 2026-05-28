<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
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
  { title: 'Cron表达式', dataIndex: 'cronExpression', width: 150 },
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

function openModal() {
  modalTitle.value = '新增任务';
  formData.value = { status: 1 };
  modalVisible.value = true;
}

async function handleEdit(jobId: number) {
  modalTitle.value = '编辑任务';
  try {
    const res = await getScheduleJobApi(jobId);
    formData.value = res?.schedule ?? {};
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
  { title: '执行时间', dataIndex: 'createTime', width: 170 },
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
  <Page description="管理Quartz定时任务" title="定时任务">
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
        :scroll="{ x: 1100 }"
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
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item
          label="Bean名称"
          name="beanName"
          :rules="[{ required: true, message: '请输入Spring Bean名称' }]"
        >
          <Input v-model:value="formData.beanName" placeholder="testTask" />
        </Form.Item>
        <Form.Item label="参数" name="params">
          <Input
            v-model:value="formData.params"
            placeholder="JSON参数，可留空"
          />
        </Form.Item>
        <Form.Item
          label="Cron表达式"
          name="cronExpression"
          :rules="[{ required: true, message: '请输入Cron表达式' }]"
        >
          <Input
            v-model:value="formData.cronExpression"
            placeholder="0 0/5 * * * ?"
          />
          <div class="mt-1 text-xs text-gray-400">
            例：0 0/5 * * * ? 每5分钟 | 0 0 3 * * ? 每天3点 | 0 0 0 ? * MON
            每周一
          </div>
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea
            v-model:value="formData.remark"
            placeholder="任务描述"
          />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select v-model:value="formData.status">
            <Select.Option :value="1">运行</Select.Option>
            <Select.Option :value="0">暂停</Select.Option>
          </Select>
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
