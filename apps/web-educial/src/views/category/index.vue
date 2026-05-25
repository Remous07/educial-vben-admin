<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryApi,
  getCategoryListApi,
  updateCategoryApi,
} from '#/api/modules/category';

defineOptions({ name: 'CategoryManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ name: '' });
const modalVisible = ref(false);
const formData = ref<Record<string, any>>({});
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'cateId', width: 60 },
  { title: '分类名', dataIndex: 'name' },
  { title: '图标', dataIndex: 'icon' },
  { title: '排序', dataIndex: 'orderNum', width: 70 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 150,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.cateId) },
          () => '编辑',
        ),
        h(
          Popconfirm,
          {
            title: '确认删除?',
            onConfirm: () => handleDelete([record.cateId]),
          },
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
    const res = await getCategoryListApi({
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
  formData.value = { orderNum: 0 };
  modalVisible.value = true;
}

async function handleEdit(cateId: number) {
  try {
    const res = await getCategoryApi(cateId);
    formData.value = res?.category ?? {};
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
  await (formData.value.cateId
    ? updateCategoryApi(formData.value)
    : createCategoryApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteCategoryApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理内容分类" title="分类管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="分类名">
          <Input v-model:value="searchForm.name" placeholder="分类名称" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="分类列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增分类</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="cateId"
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
      title="分类信息"
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item label="分类名" name="name" :rules="[{ required: true }]">
          <Input v-model:value="formData.name" />
        </Form.Item>
        <Form.Item label="图标" name="icon">
          <Input v-model:value="formData.icon" placeholder="图标URL或icon名" />
        </Form.Item>
        <Form.Item label="排序" name="orderNum">
          <InputNumber
            v-model:value="formData.orderNum"
            :min="0"
            class="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
