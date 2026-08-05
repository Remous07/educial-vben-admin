<script lang="ts" setup>
import type {
  AuditOperationItem,
  AuditStats,
  RuntimeLogItem,
} from '#/api/core';

import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  clearAuditOperationsApi,
  clearRuntimeLogsApi,
  getAuditOperationsApi,
  getAuditRetentionApi,
  getAuditStatsApi,
  getRuntimeLogsApi,
  setAuditRetentionApi,
} from '#/api/core';

defineOptions({ name: 'AuditLogs' });

const { isDark } = usePreferences();

const ACTION_OPTIONS = [
  {
    label: '认证',
    options: [
      { label: '登录', value: 'auth.login' },
      { label: '登录失败', value: 'auth.login.failed' },
      { label: '两步验证登录', value: 'auth.login_totp' },
      { label: '两步验证失败', value: 'auth.login_totp.failed' },
      { label: '登出', value: 'auth.logout' },
      { label: '注册账号', value: 'auth.register' },
      { label: '请求重置密码', value: 'auth.reset_password_request' },
      { label: '重置密码', value: 'auth.reset_password' },
    ],
  },
  {
    label: 'TG 用户操作',
    options: [
      { label: '拉黑 TG 用户', value: 'user.ban' },
      { label: '解除拉黑 TG 用户', value: 'user.unban' },
      { label: '删除 TG 用户', value: 'user.delete' },
      { label: '解绑 TG 用户', value: 'user.unbind' },
    ],
  },
  {
    label: '系统用户操作',
    options: [
      { label: '封禁系统用户', value: 'admin.ban' },
      { label: '解封系统用户', value: 'admin.unban' },
      { label: '删除系统用户', value: 'admin.delete' },
      { label: '分配角色', value: 'admin.roles' },
    ],
  },
  {
    label: '角色管理',
    options: [
      { label: '创建角色', value: 'role.create' },
      { label: '编辑角色', value: 'role.edit' },
      { label: '删除角色', value: 'role.delete' },
    ],
  },
  {
    label: '邀请码操作',
    options: [
      { label: '生成邀请码', value: 'invite.create' },
      { label: '编辑邀请码', value: 'invite.edit' },
      { label: '撤销邀请码', value: 'invite.revoke' },
      { label: '重新激活邀请码', value: 'invite.reactivate' },
      { label: '永久删除邀请码', value: 'invite.delete' },
    ],
  },
  {
    label: '识别码操作',
    options: [
      { label: '创建临时识别码', value: 'code.create' },
      { label: '编辑临时识别码', value: 'code.edit' },
      { label: '撤销临时识别码', value: 'code.revoke' },
      { label: '激活临时识别码', value: 'code.reactivate' },
      { label: '永久删除识别码', value: 'code.delete' },
      { label: '轮换默认识别码', value: 'code.rotate' },
      { label: '设置默认识别码', value: 'code.set' },
    ],
  },
  {
    label: '个人设置',
    options: [
      { label: '修改密码', value: 'profile.password' },
      { label: '修改邮箱', value: 'profile.email' },
      { label: '修改用户名', value: 'profile.username' },
      { label: '开启两步验证', value: 'profile.totp_enable' },
      { label: '关闭两步验证', value: 'profile.totp_disable' },
      { label: '绑定 Telegram', value: 'profile.bind' },
      { label: '解绑 Telegram', value: 'profile.unbind' },
    ],
  },
  {
    label: '账户',
    options: [{ label: '注销账号', value: 'account.delete' }],
  },
  {
    label: '系统设置',
    options: [{ label: '修改系统设置', value: 'settings.update' }],
  },
  {
    label: '审计',
    options: [{ label: '清空运行日志', value: 'audit.clear_runtime_logs' }],
  },
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

function actionColor(action: string): string {
  if (action.includes('delete') || action.includes('ban')) return 'red';
  if (action.includes('login') || action.includes('logout')) return 'green';
  if (action.includes('role')) return 'purple';
  if (action.includes('invite') || action.includes('code')) return 'geekblue';
  if (action.includes('settings') || action.includes('rotate')) return 'orange';
  if (
    action.includes('profile') ||
    action.includes('account') ||
    action.includes('register')
  ) {
    return 'cyan';
  }
  return 'default';
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

// ── stats ──────────────────────────────────────────────

const stats = ref<AuditStats>({
  log_error: 0,
  log_total: 0,
  operation_today: 0,
  operation_total: 0,
});

const statCards = computed(() => [
  {
    title: '操作记录',
    value: stats.value.operation_total,
    icon: 'lucide:history',
    color: '#1677ff',
    bg: isDark.value ? '#1e3a5f' : '#e6f4ff',
  },
  {
    title: '今日操作',
    value: stats.value.operation_today,
    icon: 'lucide:activity',
    color: '#52c41a',
    bg: isDark.value ? '#1f3d2a' : '#f6ffed',
  },
  {
    title: '运行日志',
    value: stats.value.log_total,
    icon: 'lucide:file-text',
    color: '#fa8c16',
    bg: isDark.value ? '#3d2f1a' : '#fff7e6',
  },
  {
    title: '错误/严重日志',
    value: stats.value.log_error,
    icon: 'lucide:triangle-alert',
    color: '#ff4d4f',
    bg: isDark.value ? '#3d1f1f' : '#fff1f0',
  },
]);

async function fetchStats() {
  try {
    stats.value = await getAuditStatsApi();
  } catch {
    // error handled by interceptor
  }
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
    customRender: ({ record }: { record: AuditOperationItem }) =>
      h(Tag, { color: actionColor(record.action) }, () => record.action_label),
  },
  { title: '详情', dataIndex: 'detail', key: 'detail', width: 320 },
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

// ── runtime log tab (keyset / load-more) ───────────────

const logs = ref<RuntimeLogItem[]>([]);
const logLoading = ref(false);
const logNextCursor = ref<null | number>(null);
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
  { title: '消息', dataIndex: 'message', key: 'message', width: 420 },
];

async function fetchLogs(reset = false) {
  if (reset) {
    logs.value = [];
    logNextCursor.value = null;
  }
  logLoading.value = true;
  try {
    const resp = await getRuntimeLogsApi({
      before_id: logNextCursor.value ?? undefined,
      limit: 50,
      level: logLevel.value,
      start: toLocalIso(logRange.value?.[0]),
      end: toLocalIso(logRange.value?.[1]),
    });
    logs.value = reset ? resp.items : [...logs.value, ...resp.items];
    logNextCursor.value = resp.next_cursor;
  } finally {
    logLoading.value = false;
  }
}

function onLogSearch() {
  fetchLogs(true);
}

function loadMoreLogs() {
  fetchLogs(false);
}

function formatTime(v: null | string): string {
  return v ? new Date(v).toLocaleString('zh-CN') : '-';
}

onMounted(() => {
  fetchStats();
  fetchRetention();
  fetchOperations();
  fetchLogs();
});
</script>

<template>
  <Page>
    <!-- Stat cards -->
    <Row :gutter="[16, 16]" style="margin-bottom: 16px">
      <Col v-for="card in statCards" :key="card.title" :xs="12" :sm="6">
        <Card class="stat-card">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
            "
          >
            <Statistic
              :title="card.title"
              :value="card.value"
              :value-style="{ color: card.color }"
            />
            <div
              class="stat-icon"
              :style="{ background: card.bg, color: card.color }"
            >
              <IconifyIcon :icon="card.icon" style="font-size: 20px" />
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <!-- Retention config -->
    <Card style="margin-bottom: 16px">
      <div style="margin-bottom: 12px; font-size: 14px; font-weight: 600">
        <IconifyIcon
          icon="lucide:trash-2"
          style="margin-right: 6px; vertical-align: -2px; color: #1677ff"
        />
        日志保留策略
      </div>
      <div
        style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center"
      >
        <Space>
          <span
            :style="{
              fontSize: '13px',
              color: isDark ? '#94a3b8' : '#666',
            }"
          >
            操作记录保留
          </span>
          <InputNumber v-model:value="auditDays" :min="1" :max="3650" />
          <span
            :style="{
              fontSize: '13px',
              color: isDark ? '#94a3b8' : '#666',
            }"
          >
            天
          </span>
        </Space>
        <Space>
          <span
            :style="{
              fontSize: '13px',
              color: isDark ? '#94a3b8' : '#666',
            }"
          >
            运行日志保留
          </span>
          <InputNumber v-model:value="logDays" :min="1" :max="3650" />
          <span
            :style="{
              fontSize: '13px',
              color: isDark ? '#94a3b8' : '#666',
            }"
          >
            天
          </span>
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
            <template v-else-if="column.key === 'detail'">
              <Tooltip
                v-if="(record as AuditOperationItem).detail"
                :title="(record as AuditOperationItem).detail"
              >
                <span class="ellipsis-text">
                  {{ (record as AuditOperationItem).detail }}
                </span>
              </Tooltip>
              <span v-else>-</span>
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
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              {{ formatTime((record as RuntimeLogItem).created_at) }}
            </template>
            <template v-else-if="column.key === 'message'">
              <Tooltip :title="(record as RuntimeLogItem).message">
                <span class="ellipsis-text">
                  {{ (record as RuntimeLogItem).message }}
                </span>
              </Tooltip>
            </template>
          </template>
        </Table>
        <div
          v-if="logNextCursor !== null"
          style="margin-top: 12px; text-align: center"
        >
          <Button :loading="logLoading" @click="loadMoreLogs">加载更多</Button>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>

<style scoped>
.ellipsis-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card {
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-2px);
}

.stat-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
}
</style>
