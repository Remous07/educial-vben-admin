<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { ConversationCodeItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createConversationCodeApi,
  editConversationCodeApi,
  getConversationCodesApi,
  permanentlyDeleteConversationCodeApi,
  reactivateConversationCodeApi,
  revokeConversationCodeApi,
} from '#/api/core';

defineOptions({ name: 'ConversationCodes' });

const codes = ref<ConversationCodeItem[]>([]);
const loading = ref(false);

// Create modal
const modalVisible = ref(false);
const maxUses = ref(1);
const expiresAt = ref(dayjs().add(7, 'day'));
const saving = ref(false);

// Edit modal
const editModalVisible = ref(false);
const editingCode = ref<ConversationCodeItem | null>(null);
const editMaxUses = ref(0);
const editExpiresAt = ref<any>(null);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: true },
  {
    title: '识别码',
    dataIndex: 'code',
    key: 'code',
    customRender: ({ text }: { text: string }) =>
      h('code', { style: { fontSize: '14px', fontWeight: 'bold' } }, text),
  },
  { title: '使用上限', dataIndex: 'max_uses', key: 'max_uses', width: 100 },
  { title: '已用', dataIndex: 'used_count', key: 'used_count', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ record }: { record: ConversationCodeItem }) => {
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
    title: '过期时间',
    dataIndex: 'expires_at',
    key: 'expires_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '永久',
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
    });
    message.success('识别码已生成');
    modalVisible.value = false;
    maxUses.value = 1;
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
  editModalVisible.value = true;
}

async function handleEditSave() {
  if (!editingCode.value) return;
  saving.value = true;
  try {
    await editConversationCodeApi(editingCode.value.id, {
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
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
          <Space>
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
    </Modal>
  </Page>
</template>
