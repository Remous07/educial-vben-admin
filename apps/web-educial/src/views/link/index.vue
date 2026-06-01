<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Upload,
} from 'ant-design-vue';

import {
  createLinkApi,
  deleteLinkApi,
  getLinkApi,
  getLinkListApi,
  updateLinkApi,
} from '#/api/modules/link';
import { uploadOssFileApi } from '#/api/modules/oss';

defineOptions({ name: 'LinkManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ title: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增轮播图');
const formData = ref<Record<string, any>>({ type: 3 });
const formRef = ref();

const typeOptions = [{ label: '轮播图', value: 3 }];

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '标题', dataIndex: 'title', width: 140, ellipsis: true },
  {
    title: '图片',
    dataIndex: 'img',
    width: 120,
    customRender: ({ text }: any) =>
      text
        ? h(Image, {
            src: text,
            width: 80,
            style: { height: '48px', objectFit: 'cover', borderRadius: '4px' },
          })
        : h('span', { class: 'text-gray-400' }, '无图片'),
  },
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
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    };
    if (searchForm.value.title) params.title = searchForm.value.title;
    const res = await getLinkListApi(params);
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
  searchForm.value.title = '';
  page.value = 1;
  loadData();
}

function onRefresh() {
  loadData();
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

const imageUploading = ref(false);

async function handleImageUpload({ file, onSuccess, onError }: any) {
  try {
    const res = await uploadOssFileApi(file);
    formData.value.img = res?.url ?? '';
    onSuccess(res, file);
  } catch (err) {
    onError(err);
  }
}

function openModal() {
  modalTitle.value = '新增轮播图';
  formData.value = { type: 3 };
  modalVisible.value = true;
}

async function handleEdit(id: number) {
  modalTitle.value = '编辑轮播图';
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
  <Page description="管理社区轮播图" title="轮播图管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input
            v-model:value="searchForm.title"
            allow-clear
            placeholder="轮播图标题"
            @clear="onClearSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
            <Button @click="onRefresh">刷新</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="轮播图列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增轮播图</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
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

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item
          label="标题"
          name="title"
          :rules="[{ required: true, message: '请输入标题' }]"
        >
          <Input v-model:value="formData.title" placeholder="轮播图标题" />
        </Form.Item>
        <Form.Item
          label="图片地址"
          name="img"
          :rules="[{ required: true, message: '请输入图片地址' }]"
        >
          <Space>
            <Input
              v-model:value="formData.img"
              placeholder="https://example.com/banner.jpg"
              style="width: 360px"
            />
            <Upload
              :show-upload-list="false"
              :custom-request="handleImageUpload"
              accept="image/*"
            >
              <Button :loading="imageUploading">上传</Button>
            </Upload>
          </Space>
        </Form.Item>
        <Form.Item v-if="formData.img" label="图片预览">
          <Image
            :src="formData.img"
            style="max-height: 200px; border-radius: 6px"
          />
        </Form.Item>
        <Form.Item label="排序" name="id">
          <InputNumber
            v-model:value="formData.id"
            placeholder="越小越靠前（仅编辑时生效）"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="类型" name="type" :rules="[{ required: true }]">
          <Select v-model:value="formData.type" :options="typeOptions" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
