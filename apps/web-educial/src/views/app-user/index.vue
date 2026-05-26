<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  banAppUserApi,
  deleteAppUserApi,
  getAppUserApi,
  getAppUserListApi,
  unbanAppUserApi,
} from '#/api/modules/app-user';

defineOptions({ name: 'AppUserManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ key: '' });
const modalVisible = ref(false);
const formData = ref<Record<string, any>>({});

const columns = [
  {
    title: 'ID',
    dataIndex: 'uid',
    width: 50,
    sorter: (a: any, b: any) => a.uid - b.uid,
  },
  {
    title: '头像',
    dataIndex: 'avatar',
    width: 60,
    customRender: ({ text }: any) => h(Avatar, { size: 32, src: text }),
  },
  { title: '用户名', dataIndex: 'username', width: 120 },
  { title: '手机号', dataIndex: 'mobile', width: 130 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    sorter: (a: any, b: any) => a.status - b.status,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'red' }, () => '封禁')
        : h(Tag, { color: 'green' }, () => '正常'),
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 170,
    sorter: (a: any, b: any) =>
      (a.createTime || '').localeCompare(b.createTime || ''),
  },
  {
    title: '操作',
    width: 200,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleView(record.uid) },
          () => '查看',
        ),
        record.status === 1
          ? h(
              Button,
              { size: 'small', onClick: () => handleUnban(record.uid) },
              () => '解封',
            )
          : h(
              Button,
              {
                size: 'small',
                danger: true,
                onClick: () => handleBan(record.uid),
              },
              () => '封禁',
            ),
        h(
          Popconfirm,
          { title: '确认删除?', onConfirm: () => handleDelete([record.uid]) },
          {
            default: () =>
              h(
                Button,
                { size: 'small', danger: true, type: 'dashed' },
                () => '删除',
              ),
          },
        ),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getAppUserListApi({
      page: page.value,
      limit: pageSize.value,
      ...searchForm.value,
    });
    const data = res?.page;
    tableData.value = data?.list ?? [];
    total.value = data?.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  page.value = 1;
  loadData();
}

function onClearSearch() {
  searchForm.value.key = '';
  page.value = 1;
  loadData();
}
function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleView(uid: number) {
  try {
    const res = await getAppUserApi(uid);
    formData.value = res?.user ?? {};
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleBan(id: number) {
  try {
    await banAppUserApi(id);
    message.success('已封禁');
    loadData();
  } catch {
    /* */
  }
}
async function handleUnban(id: number) {
  try {
    await unbanAppUserApi(id);
    message.success('已解封');
    loadData();
  } catch {
    /* */
  }
}
async function handleDelete(ids: number[]) {
  try {
    await deleteAppUserApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理App端用户" title="App用户管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="关键词">
          <Input
            v-model:value="searchForm.key"
            allow-clear
            placeholder="用户名/手机号"
            @clear="onClearSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="用户列表">
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="uid"
        size="middle"
        :scroll="{ x: 900 }"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          show-size-changer
          @change="onPageChange"
        />
      </div>
    </Card>

    <Modal v-model:open="modalVisible" title="用户详情" :footer="null">
      <div class="mb-4 flex justify-center">
        <Avatar :size="64" :src="formData.avatar" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ formData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">
          {{ formData.username }}
        </Descriptions.Item>
        <Descriptions.Item label="手机">
          {{ formData.mobile }}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          {{ formData.status === 1 ? '封禁' : '正常' }}
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">
          {{ formData.createTime }}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  </Page>
</template>
