<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { ConversationCodeItem } from '#/api/core';
import type { CodeUserItem } from '#/api/core/auth';

import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  blockVisitorApi,
  createConversationCodeApi,
  editConversationCodeApi,
  getCodeUsersApi,
  getConversationCodesApi,
  permanentlyDeleteConversationCodeApi,
  reactivateConversationCodeApi,
  revokeConversationCodeApi,
  rotateConversationCodeApi,
  setConversationCodeApi,
  unblockVisitorApi,
} from '#/api/core';

defineOptions({ name: 'ConversationCodes' });

const codes = ref<ConversationCodeItem[]>([]);
const loading = ref(false);
const searchText = ref('');

const filteredCodes = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return codes.value;
  return codes.value.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      (c.remark ?? '').toLowerCase().includes(q),
  );
});

const defaultCount = computed(
  () => codes.value.filter((c) => c.is_default).length,
);
const activeCount = computed(
  () =>
    codes.value.filter((c) => {
      if (c.is_default) return true;
      if (!c.is_active) return false;
      if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
      if (c.max_uses > 0 && c.used_count >= c.max_uses) return false;
      return true;
    }).length,
);
const revokedCount = computed(
  () => codes.value.filter((c) => !c.is_active).length,
);

// ── avatar helpers ──

function avatarChar(firstName: null | string, username: null | string): string {
  const source = firstName || username || '';
  const match = source.match(/\p{L}/u);
  return match ? match[0].toUpperCase() : '?';
}

function avatarColor(tgUserId: number, firstName: null | string): string {
  // Base hue from ID — stable, never changes
  const base = Math.trunc((tgUserId * 2_654_435_761) % 4_294_967_296) % 360;
  // Name adds ±10° fine-tuning
  let offset = 0;
  const name = firstName || '';
  for (const ch of name)
    offset = Math.trunc((offset << 5) - offset + (ch.codePointAt(0) ?? 0));
  const hue = (base + (offset % 20) - 10 + 360) % 360;
  return `hsl(${hue}, 50%, 40%)`;
}

// ── code helpers ──

const CODE_PATTERN = /^[a-zA-Z0-9_-]{8,16}$/;

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let result = '';
  for (const b of bytes) result += chars[b % chars.length];
  return result;
}

function validateCode(code: string): string {
  if (!code) return '请输入识别码';
  if (code.length < 8) return '至少 8 个字符';
  if (code.length > 16) return '最多 16 个字符';
  if (!CODE_PATTERN.test(code)) return '仅支持字母、数字、-、_';
  return '';
}

// ── create modal ──

const modalVisible = ref(false);
const codeInput = ref('');
const codeError = ref('');
const maxUses = ref(1);
const expiresAt = ref<any>(dayjs().add(7, 'day'));
const expiresDays = ref(7);
const remark = ref('');
const saving = ref(false);

function onCodeInputChange() {
  codeError.value = validateCode(codeInput.value);
}

function onExpiresAtChange(d: any) {
  expiresDays.value = d
    ? Math.max(0, Math.round(d.diff(dayjs(), 'day', true)))
    : 0;
}
function onExpiresDaysChange() {
  expiresAt.value =
    expiresDays.value > 0 ? dayjs().add(expiresDays.value, 'day') : null;
}

// Edit modal (temp codes)
const editModalVisible = ref(false);
const editingCode = ref<ConversationCodeItem | null>(null);
const editCode = ref('');
const editCodeError = ref('');
const editMaxUses = ref(0);
const editExpiresAt = ref<any>(null);
const editExpiresDays = ref(0);
const editRemark = ref('');

function onEditCodeChange() {
  editCodeError.value = validateCode(editCode.value);
}

function onEditExpiresAtChange(d: any) {
  editExpiresDays.value = d
    ? Math.max(0, Math.round(d.diff(dayjs(), 'day', true)))
    : 0;
}
function onEditExpiresDaysChange() {
  editExpiresAt.value =
    editExpiresDays.value > 0
      ? dayjs().add(editExpiresDays.value, 'day')
      : null;
}

// Edit default code modal
const defaultEditVisible = ref(false);
const newDefaultCode = ref('');
const savingDefault = ref(false);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: true },
  {
    title: '识别码',
    dataIndex: 'code',
    key: 'code',
    width: 150,
    customRender: ({ text }: { text: string }) =>
      h('code', { style: { fontSize: '14px', fontWeight: 'bold' } }, text),
  },
  {
    title: '使用次数',
    key: 'usage',
    width: 150,
    customRender: ({ record }: { record: ConversationCodeItem }) => {
      const canClick = record.used_count > 0;
      if (record.is_default)
        return canClick
          ? h(
              'a',
              {
                style: 'font-size:12px;cursor:pointer;color:#1677ff',
                onClick: () => showCodeUsers(record.code),
              },
              `${record.used_count} 次`,
            )
          : h(
              'span',
              {
                style:
                  'font-size:12px;color:hsl(var(--muted-foreground) / 80%)',
              },
              `${record.used_count} 次`,
            );
      if (record.max_uses <= 0)
        return canClick
          ? h(
              'a',
              {
                style: 'font-size:12px;cursor:pointer;color:#1677ff',
                onClick: () => showCodeUsers(record.code),
              },
              `${record.used_count} 次`,
            )
          : h(
              'span',
              {
                style:
                  'font-size:12px;color:hsl(var(--muted-foreground) / 80%)',
              },
              `${record.used_count} 次`,
            );
      // Temp code with max_uses > 0
      const pct = Math.round(
        (record.used_count / Math.max(record.max_uses, 1)) * 100,
      );
      let strokeColor: string;
      if (pct >= 100) strokeColor = '#f5222d';
      else if (pct >= 80) strokeColor = '#fa8c16';
      else strokeColor = '#52c41a';
      if (canClick)
        return h(
          'a',
          {
            style:
              'display:flex;align-items:center;gap:8px;cursor:pointer;color:inherit;text-decoration:none',
            onClick: () => showCodeUsers(record.code),
          },
          [
            h(
              'span',
              { style: 'white-space:nowrap;font-size:12px' },
              `${record.used_count} / ${record.max_uses}`,
            ),
            h(Progress, {
              percent: Math.min(pct, 100),
              size: 'small',
              strokeColor,
              showInfo: false,
              style: 'flex:1',
            }),
          ],
        );
      return h(
        'span',
        { style: 'font-size:12px;color:hsl(var(--muted-foreground) / 80%)' },
        `${record.used_count} / ${record.max_uses}`,
      );
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ record }: { record: ConversationCodeItem }) => {
      if (record.is_default) return h(Tag, { color: 'blue' }, () => '默认');
      if (!record.is_active)
        return h(Tag, { color: 'default' }, () => '已撤销');
      if (record.expires_at && new Date(record.expires_at) < new Date())
        return h(Tag, { color: 'orange' }, () => '已过期');
      if (record.max_uses > 0 && record.used_count >= record.max_uses)
        return h(Tag, { color: 'red' }, () => '已用完');
      return h(Tag, { color: 'green' }, () => '有效');
    },
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 150,
    ellipsis: true,
    customRender: ({ text }: { text: null | string }) => text || '-',
  },
  {
    title: '过期时间',
    key: 'expiry',
    width: 160,
    customRender: ({ record }: { record: ConversationCodeItem }) => {
      if (record.is_default || !record.expires_at || !record.created_at)
        return '永久';
      const created = new Date(record.created_at).getTime();
      const expires = new Date(record.expires_at).getTime();
      const now = Date.now();
      if (now >= expires) return h(Tag, { color: 'red' }, () => '已过期');
      const total = expires - created;
      const elapsed = now - created;
      const pct = Math.round((elapsed / total) * 100);
      const remaining = Math.max(0, expires - now);
      const days = Math.round(remaining / 86_400_000);
      const fullDate = new Date(record.expires_at).toLocaleString('zh-CN');
      let strokeColor: string;
      if (pct >= 90) strokeColor = '#f5222d';
      else if (pct >= 70) strokeColor = '#fa8c16';
      else strokeColor = '#1677ff';
      return h(Tooltip, { title: fullDate }, () =>
        h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h(
            'span',
            { style: 'white-space:nowrap;font-size:12px' },
            `${days}天`,
          ),
          h(Progress, {
            percent: Math.min(pct, 100),
            size: 'small',
            strokeColor,
            showInfo: false,
            style: 'flex:1',
          }),
        ]),
      );
    },
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  { title: '操作', key: 'action', width: 220 },
];

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  message.success('已复制');
}

function onCreateModalOpen() {
  codeError.value = '';
  maxUses.value = 1;
  remark.value = '';
  expiresAt.value = dayjs().add(7, 'day');
  expiresDays.value = 7;
}

// 随机生成一个识别码填入创建/编辑弹窗的输入框（并清除校验错误）。
function randomizeCode() {
  codeInput.value = generateCode();
  codeError.value = '';
}

function randomizeEditCode() {
  editCode.value = generateCode();
  editCodeError.value = '';
}

async function handleCreate() {
  // Validate code before submitting
  const err = validateCode(codeInput.value);
  if (err) {
    codeError.value = err;
    return;
  }
  codeError.value = '';
  saving.value = true;
  try {
    await createConversationCodeApi({
      code: codeInput.value,
      expires_at: expiresAt.value?.toISOString?.() ?? undefined,
      max_uses: maxUses.value,
      remark: remark.value || undefined,
    });
    message.success('识别码已生成');
    modalVisible.value = false;
    fetchData();
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}

function openEditModal(code: ConversationCodeItem) {
  if (!code.is_active) {
    message.error('已撤销的识别码不可编辑，请先重新激活');
    return;
  }
  editingCode.value = code;
  editCode.value = code.code;
  editCodeError.value = '';
  editMaxUses.value = code.max_uses;
  editExpiresAt.value = code.expires_at ? dayjs(code.expires_at) : null;
  editExpiresDays.value = code.expires_at
    ? Math.max(0, Math.round(dayjs(code.expires_at).diff(dayjs(), 'day', true)))
    : 0;
  editRemark.value = code.remark || '';
  editModalVisible.value = true;
}

async function handleEditSave() {
  if (!editingCode.value) return;

  // Validate code if changed
  if (editCode.value !== editingCode.value.code) {
    const err = validateCode(editCode.value);
    if (err) {
      editCodeError.value = err;
      return;
    }
  }
  editCodeError.value = '';
  saving.value = true;
  try {
    await editConversationCodeApi(editingCode.value.id, {
      code:
        editCode.value === editingCode.value.code ? undefined : editCode.value,
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
      remark: editRemark.value || '',
    });
    message.success('保存成功');
    editModalVisible.value = false;
    fetchData();
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}

async function handleRevoke(code: ConversationCodeItem) {
  Modal.confirm({
    title: `确定撤销识别码「${code.code}」？`,
    content: '撤销后使用该识别码的用户将无法发起新对话',
    okText: '撤销',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await revokeConversationCodeApi(code.id);
      message.success('已撤销');
      fetchData();
    },
  });
}

async function handleReactivate(code: ConversationCodeItem) {
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    message.error('已过期的识别码无法重新激活');
    return;
  }
  await reactivateConversationCodeApi(code.id);
  message.success('已激活');
  fetchData();
}

async function handlePermanentDelete(code: ConversationCodeItem) {
  Modal.confirm({
    title: `永久删除识别码「${code.code}」？`,
    content: '删除后无法恢复',
    okText: '永久删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await permanentlyDeleteConversationCodeApi(code.id);
      message.success('已删除');
      fetchData();
    },
  });
}

function openDefaultEdit(_code: string) {
  newDefaultCode.value = '';
  defaultEditVisible.value = true;
}

async function handleDefaultEditSave() {
  savingDefault.value = true;
  try {
    await setConversationCodeApi(newDefaultCode.value);
    message.success('默认识别码已更新');
    defaultEditVisible.value = false;
    fetchData();
  } catch {
    // error handled by interceptor
  } finally {
    savingDefault.value = false;
  }
}

function handleRotate() {
  Modal.confirm({
    title: '确定轮换默认识别码？',
    content: '轮换后旧识别码立即失效，使用旧码的访客将无法发起新对话。',
    okText: '确认轮换',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await rotateConversationCodeApi();
      message.success('默认识别码已轮换');
      fetchData();
    },
  });
}

// User list modal
const userListVisible = ref(false);
const userListCode = ref('');
const userListItems = ref<CodeUserItem[]>([]);
const userListLoading = ref(false);

async function showCodeUsers(code: string) {
  userListCode.value = code;
  userListVisible.value = true;
  userListLoading.value = true;
  try {
    userListItems.value = await getCodeUsersApi(code);
  } catch {
    message.error('加载用户列表失败');
  } finally {
    userListLoading.value = false;
  }
}

async function handleBlockUser(tgUserId: number) {
  await blockVisitorApi(tgUserId);
  message.success('已拉黑');
  // Refresh the list for the current code
  if (userListCode.value) {
    userListItems.value = await getCodeUsersApi(userListCode.value);
  }
}

async function handleUnblockUser(tgUserId: number) {
  await unblockVisitorApi(tgUserId);
  message.success('已解除拉黑');
  if (userListCode.value) {
    userListItems.value = await getCodeUsersApi(userListCode.value);
  }
}

async function fetchData() {
  loading.value = true;
  try {
    codes.value = await getConversationCodesApi();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Page>
    <Row :gutter="[16, 16]" style="margin-bottom: 16px">
      <Col :xs="12" :sm="6">
        <Card>
          <Statistic title="总识别码" :value="codes.length" />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card>
          <Statistic
            title="默认"
            :value="defaultCount"
            :value-style="{ color: '#1677ff' }"
          />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card>
          <Statistic
            title="有效"
            :value="activeCount"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Card>
          <Statistic
            title="已撤销"
            :value="revokedCount"
            :value-style="{ color: '#ff4d4f' }"
          />
        </Card>
      </Col>
    </Row>

    <Space style="margin-bottom: 16px" :wrap="true">
      <Button type="primary" @click="modalVisible = true"> 生成识别码 </Button>
      <Input.Search
        v-model:value="searchText"
        placeholder="搜索识别码或备注"
        allow-clear
        style="width: 280px"
      />
    </Space>

    <Table
      :columns="columns"
      :data-source="filteredCodes"
      :loading="loading"
      :pagination="{
        defaultPageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (t: number) => `共 ${t} 条`,
      }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space v-if="record.is_default">
            <Button size="small" @click="copyCode(record.code)"> 复制 </Button>
            <Button
              size="small"
              type="primary"
              @click="openDefaultEdit(record.code)"
            >
              编辑
            </Button>
            <Button size="small" danger @click="handleRotate()"> 轮换 </Button>
          </Space>
          <Space v-else>
            <Button size="small" @click="copyCode(record.code)"> 复制 </Button>
            <template v-if="record.is_active">
              <Button
                size="small"
                type="primary"
                @click="openEditModal(record as ConversationCodeItem)"
              >
                编辑
              </Button>
              <Button
                size="small"
                danger
                @click="handleRevoke(record as ConversationCodeItem)"
              >
                撤销
              </Button>
            </template>
            <template v-else>
              <Button
                size="small"
                type="primary"
                @click="handleReactivate(record as ConversationCodeItem)"
              >
                激活
              </Button>
            </template>
            <Tooltip
              :title="
                record.is_active && record.used_count > 0 ? '需先撤销' : ''
              "
            >
              <Button
                size="small"
                danger
                :disabled="record.is_active && record.used_count > 0"
                @click="handlePermanentDelete(record as ConversationCodeItem)"
              >
                删除
              </Button>
            </Tooltip>
          </Space>
        </template>
      </template>
    </Table>

    <!-- Create Modal -->
    <Modal
      v-model:open="modalVisible"
      @ok="handleCreate"
      :confirm-loading="saving"
      :width="480"
      @after-open-change="(open: boolean) => open && onCreateModalOpen()"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            icon="lucide:key-round"
            style="font-size: 18px; color: #1677ff"
          />
          <span style="font-size: 16px; font-weight: 600">生成对话识别码</span>
        </Space>
      </template>

      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">识别码</label>
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <Input
            v-model:value="codeInput"
            :maxlength="16"
            placeholder="8-16位字母、数字、-、_"
            :status="codeError ? 'error' : ''"
            style="flex: 1"
            @change="onCodeInputChange"
          />
          <Button @click="randomizeCode">
            <IconifyIcon
              icon="lucide:dices"
              style="margin-right: 4px; vertical-align: -2px"
            />
            随机
          </Button>
        </div>
        <span v-if="codeError" style="font-size: 12px; color: #ff4d4f">
          {{ codeError }}
        </span>
      </div>
      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">使用次数上限</label>
        <InputNumber
          v-model:value="maxUses"
          :min="1"
          :max="999"
          style="width: 100%; margin-top: 6px"
        />
      </div>
      <div>
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">过期时间</label>
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <DatePicker
            v-model:value="expiresAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="永不过期"
            allow-clear
            style="flex: 1"
            :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
            @change="onExpiresAtChange"
          />
          <InputNumber
            v-model:value="expiresDays"
            :min="0"
            :max="365"
            addon-after="天后过期"
            style="width: 140px"
            @change="onExpiresDaysChange"
          />
        </div>
      </div>
      <div style="margin-top: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">备注</label>
        <Input
          v-model:value="remark"
          placeholder="如：给张三的临时码"
          :maxlength="256"
          style="margin-top: 6px"
        />
      </div>
    </Modal>

    <!-- Edit Modal -->
    <Modal
      v-model:open="editModalVisible"
      @ok="handleEditSave"
      :confirm-loading="saving"
      :width="480"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            icon="lucide:edit"
            style="font-size: 18px; color: #1677ff"
          />
          <span style="font-size: 16px; font-weight: 600">编辑识别码</span>
        </Space>
      </template>

      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">识别码</label>
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <Input
            v-model:value="editCode"
            :maxlength="16"
            :disabled="(editingCode?.active_session_count ?? 0) > 0"
            :status="editCodeError ? 'error' : ''"
            style="flex: 1"
            @change="onEditCodeChange"
          />
          <Button
            :disabled="(editingCode?.active_session_count ?? 0) > 0"
            @click="randomizeEditCode"
          >
            <IconifyIcon
              icon="lucide:dices"
              style="margin-right: 4px; vertical-align: -2px"
            />
            随机
          </Button>
        </div>
        <span
          v-if="(editingCode?.active_session_count ?? 0) > 0"
          style="font-size: 12px; color: hsl(var(--muted-foreground) / 80%)"
        >
          有活跃会话，暂不可修改识别码
        </span>
        <span v-else-if="editCodeError" style="font-size: 12px; color: #ff4d4f">
          {{ editCodeError }}
        </span>
      </div>
      <div style="margin-bottom: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">使用次数上限</label>
        <InputNumber
          v-model:value="editMaxUses"
          :min="0"
          :max="999"
          style="width: 100%; margin-top: 6px"
        />
      </div>
      <div>
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">过期时间</label>
        <div style="display: flex; gap: 8px; margin-top: 6px">
          <DatePicker
            v-model:value="editExpiresAt"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="永不过期"
            allow-clear
            style="flex: 1"
            :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
            @change="onEditExpiresAtChange"
          />
          <InputNumber
            v-model:value="editExpiresDays"
            :min="0"
            :max="365"
            addon-after="天后过期"
            style="width: 140px"
            @change="onEditExpiresDaysChange"
          />
        </div>
      </div>
      <div style="margin-top: 16px">
        <label style="font-size: 13px; color: hsl(var(--muted-foreground))">备注</label>
        <Input
          v-model:value="editRemark"
          placeholder="如：给张三的临时码"
          :maxlength="256"
          style="margin-top: 6px"
        />
      </div>
    </Modal>

    <!-- Edit Default Code Modal -->
    <Modal
      v-model:open="defaultEditVisible"
      :confirm-loading="savingDefault"
      @ok="handleDefaultEditSave"
      :width="440"
    >
      <template #title>
        <Space align="center" :size="8">
          <IconifyIcon
            icon="lucide:star"
            style="font-size: 18px; color: #1677ff"
          />
          <span style="font-size: 16px; font-weight: 600">编辑默认识别码</span>
        </Space>
      </template>

      <label style="font-size: 13px; color: hsl(var(--muted-foreground))">
        新识别码（8-16位字母、数字、-、_）
      </label>
      <Input
        v-model:value="newDefaultCode"
        placeholder="输入新的识别码"
        :maxlength="16"
        style="margin-top: 6px"
      />
    </Modal>

    <!-- User List Drawer -->
    <Drawer v-model:open="userListVisible" :width="640">
      <template #title>
        <Space align="center" :size="6" :wrap="true">
          <IconifyIcon icon="lucide:key-round" style="color: #1677ff" />
          <span style="font-weight: 600">使用识别码</span>
          <Tag color="blue" style="margin: 0 2px">{{ userListCode }}</Tag>
          <span style="font-weight: 600">的访客</span>
        </Space>
      </template>

      <List
        :data-source="userListItems"
        :loading="userListLoading"
        size="small"
      >
        <template #renderItem="{ item: r }">
          <List.Item>
            <div
              style="
                display: flex;
                gap: 12px;
                align-items: center;
                width: 100%;
                min-width: 0;
              "
            >
              <div
                :style="{
                  display: 'flex',
                  width: '32px',
                  height: '32px',
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: r.is_blocked
                    ? '#f0f0f0'
                    : avatarColor(r.tg_user_id, r.first_name),
                  color: r.is_blocked ? '#bbb' : '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }"
              >
                {{ avatarChar(r.first_name, r.username) }}
              </div>
              <div style="flex: 1; min-width: 0">
                <div
                  style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                  "
                >
                  <a
                    v-if="r.first_name"
                    :href="`tg://user?id=${r.tg_user_id}`"
                    style="font-weight: 500; color: #1677ff"
                  >
                    {{ r.first_name }}
                  </a>
                  <a
                    v-if="r.username"
                    :href="`https://t.me/${r.username}`"
                    target="_blank"
                    style="color: #1677ff"
                  >
                    @{{ r.username }}
                  </a>
                  <span
                    v-if="!r.first_name && !r.username"
                    style="color: hsl(var(--muted-foreground) / 80%)"
                  >
                    未知用户
                  </span>
                  <Tag v-if="r.is_premium" color="gold" style="font-size: 10px">
                    Pre
                  </Tag>
                  <Tag v-if="r.is_blocked" color="red" style="font-size: 11px">
                    已拉黑
                  </Tag>
                </div>
                <div
                  style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    align-items: center;
                    margin-top: 2px;
                    font-size: 12px;
                    color: hsl(var(--muted-foreground) / 80%);
                  "
                >
                  <code style="font-size: 11px">{{ r.tg_user_id }}</code>
                  <span
                    v-if="r.last_active_at"
                    style="color: hsl(var(--muted-foreground) / 50%)"
                    >·</span>
                  <span v-if="r.last_active_at">
                    {{ dayjs(r.last_active_at).format('MM-DD HH:mm') }}
                  </span>
                  <span style="color: hsl(var(--muted-foreground) / 50%)">·</span>
                  <span>{{ r.message_count }} 条消息</span>
                </div>
              </div>
              <div style="flex-shrink: 0">
                <Button
                  v-if="r.is_blocked"
                  size="small"
                  @click="handleUnblockUser(r.tg_user_id)"
                >
                  解除
                </Button>
                <Popconfirm
                  v-else
                  title="确认拉黑该用户？"
                  :description="`TG ID: ${r.tg_user_id}`"
                  ok-text="确认拉黑"
                  cancel-text="取消"
                  @confirm="handleBlockUser(r.tg_user_id)"
                >
                  <Button size="small" danger> 拉黑 </Button>
                </Popconfirm>
              </div>
            </div>
          </List.Item>
        </template>
      </List>
    </Drawer>
  </Page>
</template>
