<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';
import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Avatar,
  Button,
  Card,
  DatePicker,
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
import {
  deleteCommentApi,
  downCommentApi,
  getCommentListApi,
  upCommentApi,
} from '#/api/modules/comment';
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
  postTop: undefined as number | undefined,
  timeRange: '' as '' | 'today' | 'week' | 'month',
  dateRange: [] as any[],
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');
const selectedRows = ref<any[]>([]);

const downReasonVisible = ref(false);
const downReason = ref('');
const pendingDownIds = ref<number[]>([]);

// 分类
const categoryList = ref<any[]>([]);
const cateModalVisible = ref(false);
const editingCateId = ref<null | number>(null);
const editingCateName = ref('');
const editingOrderNum = ref(0);
const newCateName = ref('');

async function loadCategories() {
  try { const res = await getCategoryListApi({ page: 1, limit: 999 }); categoryList.value = res?.page?.list ?? []; } catch { /* */ }
}
async function handleAddCategory() {
  const name = newCateName.value.trim(); if (!name) return;
  try { await createCategoryApi({ cateName: name }); message.success('分类已添加'); newCateName.value = ''; loadCategories(); } catch { /* */ }
}
function startEditCategory(item: any) { editingCateId.value = item.cateId; editingCateName.value = item.cateName; editingOrderNum.value = item.orderNum ?? 0; }
async function saveEditCategory() {
  const name = editingCateName.value.trim(); if (!name || editingCateId.value === null) return;
  try { await updateCategoryApi({ cateId: editingCateId.value, cateName: name, orderNum: editingOrderNum.value }); message.success('分类已更新'); editingCateId.value = null; editingCateName.value = ''; editingOrderNum.value = 0; loadCategories(); } catch { /* */ }
}
function cancelEditCategory() { editingCateId.value = null; editingCateName.value = ''; editingOrderNum.value = 0; }
async function handleDeleteCategory(cateId: number) { try { await deleteCategoryApi([cateId]); message.success('分类已删除'); loadCategories(); } catch { /* */ } }

const hasSelected = computed(() => selectedRowKeys.value.length > 0);
const rowSelection = computed(() => ({
  onChange: (keys: Key[], rows: any[]) => { selectedRowKeys.value = keys; selectedRows.value = rows; },
  selectedRowKeys: selectedRowKeys.value,
}));

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60, sorter: true },
  { title: '标题', dataIndex: 'title', width: 140, ellipsis: true },
  { title: '分类', dataIndex: 'cateName', width: 80 },
  {
    title: '作者', width: 160,
    customRender: ({ record }: any) => h(Space, () => [h(Avatar, { size: 24, src: record?.userInfo?.avatar }), h('span', record?.userInfo?.username ?? '')]),
  },
  {
    title: '置顶', dataIndex: 'postTop', width: 70,
    customRender: ({ text }: any) => text === 1 ? h(Tag, { color: 'blue' }, () => '置顶') : '',
  },
  {
    title: '状态', dataIndex: 'status', width: 80, sorter: true,
    customRender: ({ text }: any) => text === 1 ? h(Tag, { color: 'green' }, () => '正常') : h(Tag, { color: 'orange' }, () => '已下架'),
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170, sorter: true },
  {
    title: '操作', width: 380, fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Button, { size: 'small', onClick: () => handleViewDetail(record) }, () => '详情'),
        h(Button, { size: 'small', icon: h(IconifyIcon, { icon: 'ant-design:link-outlined', class: 'size-3' }), onClick: () => window.open(`https://www.educial.net/#/pages/post/post?id=${record.id}`, '_blank') }),
        h(Button, { size: 'small', onClick: () => handleViewComments(record.id, record.title) }, () => '评论'),
        record.status === 1
          ? h(Button, { size: 'small', onClick: () => openDownReasonModal([record.id]) }, () => '驳回')
          : h(Button, { size: 'small', type: 'primary', onClick: () => handleUp([record.id]) }, () => '通过'),
        h(Popconfirm, { title: '确认删除?', onConfirm: () => handleDelete([record.id]) }, { default: () => h(Button, { size: 'small', danger: true }, () => '删除') }),
      ]),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, limit: pageSize.value };
    if (searchForm.value.title) params.title = searchForm.value.title;
    if (searchForm.value.author) params.author = searchForm.value.author;
    if (searchForm.value.cut) params.cut = String(searchForm.value.cut);
    if (searchForm.value.status !== undefined) params.status = String(searchForm.value.status);
    if (searchForm.value.postTop !== undefined) params.postTop = String(searchForm.value.postTop);
    let startTime = '', endTime = '';
    if (searchForm.value.timeRange) {
      const now = dayjs();
      if (searchForm.value.timeRange === 'today') { startTime = now.startOf('day').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('day').format('YYYY-MM-DD HH:mm:ss'); }
      else if (searchForm.value.timeRange === 'week') { startTime = now.startOf('week').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('week').format('YYYY-MM-DD HH:mm:ss'); }
      else if (searchForm.value.timeRange === 'month') { startTime = now.startOf('month').format('YYYY-MM-DD HH:mm:ss'); endTime = now.endOf('month').format('YYYY-MM-DD HH:mm:ss'); }
    } else if (searchForm.value.dateRange?.length === 2) {
      startTime = dayjs(searchForm.value.dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      endTime = dayjs(searchForm.value.dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss');
    }
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    if (sortField.value) { params.sidx = sortField.value; params.order = sortOrder.value; }
    const res = await getPostListApi(params);
    const data = res?.page;
    tableData.value = data?.list ?? [];
    total.value = data?.totalCount ?? 0;
  } finally { loading.value = false; }
}

function handleTableChange(_p: any, _f: any, s: any) {
  if (s.order) { sortField.value = s.field; sortOrder.value = s.order === 'ascend' ? 'asc' : 'desc'; }
  else { sortField.value = ''; sortOrder.value = ''; }
  loadData();
}
function onSearch() { page.value = 1; loadData(); }
function onClearSearch() { searchForm.value = { title: '', author: '', cut: undefined, status: undefined, postTop: undefined, timeRange: '', dateRange: [] }; page.value = 1; loadData(); }
function onRefresh() { loadData(); }
function onTimeRangeChange() { searchForm.value.dateRange = []; }
function onDateRangeChange() { searchForm.value.timeRange = ''; onSearch(); }
function onPageChange(p: number, ps: number) { page.value = p; pageSize.value = ps; loadData(); }

async function handleDelete(ids: number[]) { try { await deletePostApi(ids); message.success('删除成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }
async function handleUp(ids: number[]) { try { await upPostApi(ids); message.success('上架成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }
async function handleDown(ids: number[], reason?: string) { try { await downPostApi({ ids, reason: reason || undefined }); message.success('下架成功'); selectedRowKeys.value = []; loadData(); } catch { /* */ } }
function openDownReasonModal(ids: number[]) { pendingDownIds.value = ids; downReason.value = ''; downReasonVisible.value = true; }
async function confirmDownWithReason() {
  if (!pendingDownIds.value.length) return;
  await handleDown(pendingDownIds.value, downReason.value.trim() || undefined);
  downReasonVisible.value = false; pendingDownIds.value = []; downReason.value = '';
}

function handleBatchUp() { if (!hasSelected.value) { message.warning('请先选择帖子'); return; } Modal.confirm({ content: `确认上架选中的 ${selectedRowKeys.value.length} 个帖子吗？`, title: '批量通过', onOk: async () => { await handleUp(selectedRowKeys.value as number[]); } }); }
function handleBatchDown() { if (!hasSelected.value) { message.warning('请先选择帖子'); return; } openDownReasonModal(selectedRowKeys.value as number[]); }
function handleBatchDelete() {
  if (!hasSelected.value) { message.warning('请先选择帖子'); return; }
  Modal.confirm({ content: `确认删除选中的 ${selectedRowKeys.value.length} 个帖子吗？此操作不可恢复。`, title: '批量删除', okType: 'danger', okText: '确认删除', onOk: async () => { await handleDelete(selectedRowKeys.value as number[]); } });
}

// 评论
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
  { title: '内容', dataIndex: 'content', width: 220, ellipsis: true },
  { title: '回复', dataIndex: 'toUsername', width: 100, customRender: ({ text }: any) => text ? `@${text}` : '' },
  { title: '状态', dataIndex: 'status', width: 80, customRender: ({ text }: any) => text === 0 ? h(Tag, { color: 'orange' }, () => '已下架') : h(Tag, { color: 'green' }, () => '正常') },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作', width: 180, fixed: 'right' as const,
    customRender: ({ record: cmt }: any) =>
      h(Space, () => [
        cmt.status === 0 ? h(Button, { size: 'small', type: 'primary', onClick: () => handleUpComment(cmt.id) }, () => '通过') : h(Button, { size: 'small', onClick: () => handleDownComment(cmt.id) }, () => '驳回'),
        h(Popconfirm, { title: '确认删除此评论?', onConfirm: () => handleDeleteComment(cmt.id) }, { default: () => h(Button, { size: 'small', danger: true }, () => '删除') }),
      ]),
  },
];
async function loadComments() {
  commentLoading.value = true;
  try { const res = await getCommentListApi({ page: commentPage.value, limit: commentPageSize.value, postId: commentPostId.value }); const data = res?.page; commentData.value = data?.list ?? []; commentTotal.value = data?.totalCount ?? 0; } finally { commentLoading.value = false; }
}
function onCommentPageChange(p: number, ps: number) { commentPage.value = p; commentPageSize.value = ps; loadComments(); }
async function handleDeleteComment(id: number) { try { await deleteCommentApi([id]); message.success('评论已删除'); loadComments(); } catch { /* */ } }
async function handleUpComment(id: number) { try { await upCommentApi([id]); message.success('已通过'); loadComments(); } catch { /* */ } }
async function handleDownComment(id: number) { try { await downCommentApi([id]); message.success('已驳回'); loadComments(); } catch { /* */ } }
function handleViewComments(postId: number, title: string) { commentPostId.value = postId; commentPostTitle.value = title; commentPage.value = 1; commentModalKey.value++; commentModalVisible.value = true; loadComments(); }

// 帖子详情
const detailModalVisible = ref(false);
const detailData = ref<Record<string, any>>({});
const detailMedia = ref<string[]>([]);
const currentVideo = ref('');
const detailReviewReason = ref('');

const mediaGridClass = computed(() => {
  const n = detailMedia.value.length;
  if (n === 1) return 'grid-1'; if (n === 2) return 'grid-2'; if (n === 4) return 'grid-4'; return 'grid-3';
});
function isVideoUrl(url: string) { const u = url.split('?')[0] || ''; return /\.(mp4|mov|webm|avi|mkv|flv|wmv|m3u8|m4v)$/i.test(u); }
function handleViewDetail(record: Record<string, any>) { detailData.value = record; detailMedia.value = record?.media ?? []; currentVideo.value = ''; detailReviewReason.value = ''; detailModalVisible.value = true; }
function playVideo(url: string) { currentVideo.value = url; }
async function handleDetailUp() { try { await upPostApi([detailData.value.id]); message.success('已通过'); detailData.value.status = 1; detailReviewReason.value = ''; loadData(); } catch { /* */ } }
async function handleDetailDown() { try { const reason = detailReviewReason.value.trim() || undefined; await downPostApi({ ids: [detailData.value.id], reason }); message.success('已驳回'); detailData.value.status = 0; detailReviewReason.value = ''; loadData(); } catch { /* */ } }

loadData();
loadCategories();
</script>

<template>
  <Page description="管理社区帖子" title="帖子管理">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="标题"><Input v-model:value="searchForm.title" allow-clear placeholder="帖子标题" @clear="onSearch" @press-enter="onSearch" /></Form.Item>
        <Form.Item label="作者"><Input v-model:value="searchForm.author" allow-clear placeholder="作者用户名" @clear="onSearch" @press-enter="onSearch" /></Form.Item>
        <Form.Item label="分类">
          <Select v-model:value="searchForm.cut" allow-clear placeholder="选择分类" style="width: 140px" @change="onSearch" @clear="onSearch">
            <Select.Option v-for="c in categoryList" :key="c.cateId" :value="c.cateId">{{ c.cateName }}</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="searchForm.status" allow-clear placeholder="帖子状态" style="width: 110px" @change="onSearch" @clear="onSearch">
            <Select.Option :value="1">正常</Select.Option>
            <Select.Option :value="0">已下架</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="置顶">
          <Select v-model:value="searchForm.postTop" allow-clear placeholder="是否置顶" style="width: 110px" @change="onSearch" @clear="onSearch">
            <Select.Option :value="1">置顶</Select.Option>
            <Select.Option :value="0">未置顶</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="时间">
          <Select v-model:value="searchForm.timeRange" allow-clear placeholder="全部时间" style="width: 110px" @change="onTimeRangeChange(); onSearch()" @clear="onTimeRangeChange(); onSearch()">
            <Select.Option value="today">今天</Select.Option>
            <Select.Option value="week">本周</Select.Option>
            <Select.Option value="month">本月</Select.Option>
          </Select>
          <DatePicker.RangePicker v-model:value="searchForm.dateRange" style="width: 240px" @change="onDateRangeChange" />
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
    <Card title="帖子列表">
      <template #extra>
        <Space>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchUp">批量通过</Button>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchDown">批量驳回</Button>
          <Button :disabled="!hasSelected" danger size="small" type="dashed" @click="handleBatchDelete">批量删除</Button>
          <Button size="small" @click="cateModalVisible = true; loadCategories();">分类管理</Button>
        </Space>
      </template>
      <Table :columns="columns" :data-source="tableData" :loading="loading" :pagination="false" :row-selection="rowSelection" row-key="id" size="middle" :scroll="{ x: 1150 }" @change="handleTableChange" />
      <div class="mt-4 flex justify-end">
        <Pagination v-model:current="page" v-model:page-size="pageSize" :total="total" show-size-changer @change="onPageChange" />
      </div>
    </Card>

    <!-- 评论 -->
    <Modal :key="commentModalKey" v-model:open="commentModalVisible" :title="`评论 - ${commentPostTitle}`" :footer="null" width="900px">
      <Table :columns="commentColumns" :data-source="commentData" :loading="commentLoading" :pagination="false" row-key="id" size="middle" :scroll="{ x: 750 }" />
      <div class="mt-4 flex justify-end"><Pagination v-model:current="commentPage" v-model:page-size="commentPageSize" :total="commentTotal" show-size-changer @change="onCommentPageChange" /></div>
    </Modal>

    <!-- 帖子详情 -->
    <Modal v-model:open="detailModalVisible" :title="detailData.title || '帖子详情'" :footer="null" width="720px">
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <Avatar :size="40" :src="detailData.userInfo?.avatar" />
          <div><div class="font-medium">{{ detailData.userInfo?.username ?? '-' }}</div><div class="text-xs text-gray-400">{{ detailData.createTime }}</div></div>
          <Tag :color="detailData.status === 0 ? 'orange' : 'green'" class="ml-auto">{{ detailData.status === 0 ? '已下架' : '正常' }}</Tag>
        </div>
        <div v-if="detailData.content" class="whitespace-pre-wrap break-words rounded-lg detail-block p-4 text-sm leading-relaxed">{{ detailData.content }}</div>
        <div v-if="detailMedia.length > 0">
          <div class="mb-2 text-xs text-gray-400">附件 {{ detailMedia.length }} 项</div>
          <div class="media-grid" :class="[mediaGridClass]">
            <template v-for="(url, idx) in detailMedia" :key="idx">
              <div v-if="isVideoUrl(url)" class="media-cell video-cell" :class="[{ active: currentVideo === url }]" @click="playVideo(url)"><div class="play-overlay">&#9654;</div></div>
              <div v-else class="media-cell"><Image :src="url" class="media-img" :preview="true" /></div>
            </template>
          </div>
        </div>
        <div v-if="currentVideo" class="overflow-hidden rounded-lg bg-black">
          <video :src="currentVideo" controls autoplay class="w-full" style="max-height: 400px">您的浏览器不支持视频播放</video>
          <div class="flex justify-end bg-black px-3 pb-2"><Button size="small" ghost @click="currentVideo = ''">关闭</Button></div>
        </div>
        <!-- 审核操作 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">审核操作</div>
          <div class="space-y-3">
            <textarea v-model="detailReviewReason" placeholder="审核原因（选填），驳回时建议填写" rows="2" maxlength="200" class="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800"></textarea>
            <Space>
              <Popconfirm v-if="detailData.status === 0" title="确认通过该帖子吗？" @confirm="handleDetailUp"><Button type="primary">通过</Button></Popconfirm>
              <Popconfirm v-if="detailData.status === 1" title="确认驳回该帖子吗？" @confirm="handleDetailDown"><Button danger>驳回</Button></Popconfirm>
            </Space>
            <div class="text-xs text-gray-400">提示：通过/驳回操作会更新对应内容的实际状态，并记录新的审核日志。</div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- 分类管理 -->
    <Modal v-model:open="cateModalVisible" title="分类管理" :footer="null" width="480px">
      <Table :data-source="categoryList" :pagination="false" row-key="cateId" size="small" :columns="[{ title: 'ID', dataIndex: 'cateId', width: 60 },{ title: '分类名', dataIndex: 'cateName' },{ title: '排序', dataIndex: 'orderNum', width: 70 },{ title: '操作', width: 140, customRender: ({ record: ct }: any) => editingCateId === ct.cateId ? h(Space, () => [h(Button, { size: 'small', type: 'primary', onClick: saveEditCategory }, () => '保存'), h(Button, { size: 'small', onClick: cancelEditCategory }, () => '取消')]) : h(Space, () => [h(Button, { size: 'small', onClick: () => startEditCategory(ct) }, () => '编辑'), h(Popconfirm, { title: '确认删除?', onConfirm: () => handleDeleteCategory(ct.cateId) }, { default: () => h(Button, { size: 'small', danger: true }, () => '删除') })]) }]">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'cateName' && editingCateId === record.cateId"><Input v-model:value="editingCateName" size="small" @press-enter="saveEditCategory" /></template>
          <template v-else-if="column.dataIndex === 'orderNum' && editingCateId === record.cateId"><InputNumber v-model:value="editingOrderNum" size="small" :min="0" style="width: 100%" /></template>
        </template>
      </Table>
      <div class="mt-3 flex gap-2"><Input v-model:value="newCateName" size="small" placeholder="新分类名称" @press-enter="handleAddCategory" /><Button size="small" type="primary" @click="handleAddCategory">添加</Button></div>
    </Modal>

    <!-- 下架原因 -->
    <Modal v-model:open="downReasonVisible" title="填写下架原因（可选）" :footer="null" @cancel="downReasonVisible = false">
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-500">请输入下架/驳回原因（选填）：</div>
        <Input v-model:value="downReason" placeholder="例如：含有严重违规内容" :maxLength="100" show-count />
        <div class="mt-2 text-xs text-gray-400">原因将记录到审核日志中，并在"我的已下架"列表中展示给作者。</div>
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button @click="downReasonVisible = false">取消</Button>
          <Button type="primary" @click="confirmDownWithReason">确认下架</Button>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.media-grid { --gap: 6px; display: flex; flex-wrap: wrap; gap: var(--gap); }

.media-cell { position: relative; overflow: hidden; cursor: pointer; background-color: #f0f0f0; border-radius: 6px; }

.media-img { display: block; width: 100%; height: 100%; }

.media-img :deep(.ant-image) { width: 100%; height: 100%; }

.media-img :deep(.ant-image-img) { width: 100%; height: 100%; object-fit: cover; }

.video-cell { display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; }

.play-overlay { font-size: 32px; color: rgb(255 255 255 / 85%); pointer-events: none; }

.video-cell.active { box-shadow: 0 0 0 2px #1677ff; }

.grid-1 .media-cell { width: 60%; aspect-ratio: 1 / 1; margin: 0 auto; }

.grid-1 .media-img :deep(.ant-image-img) { object-fit: contain; }

.grid-2 .media-cell { flex: 1; min-width: 0; aspect-ratio: 1 / 1; }

.grid-4 .media-cell { width: calc((100% - var(--gap)) / 2); aspect-ratio: 1 / 1; }

.grid-3 .media-cell { width: calc((100% - var(--gap) * 2) / 3); aspect-ratio: 1 / 1; }

.detail-block { background: var(--ant-color-bg-container); border: 2px solid var(--ant-color-border-secondary); border-radius: 10px; box-shadow: 0 2px 8px rgb(0 0 0 / 10%); }

.detail-title { padding: 8px 12px; margin: -2px -2px 12px; font-size: 13px; font-weight: 600; color: var(--ant-color-primary-text); background: var(--ant-color-primary-bg); border-radius: 10px 10px 0 0; }
</style>
