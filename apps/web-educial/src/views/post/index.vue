<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Avatar,
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
  Tag,
} from 'ant-design-vue';

import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryListApi,
  updateCategoryApi,
} from '#/api/modules/category';
import { deleteCommentApi, getCommentListApi } from '#/api/modules/comment';
import {
  deletePostApi,
  downPostApi,
  getPostListApi,
  upPostApi,
} from '#/api/modules/post';

defineOptions({ name: 'PostManage' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({
  title: '',
  author: '',
  cut: undefined as number | undefined,
  status: undefined as number | undefined,
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');
const selectedRows = ref<any[]>([]);

// --- 分类 ---
const categoryList = ref<any[]>([]);
const cateModalVisible = ref(false);
const editingCateId = ref<null | number>(null);
const editingCateName = ref('');
const editingOrderNum = ref(0);
const newCateName = ref('');

async function loadCategories() {
  try {
    const res = await getCategoryListApi({ page: 1, limit: 999 });
    categoryList.value = res?.page?.list ?? [];
  } catch {
    /* */
  }
}

async function handleAddCategory() {
  const name = newCateName.value.trim();
  if (!name) return;
  try {
    await createCategoryApi({ cateName: name });
    message.success('分类已添加');
    newCateName.value = '';
    loadCategories();
  } catch {
    /* */
  }
}

function startEditCategory(item: any) {
  editingCateId.value = item.cateId;
  editingCateName.value = item.cateName;
  editingOrderNum.value = item.orderNum ?? 0;
}

async function saveEditCategory() {
  const name = editingCateName.value.trim();
  if (!name || editingCateId.value === null) return;
  try {
    await updateCategoryApi({
      cateId: editingCateId.value,
      cateName: name,
      orderNum: editingOrderNum.value,
    });
    message.success('分类已更新');
    editingCateId.value = null;
    editingCateName.value = '';
    editingOrderNum.value = 0;
    loadCategories();
  } catch {
    /* */
  }
}

function cancelEditCategory() {
  editingCateId.value = null;
  editingCateName.value = '';
  editingOrderNum.value = 0;
}

async function handleDeleteCategory(cateId: number) {
  try {
    await deleteCategoryApi([cateId]);
    message.success('分类已删除');
    loadCategories();
  } catch {
    /* */
  }
}

const hasSelected = computed(() => selectedRowKeys.value.length > 0);

const rowSelection = computed(() => ({
  onChange: (keys: Key[], rows: any[]) => {
    selectedRowKeys.value = keys;
    selectedRows.value = rows;
  },
  selectedRowKeys: selectedRowKeys.value,
}));

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 60,
    sorter: true,
  },
  { title: '标题', dataIndex: 'title', width: 140, ellipsis: true },
  { title: '分类', dataIndex: 'cateName', width: 80 },
  {
    title: '作者',
    width: 160,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Avatar, { size: 24, src: record?.userInfo?.avatar }),
        h('span', record?.userInfo?.username ?? ''),
      ]),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    sorter: true,
    customRender: ({ text }: any) => {
      return text === 1
        ? h(Tag, { color: 'orange' }, () => '下架')
        : h(Tag, { color: 'green' }, () => '上架');
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 180,
    sorter: true,
  },
  {
    title: '操作',
    width: 380,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          {
            size: 'small',
            onClick: () => handleViewDetail(record),
          },
          () => '详情',
        ),
        h(Button, {
          size: 'small',
          icon: h(IconifyIcon, {
            icon: 'ant-design:link-outlined',
            class: 'size-3',
          }),
          onClick: () =>
            window.open(
              `https://www.educial.net/#/pages/post/post?id=${record.id}`,
              '_blank',
            ),
        }),
        h(
          Button,
          {
            size: 'small',
            onClick: () => handleViewComments(record.id, record.title),
          },
          () => '评论',
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
    const params: Record<string, any> = {
      page: page.value,
      limit: pageSize.value,
    };
    if (searchForm.value.title) params.title = searchForm.value.title;
    if (searchForm.value.author) params.author = searchForm.value.author;
    if (searchForm.value.cut) params.cut = String(searchForm.value.cut);
    if (searchForm.value.status !== undefined)
      params.status = String(searchForm.value.status);
    if (sortField.value) {
      params.sidx = sortField.value;
      params.order = sortOrder.value;
    }
    const res = await getPostListApi(params);
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
  searchForm.value.author = '';
  searchForm.value.cut = undefined;
  searchForm.value.status = undefined;
  page.value = 1;
  loadData();
}
function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deletePostApi(ids);
    message.success('删除成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}
async function handleUp(ids: number[]) {
  try {
    await upPostApi(ids);
    message.success('上架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}
async function handleDown(ids: number[]) {
  try {
    await downPostApi(ids);
    message.success('下架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

function handleBatchUp() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认上架选中的 ${ids.length} 个帖子吗？`,
    title: '批量上架',
    onOk: async () => {
      await handleUp(ids);
    },
  });
}

function handleBatchDown() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认下架选中的 ${ids.length} 个帖子吗？`,
    title: '批量下架',
    onOk: async () => {
      await handleDown(ids);
    },
  });
}

function handleBatchDelete() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认删除选中的 ${ids.length} 个帖子吗？此操作不可恢复。`,
    title: '批量删除',
    okType: 'danger',
    okText: '确认删除',
    onOk: async () => {
      await handleDelete(ids);
    },
  });
}

// --- 评论弹窗 ---
const commentModalVisible = ref(false);
const commentModalKey = ref(0);
const commentPostTitle = ref('');
const commentPostId = ref<number>(0);
const commentLoading = ref(false);
const commentData = ref<any[]>([]);
const commentTotal = ref(0);
const commentPage = ref(1);
const commentPageSize = ref(10);

const commentColumns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '内容', dataIndex: 'content', width: 260, ellipsis: true },
  {
    title: '回复',
    dataIndex: 'toUsername',
    width: 120,
    customRender: ({ text }: any) => (text ? `@${text}` : ''),
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 80,
    fixed: 'right' as const,
    customRender: ({ record: cmt }: any) =>
      h(
        Popconfirm,
        {
          title: '确认删除此评论?',
          onConfirm: () => handleDeleteComment(cmt.id),
        },
        {
          default: () =>
            h(Button, { size: 'small', danger: true }, () => '删除'),
        },
      ),
  },
];

async function loadComments() {
  commentLoading.value = true;
  try {
    const res = await getCommentListApi({
      page: commentPage.value,
      limit: commentPageSize.value,
      postId: commentPostId.value,
    });
    const data = res?.page;
    commentData.value = data?.list ?? [];
    commentTotal.value = data?.totalCount ?? 0;
  } finally {
    commentLoading.value = false;
  }
}

function onCommentPageChange(p: number, ps: number) {
  commentPage.value = p;
  commentPageSize.value = ps;
  loadComments();
}

async function handleDeleteComment(id: number) {
  try {
    await deleteCommentApi([id]);
    message.success('评论已删除');
    loadComments();
  } catch {
    /* */
  }
}

function handleViewComments(postId: number, title: string) {
  commentPostId.value = postId;
  commentPostTitle.value = title;
  commentPage.value = 1;
  commentModalKey.value++;
  commentModalVisible.value = true;
  loadComments();
}

// --- 帖子详情弹窗 ---
const detailModalVisible = ref(false);
const detailData = ref<Record<string, any>>({});
const detailMedia = ref<string[]>([]);
const currentVideo = ref('');

const mediaGridClass = computed(() => {
  const n = detailMedia.value.length;
  if (n === 1) return 'grid-1';
  if (n === 2) return 'grid-2';
  if (n === 4) return 'grid-4';
  return 'grid-3';
});

function isVideoUrl(url: string) {
  const u = url.split('?')[0] || '';
  return /\.(mp4|mov|webm|avi|mkv|flv|wmv|m3u8|m4v)$/i.test(u);
}

function handleViewDetail(record: Record<string, any>) {
  detailData.value = record;
  detailMedia.value = record?.media ?? [];
  currentVideo.value = '';
  detailModalVisible.value = true;
}

function playVideo(url: string) {
  currentVideo.value = url;
}

loadData();
loadCategories();
</script>

<template>
  <Page description="管理社区帖子" title="帖子管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题">
          <Input
            v-model:value="searchForm.title"
            allow-clear
            placeholder="帖子标题"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="作者">
          <Input
            v-model:value="searchForm.author"
            allow-clear
            placeholder="作者用户名"
            @clear="onSearch"
            @press-enter="onSearch"
          />
        </Form.Item>
        <Form.Item label="分类">
          <Select
            v-model:value="searchForm.cut"
            allow-clear
            placeholder="选择分类"
            style="width: 140px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option
              v-for="c in categoryList"
              :key="c.cateId"
              :value="c.cateId"
            >
              {{ c.cateName }}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="searchForm.status"
            allow-clear
            placeholder="帖子状态"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="0">上架</Select.Option>
            <Select.Option :value="1">下架</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="帖子列表">
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
          <Button
            size="small"
            @click="
              cateModalVisible = true;
              loadCategories();
            "
          >
            分类管理
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
        :scroll="{ x: 1050 }"
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

    <Modal
      :key="commentModalKey"
      v-model:open="commentModalVisible"
      :title="`评论 - ${commentPostTitle}`"
      :footer="null"
      width="800px"
    >
      <Table
        :columns="commentColumns"
        :data-source="commentData"
        :loading="commentLoading"
        :pagination="false"
        row-key="id"
        size="middle"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="commentPage"
          v-model:page-size="commentPageSize"
          :total="commentTotal"
          show-size-changer
          @change="onCommentPageChange"
        />
      </div>
    </Modal>

    <Modal
      v-model:open="detailModalVisible"
      :title="detailData.title || '帖子详情'"
      :footer="null"
      width="720px"
    >
      <div class="flex flex-col gap-4">
        <!-- 用户信息 -->
        <div class="flex items-center gap-3">
          <Avatar :size="40" :src="detailData.userInfo?.avatar" />
          <div>
            <div class="font-medium">
              {{ detailData.userInfo?.username ?? '-' }}
            </div>
            <div class="text-xs text-gray-400">{{ detailData.createTime }}</div>
          </div>
          <Tag
            :color="detailData.status === 1 ? 'orange' : 'green'"
            class="ml-auto"
          >
            {{ detailData.status === 1 ? '下架' : '上架' }}
          </Tag>
        </div>

        <!-- 正文 -->
        <div
          v-if="detailData.content"
          class="whitespace-pre-wrap break-words rounded-lg detail-block p-4 text-sm leading-relaxed"
        >
          {{ detailData.content }}
        </div>

        <!-- 媒体九宫格 -->
        <div v-if="detailMedia.length > 0">
          <div class="mb-2 text-xs text-gray-400">
            附件 {{ detailMedia.length }} 项
          </div>
          <div class="media-grid" :class="[mediaGridClass]">
            <template v-for="(url, idx) in detailMedia" :key="idx">
              <div
                v-if="isVideoUrl(url)"
                class="media-cell video-cell"
                :class="[{ active: currentVideo === url }]"
                @click="playVideo(url)"
              >
                <div class="play-overlay">&#9654;</div>
              </div>
              <div v-else class="media-cell">
                <Image :src="url" class="media-img" :preview="true" />
              </div>
            </template>
          </div>
        </div>

        <!-- 视频播放器 -->
        <div v-if="currentVideo" class="overflow-hidden rounded-lg bg-black">
          <video
            :src="currentVideo"
            controls
            autoplay
            class="w-full"
            style="max-height: 400px"
          >
            您的浏览器不支持视频播放
          </video>
          <div class="flex justify-end bg-black px-3 pb-2">
            <Button size="small" ghost @click="currentVideo = ''">关闭</Button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- 分类管理弹窗 -->
    <Modal
      v-model:open="cateModalVisible"
      title="分类管理"
      :footer="null"
      width="480px"
    >
      <!-- 现有分类列表 -->
      <Table
        :data-source="categoryList"
        :pagination="false"
        row-key="cateId"
        size="small"
        :columns="[
          { title: 'ID', dataIndex: 'cateId', width: 60 },
          { title: '分类名', dataIndex: 'cateName' },
          { title: '排序', dataIndex: 'orderNum', width: 70 },
          {
            title: '操作',
            width: 140,
            customRender: ({ record: ct }: any) =>
              editingCateId === ct.cateId
                ? h(Space, () => [
                    h(
                      Button,
                      {
                        size: 'small',
                        type: 'primary',
                        onClick: saveEditCategory,
                      },
                      () => '保存',
                    ),
                    h(
                      Button,
                      { size: 'small', onClick: cancelEditCategory },
                      () => '取消',
                    ),
                  ])
                : h(Space, () => [
                    h(
                      Button,
                      { size: 'small', onClick: () => startEditCategory(ct) },
                      () => '编辑',
                    ),
                    h(
                      Popconfirm,
                      {
                        title: '确认删除?',
                        onConfirm: () => handleDeleteCategory(ct.cateId),
                      },
                      {
                        default: () =>
                          h(
                            Button,
                            { size: 'small', danger: true },
                            () => '删除',
                          ),
                      },
                    ),
                  ]),
          },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template
            v-if="
              column.dataIndex === 'cateName' && editingCateId === record.cateId
            "
          >
            <Input
              v-model:value="editingCateName"
              size="small"
              @press-enter="saveEditCategory"
            />
          </template>
          <template
            v-else-if="
              column.dataIndex === 'orderNum' && editingCateId === record.cateId
            "
          >
            <InputNumber
              v-model:value="editingOrderNum"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </template>
        </template>
      </Table>

      <!-- 新增分类 -->
      <div class="mt-3 flex gap-2">
        <Input
          v-model:value="newCateName"
          size="small"
          placeholder="新分类名称"
          @press-enter="handleAddCategory"
        />
        <Button size="small" type="primary" @click="handleAddCategory">
          添加
        </Button>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.media-grid {
  --gap: 6px;

  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
}

.media-cell {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background-color: #f0f0f0;
  border-radius: 6px;
}

.media-img {
  display: block;
  width: 100%;
  height: 100%;
}

.media-img :deep(.ant-image) {
  width: 100%;
  height: 100%;
}

.media-img :deep(.ant-image-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2a2a2a;
}

.play-overlay {
  font-size: 32px;
  color: rgb(255 255 255 / 85%);
  pointer-events: none;
}

.video-cell.active {
  box-shadow: 0 0 0 2px #1677ff;
}

/* 1 张：居中正方形，aspectFit */
.grid-1 .media-cell {
  width: 60%;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}

.grid-1 .media-img :deep(.ant-image-img) {
  object-fit: contain;
}

/* 2 张：两列方形 */
.grid-2 .media-cell {
  flex: 1;
  min-width: 0;
  aspect-ratio: 1 / 1;
}

/* 4 张：两列两行 */
.grid-4 .media-cell {
  width: calc((100% - var(--gap)) / 2);
  aspect-ratio: 1 / 1;
}

/* 3/5+ 张：三列流式，自动换行 */
.grid-3 .media-cell {
  width: calc((100% - var(--gap) * 2) / 3);
  aspect-ratio: 1 / 1;
}

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

.detail-row {
  color: var(--ant-color-text-secondary);
}

.detail-row strong {
  color: var(--ant-color-text);
}
</style>
