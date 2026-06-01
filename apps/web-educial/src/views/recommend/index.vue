<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Image,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  createRecommendApi,
  deleteRecommendApi,
  downRecommendApi,
  getRecommendApi,
  getRecommendListApi,
  updateRecommendApi,
  upRecommendApi,
} from '#/api/modules/recommend';
import { uploadOssFileApi } from '#/api/modules/oss';

defineOptions({ name: 'RecommendManage' });

const typeOptions = [
  { label: '专家文章', value: 1 },
  { label: '案例分享', value: 2 },
  { label: '课程推荐', value: 3 },
  { label: '书籍绘本', value: 4 },
  { label: '玩具游戏', value: 5 },
];

function getTypeLabel(v: number) {
  return typeOptions.find((o) => o.value === v)?.label ?? String(v);
}

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({
  title: '',
  type: undefined as number | undefined,
  status: undefined as number | undefined,
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');

const hasSelected = computed(() => selectedRowKeys.value.length > 0);

const rowSelection = computed(() => ({
  onChange: (keys: Key[]) => {
    selectedRowKeys.value = keys;
  },
  selectedRowKeys: selectedRowKeys.value,
}));

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60, sorter: true },
  { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
  {
    title: '类型',
    dataIndex: 'type',
    width: 100,
    customRender: ({ text }: any) => getTypeLabel(text),
  },
  { title: '作者', dataIndex: 'author', width: 100 },
  { title: '链接', dataIndex: 'url', width: 140, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    sorter: true,
    customRender: ({ text }: any) =>
      text === 0
        ? h(Tag, { color: 'default' }, () => '下架')
        : h(Tag, { color: 'green' }, () => '上架'),
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 260,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleView(record.id) },
          () => '详情',
        ),
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.id) },
          () => '编辑',
        ),
        record.status === 0
          ? h(
              Button,
              { size: 'small', onClick: () => handleUp([record.id]) },
              () => '上架',
            )
          : h(
              Button,
              { size: 'small', onClick: () => handleDown([record.id]) },
              () => '下架',
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
    if (searchForm.value.type) params.type = String(searchForm.value.type);
    if (searchForm.value.status !== undefined)
      params.status = String(searchForm.value.status);
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    const res = await getRecommendListApi(params);
    const data = res?.page;
    tableData.value = data?.list ?? [];
    total.value = data?.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(_p: any, _f: any, s: any) {
  if (s.order) {
    sortField.value = s.field;
    sortOrder.value = s.order === 'ascend' ? 'asc' : 'desc';
  } else {
    sortField.value = '';
    sortOrder.value = '';
  }
  loadData();
}

function onSearch() {
  page.value = 1;
  loadData();
}
function onClearSearch() {
  searchForm.value.title = '';
  searchForm.value.type = undefined;
  searchForm.value.status = undefined;
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

async function handleUp(ids: number[]) {
  try {
    await upRecommendApi(ids);
    message.success('上架成功');
    loadData();
  } catch {
    /* */
  }
}
async function handleDown(ids: number[]) {
  try {
    await downRecommendApi(ids);
    message.success('下架成功');
    loadData();
  } catch {
    /* */
  }
}
async function handleDelete(ids: number[]) {
  try {
    await deleteRecommendApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

function handleBatchUp() {
  if (!hasSelected.value) {
    message.warning('请先选择推荐');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认上架选中的 ${ids.length} 条推荐吗？`,
    title: '批量上架',
    onOk: async () => {
      await handleUp(ids);
    },
  });
}
function handleBatchDown() {
  if (!hasSelected.value) {
    message.warning('请先选择推荐');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认下架选中的 ${ids.length} 条推荐吗？`,
    title: '批量下架',
    onOk: async () => {
      await handleDown(ids);
    },
  });
}
function handleBatchDelete() {
  if (!hasSelected.value) {
    message.warning('请先选择推荐');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认删除选中的 ${ids.length} 条推荐吗？此操作不可恢复。`,
    title: '批量删除',
    okType: 'danger',
    okText: '确认删除',
    onOk: async () => {
      await handleDelete(ids);
    },
  });
}

// --- 新增/编辑 ---
const modalVisible = ref(false);
const modalTitle = ref('新增推荐');
const formData = ref<Record<string, any>>({ type: 1, status: 1 });
const formRef = ref();
const imageUploading = ref(false);

async function handleImageUpload({ file, onSuccess, onError }: any) {
  try {
    const res = await uploadOssFileApi(file);
    formData.value.coverImage = res?.url ?? '';
    onSuccess(res, file);
  } catch (err) {
    onError(err);
  }
}

function openModal() {
  modalTitle.value = '新增推荐';
  formData.value = { type: 1, status: 1 };
  modalVisible.value = true;
}

async function handleEdit(id: number) {
  modalTitle.value = '编辑推荐';
  try {
    const res = await getRecommendApi(id);
    formData.value = res?.recommend ?? {};
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
    ? updateRecommendApi(formData.value)
    : createRecommendApi(formData.value));
  message.success('保存成功');
  modalVisible.value = false;
  loadData();
}

// --- 详情 ---
const detailVisible = ref(false);
const detailData = ref<Record<string, any>>({});

async function handleView(id: number) {
  try {
    const res = await getRecommendApi(id);
    detailData.value = res?.recommend ?? {};
  } catch {
    /* */
  }
  detailVisible.value = true;
}

loadData();
</script>

<template>
  <Page description="管理推荐内容" title="推荐管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input
            v-model:value="searchForm.title"
            allow-clear
            placeholder="标题"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="类型">
          <Select
            v-model:value="searchForm.type"
            allow-clear
            placeholder="类型"
            style="width: 130px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option
              v-for="o in typeOptions"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="searchForm.status"
            allow-clear
            placeholder="推荐状态"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="1">上架</Select.Option>
            <Select.Option :value="0">下架</Select.Option>
          </Select>
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
    <Card title="推荐列表">
      <template #extra>
        <Space>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchUp">
            批量上架
          </Button>
          <Button
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchDown"
          >
            批量下架
          </Button>
          <Button
            :disabled="!hasSelected"
            danger
            size="small"
            type="dashed"
            @click="handleBatchDelete"
          >
            批量删除
          </Button>
          <Button type="primary" size="small" @click="openModal">
            新增推荐
          </Button>
        </Space>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        :row-selection="rowSelection"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
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

    <!-- 新增/编辑弹窗 -->
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
          <Input v-model:value="formData.title" />
        </Form.Item>
        <Form.Item label="类型" name="type" :rules="[{ required: true }]">
          <Select v-model:value="formData.type" :options="typeOptions" />
        </Form.Item>
        <Form.Item label="作者" name="author">
          <Input v-model:value="formData.author" />
        </Form.Item>
        <Form.Item label="封面图" name="coverImage">
          <Space>
            <Input v-model:value="formData.coverImage" placeholder="图片URL" style="width: 360px" />
            <Upload
              :show-upload-list="false"
              :custom-request="handleImageUpload"
              accept="image/*"
            >
              <Button :loading="imageUploading">上传</Button>
            </Upload>
          </Space>
        </Form.Item>
        <div v-if="formData.coverImage" class="mb-4">
          <Image
            :src="formData.coverImage"
            style="max-height: 160px; border-radius: 6px"
          />
        </div>
        <Form.Item label="链接" name="url">
          <Input v-model:value="formData.url" placeholder="https://..." />
        </Form.Item>
        <Form.Item label="内容" name="content">
          <Input.TextArea
            v-model:value="formData.content"
            :rows="3"
            placeholder="推荐描述"
          />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select v-model:value="formData.status">
            <Select.Option :value="1">上架</Select.Option>
            <Select.Option :value="0">下架</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <!-- 详情弹窗 -->
    <Modal
      v-model:open="detailVisible"
      :title="detailData.title || '推荐详情'"
      :footer="null"
      width="640px"
    >
      <div class="flex flex-col gap-4">
        <div v-if="detailData.coverImage" class="overflow-hidden rounded-lg">
          <Image
            :src="detailData.coverImage"
            class="w-full max-h-60 object-cover"
            :preview="true"
          />
        </div>
        <div class="detail-block rounded-lg p-4 text-sm">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <strong>类型：</strong>{{ getTypeLabel(detailData.type) }}
            </div>
            <div><strong>作者：</strong>{{ detailData.author || '-' }}</div>
            <div>
              <strong>状态：</strong>
              {{ detailData.status === 0 ? '下架' : '上架' }}
            </div>
            <div>
              <strong>创建时间：</strong>{{ detailData.createTime || '-' }}
            </div>
            <div v-if="detailData.url" class="col-span-2">
              <strong>链接：</strong>{{ detailData.url }}
            </div>
          </div>
        </div>
        <div
          v-if="detailData.content"
          class="detail-block rounded-lg p-4 text-sm"
        >
          <div class="detail-title">内容</div>
          <div class="whitespace-pre-wrap break-words leading-relaxed">
            {{ detailData.content }}
          </div>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.detail-block {
  background: var(--ant-color-bg-container);
  border: 2px solid var(--ant-color-border-secondary);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.detail-title {
  padding: 8px 12px;
  margin: -2px -2px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-primary-text);
  background: var(--ant-color-primary-bg);
  border-radius: 10px 10px 0 0;
}
</style>
