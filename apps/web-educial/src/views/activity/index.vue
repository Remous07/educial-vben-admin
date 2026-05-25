<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import {
  deleteActivityApi,
  getActivityApi,
  getActivityListApi,
} from '#/api/modules/activity';

defineOptions({ name: 'ActivityManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ title: '' });
const modalVisible = ref(false);
const formData = ref<Record<string, any>>({});

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '活动标题', dataIndex: 'title', ellipsis: true },
  { title: '发布人', dataIndex: 'userName' },
  { title: '报名人数', dataIndex: 'registrationCount', width: 80 },
  { title: '开始时间', dataIndex: 'startTime', width: 170 },
  { title: '结束时间', dataIndex: 'endTime', width: 170 },
  {
    title: '操作',
    width: 200,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.id) },
          () => '编辑',
        ),
        h(
          Button,
          { size: 'small', onClick: () => handleView(record.id) },
          () => '查看',
        ),
        h(
          Popconfirm,
          { title: '确认删除?', onConfirm: () => handleDelete([record.id]) },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getActivityListApi({
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
function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleEdit(id: number) {
  try {
    const res = await getActivityApi(id);
    formData.value = res?.activity ?? {};
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleView(id: number) {
  try {
    const res = await getActivityApi(id);
    formData.value = res?.activity ?? {};
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleDelete(ids: number[]) {
  try {
    await deleteActivityApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理社区活动及报名" title="活动管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input v-model:value="searchForm.title" placeholder="活动标题" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="活动列表">
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 1000 }"
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

    <Modal
      v-model:open="modalVisible"
      title="活动详情"
      width="700px"
      :footer="null"
    >
      <div class="space-y-2">
        <p><strong>标题:</strong> {{ formData.title }}</p>
        <p><strong>发布人:</strong> {{ formData.userName }}</p>
        <p>
          <strong>报名时间:</strong> {{ formData.regStartTime }} ~
          {{ formData.regDeadline }}
        </p>
        <p>
          <strong>活动时间:</strong> {{ formData.startTime }} ~
          {{ formData.endTime }}
        </p>
        <p>
          <strong>报名人数:</strong> {{ formData.registrationCount }} /
          {{ formData.maxParticipants || '不限' }}
        </p>
        <p><strong>详情:</strong> {{ formData.detail }}</p>
      </div>
    </Modal>
  </Page>
</template>
