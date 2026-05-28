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
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createSysConfigApi,
  deleteSysConfigApi,
  getSysConfigApi,
  getSysConfigListApi,
  updateSysConfigApi,
} from '#/api/modules/sys-config';

defineOptions({ name: 'SysConfig' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ paramKey: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增配置');
const formData = ref<Record<string, any>>({});
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '参数名', dataIndex: 'paramKey' },
  { title: '参数值', dataIndex: 'paramValue' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'green' }, () => '启用')
        : h(Tag, { color: 'red' }, () => '禁用'),
  },
  { title: '备注', dataIndex: 'remark' },
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
          {
            title: '确认删除?',
            onConfirm: () => handleDelete([record.id]),
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
    const res = await getSysConfigListApi({
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
  searchForm.value.paramKey = '';
  page.value = 1;
  loadData();
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

function openModal() {
  modalTitle.value = '新增配置';
  formData.value = { status: 1 };
  modalVisible.value = true;
}

async function handleEdit(id: number) {
  modalTitle.value = '编辑配置';
  try {
    const res = await getSysConfigApi(id);
    formData.value = res?.config ?? {};
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
    ? updateSysConfigApi(formData.value)
    : createSysConfigApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteSysConfigApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理系统配置参数" title="系统配置">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="参数名">
          <Input v-model:value="searchForm.paramKey" placeholder="参数名" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="配置列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增配置</Button>
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
        <Form.Item label="参数名" name="paramKey" :rules="[{ required: true }]">
          <Input v-model:value="formData.paramKey" />
        </Form.Item>
        <Form.Item
          label="参数值"
          name="paramValue"
          :rules="[{ required: true }]"
        >
          <Input v-model:value="formData.paramValue" />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea v-model:value="formData.remark" />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select v-model:value="formData.status">
            <Select.Option :value="1">启用</Select.Option>
            <Select.Option :value="0">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
