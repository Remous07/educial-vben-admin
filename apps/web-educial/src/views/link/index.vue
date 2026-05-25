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
  createLinkApi,
  deleteLinkApi,
  getLinkApi,
  getLinkListApi,
  updateLinkApi,
} from '#/api/modules/link';

defineOptions({ name: 'LinkManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ name: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增友链');
const formData = ref<Record<string, any>>({});
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '网站名', dataIndex: 'name' },
  { title: 'URL', dataIndex: 'url' },
  { title: '描述', dataIndex: 'description', ellipsis: true },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 150,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.id) },
          () => '编辑',
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
    const res = await getLinkListApi({
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
  modalTitle.value = '新增友链';
  formData.value = {};
  modalVisible.value = true;
}

async function handleEdit(id: number) {
  modalTitle.value = '编辑友链';
  try {
    const res = await getLinkApi(id);
    formData.value = res?.link ?? {};
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
    ? updateLinkApi(formData.value)
    : createLinkApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteLinkApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理友情链接" title="友链管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="网站名">
          <Input v-model:value="searchForm.name" placeholder="网站名称" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="友链列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增友链</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
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
        <Form.Item label="网站名" name="name" :rules="[{ required: true }]">
          <Input v-model:value="formData.name" />
        </Form.Item>
        <Form.Item label="URL" name="url" :rules="[{ required: true }]">
          <Input v-model:value="formData.url" />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea v-model:value="formData.description" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
