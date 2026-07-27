<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Table } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'UserManagement' });

interface User {
  id: number;
  telegram_id: number;
  first_name: null | string;
  username: null | string;
  created_at: string;
  updated_at: string;
  admin_username: null | string;
  is_bound: boolean;
}

const users = ref<User[]>([]);
const loading = ref(false);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Telegram ID', dataIndex: 'telegram_id', key: 'telegram_id' },
  { title: '名称', dataIndex: 'first_name', key: 'first_name' },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  {
    title: '已绑定',
    dataIndex: 'is_bound',
    key: 'is_bound',
    width: 80,
    customRender: ({ text }: { text: boolean }) => (text ? '是' : '否'),
  },
  {
    title: '系统用户',
    dataIndex: 'admin_username',
    key: 'admin_username',
    width: 100,
    customRender: ({ text }: { text: string | null }) =>
      text || '-',
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }: { text: string }) =>
      new Date(text).toLocaleString('zh-CN'),
  },
];

async function fetchUsers() {
  loading.value = true;
  try {
    users.value = await requestClient.get('/users');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);
</script>

<template>
  <Page>
    <Table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
      row-key="id"
    />
  </Page>
</template>
