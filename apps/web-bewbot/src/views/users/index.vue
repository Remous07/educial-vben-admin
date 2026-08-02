<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getAdminUserApi } from '#/api/core';
import { requestClient } from '#/api/request';

defineOptions({ name: 'UserManagement' });

interface User {
  id: number;
  telegram_id: number;
  first_name: null | string;
  username: null | string;
  is_premium: boolean;
  is_banned: boolean;
  created_at: string;
  admin_username: null | string;
  admin_id: null | number;
  is_bound: boolean;
}

const accessStore = useAccessStore();
const hasAdminView = accessStore.accessCodes?.includes('admin:view') ?? false;

const users = ref<User[]>([]);
const loading = ref(false);
const searchText = ref('');
const total = ref(0);
const pagination = ref({ current: 1, pageSize: 20 });

const boundCount = computed(() => users.value.filter((u) => u.is_bound).length);
const bannedCount = computed(
  () => users.value.filter((u) => u.is_banned).length,
);
const premiumCount = computed(
  () => users.value.filter((u) => u.is_premium).length,
);

// Admin detail modal
const adminModalVisible = ref(false);
const adminModalUser = ref<any>(null);
const adminModalLoading = ref(false);

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  {
    title: 'Telegram ID',
    dataIndex: 'telegram_id',
    key: 'telegram_id',
    width: 120,
  },
  { title: '昵称', dataIndex: 'first_name', key: 'first_name', width: 100 },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 100,
    customRender: ({ text }: { text: null | string }) =>
      text
        ? h('a', { href: `https://t.me/${text}`, target: '_blank' }, text)
        : '-',
  },
  {
    title: 'Pre',
    dataIndex: 'is_premium',
    key: 'is_premium',
    width: 55,
    align: 'center',
    customRender: ({ text }: { text: boolean }) =>
      text ? h(Tag, { color: 'gold' }, () => 'Pre') : '-',
  },
  {
    title: '已绑定',
    dataIndex: 'is_bound',
    key: 'is_bound',
    width: 80,
    align: 'center',
    customRender: ({ text }: { text: boolean }) =>
      text
        ? h(Tag, { color: 'green' }, () => '已绑定')
        : h(Tag, () => '未绑定'),
  },
  {
    title: '系统用户',
    key: 'admin_username',
    width: 100,
    align: 'center',
    customRender: ({ record }: { record: User }) => {
      if (!record.is_bound || !record.admin_username) return '-';
      if (!hasAdminView) return record.admin_username;
      const adminId = record.admin_id;
      if (!adminId) return record.admin_username;
      return h(
        'a',
        {
          style: { cursor: 'pointer', color: '#1677ff' },
          onClick: () => openAdminModal(adminId),
        },
        record.admin_username,
      );
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    align: 'center',
    customRender: ({ record }: { record: User }) =>
      record.is_banned
        ? h(Tag, { color: 'red' }, () => '已拉黑')
        : h(Tag, { color: 'green' }, () => '正常'),
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 170,
    customRender: ({ text }: { text: string }) =>
      new Date(text).toLocaleString('zh-CN'),
  },
  { title: '操作', key: 'action', width: 220 },
];

async function openAdminModal(adminId: number) {
  adminModalVisible.value = true;
  adminModalUser.value = null;
  adminModalLoading.value = true;
  try {
    adminModalUser.value = await getAdminUserApi(adminId);
  } catch {
    message.error('获取用户信息失败');
    adminModalVisible.value = false;
  } finally {
    adminModalLoading.value = false;
  }
}

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      offset: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (searchText.value.trim()) {
      params.search = searchText.value.trim();
    }
    const resp = await requestClient.get('/users', { params });
    users.value = resp.data ?? resp;
    total.value = resp.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.value.current = 1;
  fetchUsers();
}

async function handleBan(tgUserId: number) {
  await requestClient.put(`/users/${tgUserId}/ban`);
  message.success('已拉黑');
  fetchUsers();
}

async function handleUnban(tgUserId: number) {
  await requestClient.put(`/users/${tgUserId}/unban`);
  message.success('已解除拉黑');
  fetchUsers();
}

async function handleDelete(tgUserId: number) {
  Modal.confirm({
    title: '确定删除该用户？',
    content: '删除后所有关联数据将被清除，不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await requestClient.delete(`/users/${tgUserId}`);
      message.success('已删除');
      fetchUsers();
    },
  });
}

async function handleUnbind(tgUserId: number) {
  await requestClient.put(`/users/${tgUserId}/unbind`);
  message.success('已解绑');
  fetchUsers();
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current || 1;
  pagination.value.pageSize = pag.pageSize || 20;
  fetchUsers();
}

onMounted(fetchUsers);
</script>

<template>
  <Page>
    <Row :gutter="[16, 16]" style="margin-bottom: 16px">
      <Col :xs="12" :sm="6">
        <Card>
          <Statistic title="总用户" :value="total" />
        </Card>
      </Col>
      <Col :xs="12" :sm="6">
        <Tooltip title="基于当前页数据">
          <Card>
            <Statistic
              title="已绑定"
              :value="boundCount"
              :value-style="{ color: '#1677ff' }"
            />
          </Card>
        </Tooltip>
      </Col>
      <Col :xs="12" :sm="6">
        <Tooltip title="基于当前页数据">
          <Card>
            <Statistic
              title="已拉黑"
              :value="bannedCount"
              :value-style="{ color: '#ff4d4f' }"
            />
          </Card>
        </Tooltip>
      </Col>
      <Col :xs="12" :sm="6">
        <Tooltip title="基于当前页数据">
          <Card>
            <Statistic
              title="Pre"
              :value="premiumCount"
              :value-style="{ color: '#faad14' }"
            />
          </Card>
        </Tooltip>
      </Col>
    </Row>

    <Space style="margin-bottom: 16px">
      <Input.Search
        v-model:value="searchText"
        placeholder="搜索用户名、名称或 TG ID"
        allow-clear
        style="width: 280px"
        @search="handleSearch"
      />
    </Space>

    <Table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total,
        showTotal: (t: number) => `共 ${t} 条`,
        showSizeChanger: true,
      }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Popconfirm
              v-if="!record.is_banned"
              title="确定拉黑该用户？"
              :description="`TG ID: ${record.telegram_id}`"
              ok-text="确认拉黑"
              cancel-text="取消"
              @confirm="handleBan(record.telegram_id)"
            >
              <Button size="small" danger> 拉黑 </Button>
            </Popconfirm>
            <Button
              v-else
              size="small"
              type="primary"
              @click="handleUnban(record.telegram_id)"
            >
              解除拉黑
            </Button>
            <Popconfirm
              v-if="record.is_bound"
              title="确定解绑？"
              :description="`解除 ${record.admin_username} 与 TG ID ${record.telegram_id} 的绑定`"
              ok-text="确认解绑"
              cancel-text="取消"
              @confirm="handleUnbind(record.telegram_id)"
            >
              <Button size="small"> 解绑 </Button>
            </Popconfirm>
            <Popconfirm
              title="确定删除该用户？"
              description="所有关联数据将被清除，不可恢复。"
              ok-text="删除"
              cancel-text="取消"
              @confirm="handleDelete(record.telegram_id)"
            >
              <Button size="small" danger> 删除 </Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="adminModalVisible"
      title="系统用户信息"
      :footer="null"
      :width="400"
      :loading="adminModalLoading"
    >
      <Descriptions v-if="adminModalUser" :column="1" size="small" bordered>
        <Descriptions.Item label="用户名">
          {{ adminModalUser.username }}
        </Descriptions.Item>
        <Descriptions.Item label="邮箱">
          {{ adminModalUser.email }}
        </Descriptions.Item>
        <Descriptions.Item label="权限组">
          <template v-if="adminModalUser.roles?.length">
            <Tag
              v-for="role in adminModalUser.roles"
              :key="role"
              color="blue"
              style="margin: 1px"
            >
              {{ role }}
            </Tag>
          </template>
          <template v-else>-</template>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag v-if="adminModalUser.is_banned" color="red"> 已封禁 </Tag>
          <Tag v-else-if="!adminModalUser.email_verified" color="orange">
            未验证
          </Tag>
          <Tag v-else color="green"> 正常 </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="TOTP">
          {{ adminModalUser.totp_enabled ? '✓' : '—' }}
        </Descriptions.Item>
        <Descriptions.Item label="对话识别码">
          <code v-if="adminModalUser.conversation_code">{{
            adminModalUser.conversation_code
          }}</code>
          <template v-else>-</template>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {{
            adminModalUser.created_at
              ? new Date(adminModalUser.created_at).toLocaleString('zh-CN')
              : '-'
          }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  </Page>
</template>
