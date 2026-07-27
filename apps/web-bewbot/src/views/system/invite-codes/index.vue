<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { InviteCodeItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import dayjs from 'dayjs';

import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createInviteCodeApi,
  deleteInviteCodeApi,
  editInviteCodeApi,
  getInviteCodesApi,
  getSystemSettingApi,
  permanentlyDeleteInviteCodeApi,
  reactivateInviteCodeApi,
  setSystemSettingApi,
} from '#/api/core';

defineOptions({ name: 'InviteCodes' });

const codes = ref<InviteCodeItem[]>([]);
const loading = ref(false);
const inviteRequired = ref(false);

async function toggleInviteRequired(val: boolean) {
  try {
    await setSystemSettingApi('require_invite_code', String(val));
    inviteRequired.value = val;
    message.success(val ? '已开启邀请码验证' : '已关闭邀请码验证');
  } catch {
    inviteRequired.value = !val;
    message.error('设置失败');
  }
}

// Create modal
const modalVisible = ref(false);
const maxUses = ref(1);
const expiresAt = ref(dayjs().add(7, 'day'));
const saving = ref(false);

const columns: TableColumnsType = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 60,
    sorter: (a: InviteCodeItem, b: InviteCodeItem) => a.id - b.id,
    sortDirections: ['ascend', 'descend'],
  },
  { title: '邀请码', dataIndex: 'code', key: 'code', width: 180 },
  {
    title: '状态',
    key: 'status',
    width: 80,
    customRender: ({ record }: { record: InviteCodeItem }) => {
      if (!record.is_active) return h(Tag, { color: 'red' }, () => '已撤销');
      if (record.expires_at && new Date(record.expires_at) < new Date())
        return h(Tag, { color: 'orange' }, () => '已过期');
      return h(Tag, { color: 'green' }, () => '有效');
    },
    sorter: (a: InviteCodeItem, b: InviteCodeItem) =>
      Number(b.is_active) - Number(a.is_active),
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: '使用',
    key: 'usage',
    width: 100,
    customRender: ({ record }: { record: InviteCodeItem }) =>
      record.max_uses === 0
        ? '不限'
        : `${record.used_count}/${record.max_uses}`,
  },
  {
    title: '过期时间',
    dataIndex: 'expires_at',
    key: 'expires_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '永不过期',
    sorter: (a: InviteCodeItem, b: InviteCodeItem) => {
      if (!a.expires_at && !b.expires_at) return 0;
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    },
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
    sorter: (a: InviteCodeItem, b: InviteCodeItem) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime(),
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: '创建者',
    dataIndex: 'created_by_username',
    key: 'created_by',
    width: 120,
  },
  { title: '操作', key: 'action', width: 100 },
];

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  message.success('已复制');
}

async function handleReactivate(code: InviteCodeItem) {
  await reactivateInviteCodeApi(code.id);
  message.success('已重新激活');
  fetchData();
}

function isCodeExpired(code: InviteCodeItem) {
  return code.expires_at && new Date(code.expires_at) < new Date();
}

function isCodeInvalid(code: InviteCodeItem) {
  if (!code.is_active) return true;
  if (isCodeExpired(code)) return true;
  if (code.max_uses > 0 && code.used_count >= code.max_uses) return true;
  return false;
}

async function handlePermanentDelete(code: InviteCodeItem) {
  const invalid = isCodeInvalid(code);
  Modal.confirm({
    title: invalid ? '确定删除该邀请码？' : '该邀请码仍在有效期内',
    content: invalid
      ? '删除后不可恢复'
      : '该邀请码仍然有效，确定要删除吗？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await permanentlyDeleteInviteCodeApi(code.id);
      message.success('已删除');
      fetchData();
    },
  });
}

// Edit modal
const editModalVisible = ref(false);
const editingCode = ref<InviteCodeItem | null>(null);
const editMaxUses = ref(1);
const editExpiresAt = ref<any>(null);

function openEditModal(code: InviteCodeItem) {
  if (!code.is_active) {
    Modal.confirm({
      title: '编辑邀请码',
      content: '被撤销的邀请码不可编辑，是否重新激活？',
      okText: '重新激活',
      cancelText: '取消',
      onOk: async () => {
        await reactivateInviteCodeApi(code.id);
        message.success('已重新激活');
        fetchData();
      },
    });
    return;
  }
  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    message.warning('已过期的邀请码无法编辑');
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
    await editInviteCodeApi(editingCode.value.id, {
      expires_at: editExpiresAt.value?.toISOString?.() ?? '',
      max_uses: editMaxUses.value,
    });
    message.success('保存成功');
    editModalVisible.value = false;
    fetchData();
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleCreate() {
  saving.value = true;
  try {
    await createInviteCodeApi({
      expires_at: expiresAt.value?.toISOString?.() ?? undefined,
      max_uses: maxUses.value,
    });
    message.success('邀请码已生成');
    modalVisible.value = false;
    maxUses.value = 1;
    expiresAt.value = dayjs().add(7, 'day');
    fetchData();
  } catch {
    message.error('生成失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(code: InviteCodeItem) {
  Modal.confirm({
    title: `确定撤销邀请码「${code.code}」？`,
    content: '撤销后该邀请码将无法使用',
    okType: 'danger',
    onOk: async () => {
      await deleteInviteCodeApi(code.id);
      message.success('已撤销');
      fetchData();
    },
  });
}

async function fetchData() {
  loading.value = true;
  try {
    const [codesData, requiredStr] = await Promise.all([
      getInviteCodesApi(),
      getSystemSettingApi('require_invite_code'),
    ]);
    codes.value = codesData;
    inviteRequired.value = requiredStr === 'true';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Page>
    <Space style="margin-bottom: 16px">
      <Button type="primary" @click="modalVisible = true">生成邀请码</Button>
      <Space>
        <span>要求邀请码注册</span>
        <Switch
          :checked="inviteRequired"
          @change="toggleInviteRequired as any"
        />
      </Space>
    </Space>

    <Table
      :columns="columns"
      :data-source="codes"
      :loading="loading"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              size="small"
              @click="openEditModal(record as InviteCodeItem)"
            >
              编辑
            </Button>
            <Button
              size="small"
              @click="copyCode((record as InviteCodeItem).code)"
            >
              复制
            </Button>
            <Button
              v-if="(record as InviteCodeItem).is_active"
              size="small"
              danger
              @click="handleDelete(record as InviteCodeItem)"
            >
              撤销
            </Button>
            <Button
              v-else
              size="small"
              type="primary"
              @click="handleReactivate(record as InviteCodeItem)"
            >
              激活
            </Button>
            <Button
              size="small"
              danger
              type="text"
              @click="handlePermanentDelete(record as InviteCodeItem)"
            >
              删除
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      title="生成邀请码"
      @ok="handleCreate"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>最大使用次数（0 = 不限）</label>
        <InputNumber
          v-model:value="maxUses"
          :min="0"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div>
        <label>过期时间（留空 = 永不过期）</label>
        <DatePicker
          v-model:value="expiresAt"
          :disabled-date="(d: any) => d.isBefore(dayjs().startOf('day'))"
          show-time
          format="YYYY-MM-DD HH:mm"
          placeholder="永不过期"
          style="width: 100%; margin-top: 4px"
        />
      </div>
    </Modal>

    <Modal
      v-model:open="editModalVisible"
      title="编辑邀请码"
      @ok="handleEditSave"
      :confirm-loading="saving"
    >
      <div style="margin-bottom: 12px">
        <label>邀请码</label>
        <Input :value="editingCode?.code" disabled style="margin-top: 4px" />
      </div>
      <div style="margin-bottom: 12px">
        <label>最大使用次数（0 = 不限）</label>
        <InputNumber
          v-model:value="editMaxUses"
          :min="0"
          style="width: 100%; margin-top: 4px"
        />
      </div>
      <div>
        <label>过期时间（留空 = 不变，选择 "datetime" 清空 = 永不过期）</label>
        <DatePicker
          v-model:value="editExpiresAt"
          show-time
          format="YYYY-MM-DD HH:mm"
          placeholder="不变"
          style="width: 100%; margin-top: 4px"
        />
      </div>
    </Modal>
  </Page>
</template>
