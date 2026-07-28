<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Table, Tag } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'MessageHistory' });

interface Conversation {
  user_id: null | number;
  telegram_id: number;
  first_name: null | string;
  username: null | string;
  is_premium: boolean;
  conv_code: null | string;
  message_count: number;
  last_message_at: null | string;
  last_message_preview: string;
}

const conversations = ref<Conversation[]>([]);
const loading = ref(false);

const columns: TableColumnsType = [
  {
    title: 'TG ID',
    dataIndex: 'telegram_id',
    key: 'telegram_id',
    width: 130,
    align: 'center',
  },
  {
    title: '昵称',
    dataIndex: 'first_name',
    key: 'first_name',
    width: 100,
    align: 'center',
    customRender: ({ text }: { text: null | string }) => text || '-',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 120,
    align: 'center',
    customRender: ({ text }: { text: null | string }) =>
      text
        ? h(
            'a',
            {
              href: `https://t.me/${text}`,
              target: '_blank',
              style: { fontWeight: 'bold' },
            },
            `@${text}`,
          )
        : '-',
  },
  {
    title: '会员',
    dataIndex: 'is_premium',
    key: 'is_premium',
    width: 45,
    align: 'center',
    customRender: ({ text }: { text: boolean }) =>
      text
        ? h(Tag, { color: 'gold' }, () => '是')
        : h(Tag, { color: 'default' }, () => '否'),
  },
  {
    title: '识别码',
    dataIndex: 'conv_code',
    key: 'conv_code',
    width: 130,
    customRender: ({ text }: { text: null | string }) =>
      text ? h('code', { style: { fontSize: '12px' } }, text) : '-',
  },
  {
    title: '消息数',
    dataIndex: 'message_count',
    key: 'message_count',
    width: 55,
    align: 'center',
  },
  {
    title: '最新消息',
    dataIndex: 'last_message_preview',
    key: 'last_message_preview',
    width: 180,
    ellipsis: true,
  },
  {
    title: '最近消息时间',
    dataIndex: 'last_message_at',
    key: 'last_message_at',
    width: 160,
    customRender: ({ text }: { text: null | string }) =>
      text ? new Date(text).toLocaleString('zh-CN') : '-',
  },
];

async function fetchConversations() {
  loading.value = true;
  try {
    conversations.value = await requestClient.get('/my-conversations');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchConversations);
</script>

<template>
  <Page>
    <Table
      :columns="columns"
      :data-source="conversations"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
      row-key="telegram_id"
    />
  </Page>
</template>
