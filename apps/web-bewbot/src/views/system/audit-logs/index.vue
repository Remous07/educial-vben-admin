<script lang="ts" setup>
import type { AuditOperationItem, RuntimeLogItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  clearAuditOperationsApi,
  clearRuntimeLogsApi,
  getAuditOperationsApi,
  getAuditRetentionApi,
  getRuntimeLogsApi,
  setAuditRetentionApi,
} from '#/api/core';

defineOptions({ name: 'AuditLogs' });

const ACTION_OPTIONS = [
  { label: '登录', value: 'auth.login' },
  { label: '登录失败', value: 'auth.login.failed' },
  { label: '两步验证登录', value: 'auth.login_totp' },
  { label: '登出', value: 'auth.logout' },
  { label: '注册账号', value: 'auth.register' },
  { label: '拉黑 TG 用户', value: 'user.ban' },
  { label: '解除拉黑 TG 用户', value: 'user.unban' },
  { label: '删除 TG 用户', value: 'user.delete' },
  { label: '封禁系统用户', value: 'admin.ban' },
  { label: '解封系统用户', value: 'admin.unban' },
  { label: '删除系统用户', value: 'admin.delete' },
  { label: '分配角色', value: 'admin.roles' },
  { label: '邀请码操作', value: 'invite.create' },
  { label: '识别码操作', value: 'code.create' },
  { label: '修改系统设置', value: 'settings.update' },
  { label: '修改密码', value: 'profile.password' },
  { label: '两步验证', value: 'profile.totp_enable' },
];

const LEVEL_OPTIONS = [
  { label: 'INFO', value: 'INFO' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' },
  { label: 'CRITICAL', value: 'CRITICAL' },
];

function levelColor(level: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'magenta',
    DEBUG: 'default',
    ERROR: 'red',
    INFO: 'blue',
    WARNING: 'orange',
  };
  return map[level] || 'default';
}

function toLocalIso(d?: dayjs.Dayjs): string | undefined {
  return d ? d.format('YYYY-MM-DDTHH:mm:ss') : undefined;
}

function flagEmoji(code: null | string): string {
  if (!code || code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
    return '';
  }
  // Regional indicator symbol: 0x1F1E6 - 'A'(65) = 127397
  return String.fromCodePoint(
    ...[...code].map((c) => 127_397 + (c.codePointAt(0) ?? 0)),
  );
}

// ── retention config ───────────────────────────────────

const auditDays = ref(90);
const logDays = ref(7);
const savingRetention = ref(false);

async function fetchRetention() {
  const r = await getAuditRetentionApi();
  auditDays.value = r.audit_days;
  logDays.value = r.log_days;
}

async function saveRetention() {
  savingRetention.value = true;
  try {
    await setAuditRetentionApi({
      audit_days: auditDays.value,
      log_days: logDays.value,
    });
    message.success('保留天数已更新');
  } catch {
    // error handled by interceptor
  } finally {
    savingRetention.value = false;
  }
}

// ── operation audit tab ────────────────────────────────

const operations = ref<AuditOperationItem[]>([]);
const opLoading = ref(false);
const opTotal = ref(0);
const opPage = ref(1);
const opPageSize = ref(20);
const opAction = ref<string | undefined>(undefined);
const opUsername = ref('');
const opRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

const opColumns = [
  { title: '时间', dataIndex: 'created_at', key: 'time', width: 180 },
  {
    title: '操作人',
    dataIndex: 'admin_username',
    key: 'admin_username',
    width: 120,
  },
  {
    title: '动作',
    dataIndex: 'action_label',
    key: 'action',
    width: 150,
    customRender: ({ text }: { text: string }) =>
      h(Tag, { color: 'blue' }, () => text),
  },
  { title: '详情', dataIndex: 'detail', key: 'detail', ellipsis: true },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
  {
    title: '国家',
    dataIndex: 'country',
    key: 'country',
    width: 90,
    customRender: ({ text }: { text: null | string }) =>
      text ? `${flagEmoji(text)} ${text}` : '-',
  },
];

async function fetchOperations() {
  opLoading.value = true;
  try {
    const resp = await getAuditOperationsApi({
      offset: (opPage.value - 1) * opPageSize.value,
      limit: opPageSize.value,
      action: opAction.value,
      admin_username: opUsername.value.trim() || undefined,
      start: toLocalIso(opRange.value?.[0]),
      end: toLocalIso(opRange.value?.[1]),
    });
    operations.value = resp.items;
    opTotal.value = resp.total;
  } finally {
    opLoading.value = false;
  }
}

function onOpSearch() {
  opPage.value = 1;
  fetchOperations();
}

function onOpReset() {
  opUsername.value = '';
  opAction.value = undefined;
  opRange.value = undefined;
  onOpSearch();
}

async function handleClearOperations() {
  await clearAuditOperationsApi();
  message.success('已清空操作记录');
  onOpSearch();
}

async function handleClearLogs() {
  await clearRuntimeLogsApi();
  message.success('已清空运行日志');
  onLogSearch();
}

function onOpTableChange(pag: any) {
  opPage.value = pag.current || 1;
  opPageSize.value = pag.pageSize || 20;
  fetchOperations();
}

// ── runtime log tab ────────────────────────────────────

const logs = ref<RuntimeLogItem[]>([]);
const logLoading = ref(false);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(50);
const logLevel = ref<string | undefined>(undefined);
const logRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | undefined>(undefined);

const logColumns = [
  { title: '时间', dataIndex: 'created_at', key: 'time', width: 180 },
  {
    title: '级别',
    dataIndex: 'level',
    key: 'level',
    width: 100,
    customRender: ({ text }: { text: string }) =>
      h(Tag, { color: levelColor(text) }, () => text),
  },
  { title: '来源', dataIndex: 'logger', key: 'logger', width: 200 },
  { title: '消息', dataIndex: 'message', key: 'message' },
];

async function fetchLogs() {
  logLoading.value = true;
  try {
    const resp = await getRuntimeLogsApi({
      offset: (logPage.value - 1) * logPageSize.value,
      limit: logPageSize.value,
      level: logLevel.value,
      start: toLocalIso(logRange.value?.[0]),
      end: toLocalIso(logRange.value?.[1]),
    });
    logs.value = resp.items;
    logTotal.value = resp.total;
  } finally {
    logLoading.value = false;
  }
}

function onLogSearch() {
  logPage.value = 1;
  fetchLogs();
}

function onLogTableChange(pag: any) {
  logPage.value = pag.current || 1;
  logPageSize.value = pag.pageSize || 50;
  fetchLogs();
}

function formatTime(v: null | string): string {
  return v ? new Date(v).toLocaleString('zh-CN') : '-';
}

onMounted(() => {
  fetchRetention();
  fetchOperations();
  fetchLogs();
});
</script>

<template>
  <Page>
    <!-- Retention config -->
    <Card style="margin-bottom: 16px">
      <div
        style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center"
      >
        <Space>
          <span style="font-size: 13px; color: #666">操作记录保留</span>
          <InputNumber v-model:value="auditDays" :min="1" :max="3650" />
          <span style="font-size: 13px; color: #666">天</span>
        </Space>
        <Space>
          <span style="font-size: 13px; color: #666">运行日志保留</span>
          <InputNumber v-model:value="logDays" :min="1" :max="3650" />
          <span style="font-size: 13px; color: #666">天</span>
        </Space>
        <Button
          type="primary"
          :loading="savingRetention"
          @click="saveRetention"
        >
          保存
        </Button>
      </div>
    </Card>

    <Tabs default-active-key="operations">
      <!-- Operation records -->
      <Tabs.TabPane key="operations" tab="操作记录">
        <Space style="flex-wrap: wrap; margin-bottom: 16px">
          <Input
            v-model:value="opUsername"
            placeholder="按操作人搜索"
            allow-clear
            style="width: 160px"
            @press-enter="onOpSearch"
          />
          <Select
            v-model:value="opAction"
            placeholder="动作类型"
            allow-clear
            style="width: 180px"
            :options="ACTION_OPTIONS"
            @change="onOpSearch"
          />
          <DatePicker.RangePicker
            v-model:value="opRange"
            :allow-clear="true"
            @change="onOpSearch"
          />
          <Button type="primary" @click="onOpSearch">查询</Button>
          <Button @click="onOpReset">重置</Button>
          <Popconfirm
            title="确定清空全部操作记录？"
            description="此操作不可恢复"
            ok-text="清空"
            ok-type="danger"
            cancel-text="取消"
            @confirm="handleClearOperations"
          >
            <Button danger>清空</Button>
          </Popconfirm>
        </Space>

        <Table
          :columns="opColumns"
          :data-source="operations"
          :loading="opLoading"
          :pagination="{
            current: opPage,
            pageSize: opPageSize,
            total: opTotal,
            showTotal: (t: number) => `共 ${t} 条`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }"
          row-key="id"
          @change="onOpTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              {{ formatTime((record as AuditOperationItem).created_at) }}
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <!-- Runtime logs -->
      <Tabs.TabPane key="runtime" tab="运行日志">
        <Space style="flex-wrap: wrap; margin-bottom: 16px">
          <Select
            v-model:value="logLevel"
            placeholder="日志级别"
            allow-clear
            style="width: 150px"
            :options="LEVEL_OPTIONS"
            @change="onLogSearch"
          />
          <DatePicker.RangePicker
            v-model:value="logRange"
            :allow-clear="true"
            @change="onLogSearch"
          />
          <Button type="primary" @click="onLogSearch">查询</Button>
          <Popconfirm
            title="确定清空全部运行日志？"
            description="此操作不可恢复"
            ok-text="清空"
            ok-type="danger"
            cancel-text="取消"
            @confirm="handleClearLogs"
          >
            <Button danger>清空</Button>
          </Popconfirm>
        </Space>

        <Table
          :columns="logColumns"
          :data-source="logs"
          :loading="logLoading"
          :pagination="{
            current: logPage,
            pageSize: logPageSize,
            total: logTotal,
            showTotal: (t: number) => `共 ${t} 条`,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
          }"
          row-key="id"
          @change="onLogTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              {{ formatTime((record as RuntimeLogItem).created_at) }}
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>
