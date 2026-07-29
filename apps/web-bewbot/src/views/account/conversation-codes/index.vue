<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { ConversationCodeItem } from '#/api/core';
import type { CodeUserItem } from '#/api/core/auth';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Space,
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

// Create modal
const modalVisible = ref(false);
const maxUses = ref(1);
const expiresAt = ref(dayjs().add(7, 'day'));
const remark = ref('');
const saving = ref(false);

// Edit modal (temp codes)
const editModalVisible = ref(false);
const editingCode = ref<ConversationCodeItem | null>(null);
const editMaxUses = ref(0);
const editExpiresAt = ref<any>(null);
const editRemark = ref('');

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
      if (record.is_default)
        return h(
          'a',
          {
            style: 'font-size:12px;cursor:pointer;color:#1677ff',
            onClick: () => showCodeUsers(record.code),
          },
          `${record.used_count} 次`,
        );
      if (record.max_uses <= 0)
        return h(
          'a',
          {
            style: 'font-size:12px;cursor:pointer;color:#1677ff',
            onClick: () => showCodeUsers(record.code),
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
      const days = Math.ceil(remaining / 86_400_000);
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

async function handleCreate() {
  saving.value = true;
  try {
    await createConversationCodeApi({
      expires_at: expiresAt.value?.toISOString?.() ?? undefined,
      max_uses: maxUses.value,
      remark: remark.value || undefined,
    });
    message.success('识别码已生成');
    modalVisible.value = false;
    maxUses.value = 1;
    remark.value = '';
    expiresAt.value = dayjs().add(7, 'day');
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
  editMaxUses.value = code.max_uses;
  editExpiresAt.value = code.expires_at ? dayjs(code.expires_at) : null;
  editRemark.value = code.remark || '';
  editModalVisible.value = true;
}

async function handleEditSave() {
  if (!editingCode.value) return;
  saving.value = true;
  try {
    await editConversationCodeApi(editingCode.value.id, {
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
      remark: editRemark.value || undefined,
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
    content: code.is_active
      ? '该识别码目前处于有效状态，删除后无法恢复'
      : '删除后无法恢复',
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
    <div style="margin-bottom: 16px">
      <Button type="primary" @click="modalVisible = true"> 生成识别码 </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="codes"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
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
              <Button
                size="small"
                danger
                @click="handlePermanentDelete(record as ConversationCodeItem)"
              >
                删除
              </Button>
            </template>
          </Space>
        </template>
      </template>
    </Table>

    <!-- Create Modal -->
    <Modal
      v-model:open="modalVisible"
      title="生成对话识别码"
      @ok="handleCreate"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>使用次数上限</label>
        <InputNumber
          v-model:value="maxUses"
          :min="1"
          :max="999"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div>
        <label>过期时间</label>
        <DatePicker
          v-model:value="expiresAt"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%; margin-top: 4px"
          :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
        />
      </div>
      <div style="margin-top: 12px">
        <label>备注</label>
        <Input
          v-model:value="remark"
          placeholder="如：给张三的临时码"
          :maxlength="256"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

    <!-- Edit Modal -->
    <Modal
      v-model:open="editModalVisible"
      title="编辑识别码"
      @ok="handleEditSave"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>使用次数上限</label>
        <InputNumber
          v-model:value="editMaxUses"
          :min="0"
          :max="999"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div>
        <label>过期时间</label>
        <DatePicker
          v-model:value="editExpiresAt"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%; margin-top: 4px"
          :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
        />
      </div>
      <div style="margin-top: 12px">
        <label>备注</label>
        <Input
          v-model:value="editRemark"
          placeholder="如：给张三的临时码"
          :maxlength="256"
          style="margin-top: 4px"
        />
      </div>
    </Modal>

    <!-- Edit Default Code Modal -->
    <Modal
      v-model:open="defaultEditVisible"
      title="编辑默认识别码"
      :confirm-loading="savingDefault"
      @ok="handleDefaultEditSave"
    >
      <label>新识别码（8-16位字母、数字、-、_）</label>
      <Input
        v-model:value="newDefaultCode"
        placeholder="输入新的识别码"
        :maxlength="16"
        style="margin-top: 4px"
      />
    </Modal>

    <!-- User List Modal -->
    <Modal
      v-model:open="userListVisible"
      :title="`使用识别码 ${userListCode} 的用户`"
      :footer="null"
      width="420"
    >
      <Table
        :columns="[
          {
            title: 'TG ID',
            key: 'tg_id',
            width: 110,
            customRender: ({ record: r }: any) =>
              h(
                'a',
                {
                  href: `tg://user?id=${r.tg_user_id}`,
                  style: 'color:#1677ff',
                },
                r.tg_user_id,
              ),
          },
          {
            title: '用户',
            key: 'user',
            customRender: ({ record: r }: any) => {
              const nodes: any[] = [];
              if (r.first_name) nodes.push(r.first_name, ' ');
              if (r.username) {
                nodes.push(
                  h(
                    'a',
                    {
                      href: `https://t.me/${r.username}`,
                      target: '_blank',
                      style: 'color:#1677ff',
                    },
                    `@${r.username}`,
                  ),
                );
              }
              if (!nodes.length) return '未知';
              return h('span', nodes);
            },
          },
          {
            title: '操作',
            key: 'action',
            width: 80,
            customRender: ({ record: r }: any) =>
              r.is_blocked
                ? h(
                    Button,
                    {
                      size: 'small',
                      onClick: () => handleUnblockUser(r.tg_user_id),
                    },
                    () => '解除',
                  )
                : h(
                    Button,
                    {
                      size: 'small',
                      danger: true,
                      onClick: () => handleBlockUser(r.tg_user_id),
                    },
                    () => '拉黑',
                  ),
          },
        ]"
        :data-source="userListItems"
        :loading="userListLoading"
        :pagination="false"
        row-key="tg_user_id"
        size="small"
      />
    </Modal>
  </Page>
</template>
