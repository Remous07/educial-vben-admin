<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Table, Tag } from 'ant-design-vue';

import { requestClient } from '#/api/request';

defineOptions({ name: 'MessageHistory' });

interface Conversation {
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
    title: 'TG 用户',
    key: 'tg_user',
    width: 160,
    customRender: ({ record }: { record: Conversation }) => {
      const name = record.first_name || '未知';
      if (record.username) {
        return h('div', [
          h(
            'a',
            {
              href: `https://t.me/${record.username}`,
              target: '_blank',
              style: { fontWeight: 'bold' },
            },
            name,
          ),
          h(
            'span',
            { style: { color: '#888', fontSize: '12px', marginLeft: '4px' } },
            `@${record.username}`,
          ),
        ]);
      }
      return name;
    },
  },
  {
    title: 'TG ID',
    dataIndex: 'telegram_id',
    key: 'telegram_id',
    width: 120,
  },
  {
    title: '会员',
    dataIndex: 'is_premium',
    key: 'is_premium',
    width: 50,
    align: 'center',
    customRender: ({ text }: { text: boolean }) =>
      text ? h(Tag, { color: 'gold' }, () => '⭐') : null,
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
    width: 65,
    align: 'center',
  },
  {
    title: '最近消息',
    dataIndex: 'last_message_preview',
    key: 'last_message_preview',
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
