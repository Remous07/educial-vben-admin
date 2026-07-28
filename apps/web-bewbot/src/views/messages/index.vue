<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Table, Tag } from 'ant-design-vue';

import {
  blockVisitorApi,
  getBlockedVisitorsApi,
  unblockVisitorApi,
} from '#/api/core';
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
const blockedIds = ref<Set<number>>(new Set());
const loading = ref(false);

async function handleBlock(record: Conversation) {
  Modal.confirm({
    title: `确定拉黑该用户？`,
    content: '拉黑后该用户将无法向你发送消息',
    okText: '拉黑',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await blockVisitorApi(record.telegram_id);
      blockedIds.value.add(record.telegram_id);
      message.success('已拉黑');
    },
  });
}

async function handleUnblock(record: Conversation) {
  await unblockVisitorApi(record.telegram_id);
  blockedIds.value.delete(record.telegram_id);
  message.success('已取消拉黑');
}

const columns: TableColumnsType = [
  {
    title: 'TG ID',
    dataIndex: 'telegram_id',
    key: 'telegram_id',
    width: 80,
    align: 'center',
  },
  {
    title: '昵称',
    dataIndex: 'first_name',
    key: 'first_name',
    width: 80,
    align: 'center',
    customRender: ({ text }: { text: null | string }) => text || '-',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 80,
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
    width: 55,
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
    width: 80,
    align: 'center',
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
  { title: '操作', key: 'action', width: 100 },
];

async function fetchConversations() {
  loading.value = true;
  try {
    const [convs, blocked] = await Promise.all([
      requestClient.get('/my-conversations'),
      getBlockedVisitorsApi(),
    ]);
    conversations.value = convs;
    blockedIds.value = new Set(blocked.map((b: any) => b.tg_user_id));
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
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <template v-if="blockedIds.has((record as Conversation).telegram_id)">
            <Button
              size="small"
              type="primary"
              @click="handleUnblock(record as Conversation)"
            >
              取消拉黑
            </Button>
          </template>
          <template v-else>
            <Button
              size="small"
              danger
              @click="handleBlock(record as Conversation)"
            >
              拉黑
            </Button>
          </template>
        </template>
      </template>
    </Table>
  </Page>
</template>
