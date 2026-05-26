<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
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
  Tag,
} from 'ant-design-vue';

import {
  createPostApi,
  deletePostApi,
  downPostApi,
  getPostApi,
  getPostListApi,
  updatePostApi,
  upPostApi,
} from '#/api/modules/post';

defineOptions({ name: 'PostManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ title: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增帖子');
const formData = ref<Record<string, any>>({});
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'id', width: 50 },
  { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
  {
    title: '作者',
    width: 140,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Avatar, { size: 24, src: record?.userInfo?.avatar }),
        h('span', record?.userInfo?.username ?? ''),
      ]),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) => {
      return text === 1
        ? h(Tag, { color: 'orange' }, () => '下架')
        : h(Tag, { color: 'green' }, () => '上架');
    },
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 280,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.id) },
          () => '编辑',
        ),
        record.status === 0
          ? h(
              Button,
              { size: 'small', onClick: () => handleDown([record.id]) },
              () => '下架',
            )
          : h(
              Button,
              { size: 'small', onClick: () => handleUp([record.id]) },
              () => '上架',
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
    const res = await getPostListApi({
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

function openModal() {
  modalTitle.value = '新增帖子';
  formData.value = {};
  modalVisible.value = true;
}

async function handleEdit(id: number) {
  modalTitle.value = '编辑帖子';
  try {
    const res = await getPostApi(id);
    formData.value = res?.post ?? {};
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  await (formData.value.id
    ? updatePostApi(formData.value)
    : createPostApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deletePostApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}
async function handleUp(ids: number[]) {
  try {
    await upPostApi(ids);
    message.success('上架成功');
    loadData();
  } catch {
    /* */
  }
}
async function handleDown(ids: number[]) {
  try {
    await downPostApi(ids);
    message.success('下架成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理社区帖子" title="帖子管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input v-model:value="searchForm.title" placeholder="帖子标题" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="帖子列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增帖子</Button>
      </template>
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
      :title="modalTitle"
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item label="标题" name="title" :rules="[{ required: true }]">
          <Input v-model:value="formData.title" />
        </Form.Item>
        <Form.Item label="内容" name="content">
          <Input.TextArea v-model:value="formData.content" :rows="4" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
