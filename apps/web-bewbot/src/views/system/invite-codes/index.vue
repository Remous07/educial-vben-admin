<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { InviteCodeItem } from '#/api/core';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  InputNumber,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createInviteCodeApi,
  deleteInviteCodeApi,
  getInviteCodesApi,
} from '#/api/core';

defineOptions({ name: 'InviteCodes' });

const codes = ref<InviteCodeItem[]>([]);
const loading = ref(false);

// Create modal
const modalVisible = ref(false);
const maxUses = ref(1);
const expiresDays = ref<number>();
const saving = ref(false);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '邀请码', dataIndex: 'code', key: 'code', width: 180 },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    customRender: ({ text }: { text: boolean }) =>
      text
        ? h(Tag, { color: 'green' }, () => '有效')
        : h(Tag, { color: 'red' }, () => '已用'),
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
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
  {
    title: '创建者',
    dataIndex: 'created_by_username',
    key: 'created_by',
    width: 120,
  },
  { title: '操作', key: 'action', width: 100 },
];

async function handleCreate() {
  saving.value = true;
  try {
    await createInviteCodeApi({
      expires_days: expiresDays.value ?? undefined,
      max_uses: maxUses.value,
    });
    message.success('邀请码已生成');
    modalVisible.value = false;
    maxUses.value = 1;
    expiresDays.value = undefined;
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
    codes.value = await getInviteCodesApi();
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
          <Button
            v-if="(record as InviteCodeItem).is_active"
            size="small"
            danger
            @click="handleDelete(record as InviteCodeItem)"
          >
            撤销
          </Button>
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
        <label>过期天数（留空 = 永不过期）</label>
        <InputNumber
          v-model:value="expiresDays"
          :min="1"
          :max="365"
          style="width: 100%; margin-top: 4px"
          placeholder="永不过期"
        />
      </div>
    </Modal>
  </Page>
</template>
