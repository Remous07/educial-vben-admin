<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Table, Tag } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'MessageHistory' });

interface Message {
  id: number;
  user_id: number;
  admin_user_id: null | number;
  text: string;
  direction: string;
  created_at: string;
}

const messages = ref<Message[]>([]);
const loading = ref(false);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '用户 ID', dataIndex: 'user_id', key: 'user_id', width: 100 },
  { title: '内容', dataIndex: 'text', key: 'text', ellipsis: true },
  {
    title: '方向',
    dataIndex: 'direction',
    key: 'direction',
    width: 100,
    customRender: ({ text }: { text: string }) =>
      text === 'incoming'
        ? h(Tag, { color: 'blue' }, () => '接收')
        : h(Tag, { color: 'green' }, () => '发送'),
  },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
];

async function fetchMessages() {
  loading.value = true;
  try {
    messages.value = await requestClient.get('/messages');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchMessages);
</script>

<template>
  <Page>
    <Table
      :columns="columns"
      :data-source="messages"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
      row-key="id"
    />
  </Page>
</template>
