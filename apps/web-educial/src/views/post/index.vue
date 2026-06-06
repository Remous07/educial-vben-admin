<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type';

import { computed, h, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
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
import dayjs from 'dayjs';

import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryListApi,
  updateCategoryApi,
} from '#/api/modules/category';
import { getAppUserApi } from '#/api/modules/app-user';
import {
  deleteCommentApi,
  downCommentApi,
  getCommentListApi,
  upCommentApi,
} from '#/api/modules/comment';
import {
  batchTopPostApi,
  batchUntopPostApi,
  deletePostApi,
  downPostApi,
  getHotConfigApi,
  getPostListApi,
  saveHotConfigApi,
  topPostApi,
  untopPostApi,
  upPostApi,
  updatePostApi,
  type HotConfig,
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
  postTop: undefined as number | undefined, // 1=置顶, 0=未置顶
  hot: undefined as number | undefined, // 1=热门, 0=非热门
  timeRange: '' as '' | 'today' | 'week' | 'month',
  dateRange: [] as any[],
});
const selectedRowKeys = ref<Key[]>([]);
const sortField = ref('');
const sortOrder = ref('');
const selectedRows = ref<any[]>([]);

// 下架原因输入
const downReasonVisible = ref(false);
const downReason = ref('');
const pendingDownIds = ref<number[]>([]);

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
    title: '置顶',
    dataIndex: 'postTop',
    width: 70,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'blue' }, () => '置顶')
        : h('span', { style: { color: '#aaa' } }, () => '-'),
  },
  {
    title: '作者',
    width: 160,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(Avatar, { size: 24, src: record?.userInfo?.avatar }),
        h('span', {
          style: { color: '#1890ff', cursor: 'pointer' },
          onClick: () => handleViewUser(record?.userInfo?.uid ?? record?.uid),
        }, record?.userInfo?.username ?? ''),
      ]),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    sorter: true,
    customRender: ({ text }: any) => {
      return text === 1
        ? h(Tag, { color: 'green' }, () => '正常')
        : h(Tag, { color: 'orange' }, () => '已下架');
    },
  },
  {
    title: '热门',
    dataIndex: 'isHot',
    width: 65,
    customRender: ({ text }: any) => text ? h(Tag, { color: 'volcano' }, () => '热门') : '-',
  },
  { title: '浏览', dataIndex: 'readCount', width: 65, sorter: true },
  { title: '点赞', dataIndex: 'collectionCount', width: 65, sorter: true },
  { title: '评论', dataIndex: 'commentCount', width: 65, sorter: true },
  { title: '收藏', dataIndex: 'favoriteCount', width: 65, sorter: true },
  {
    title: '下架原因',
    dataIndex: 'rejectReason',
    width: 180,
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 180,
    sorter: true,
  },
  {
    title: '操作',
    width: 420,
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
        record.status === 1
          ? record.postTop === 1
            ? h(
                Popconfirm,
                {
                  title: '确认取消置顶该帖子吗？',
                  onConfirm: () => handleUntop(record.id),
                },
                {
                  default: () =>
                    h(Button, { size: 'small', danger: true }, () => '取消置顶'),
                },
              )
            : h(
                Button,
                { size: 'small', onClick: () => handleTop(record.id) },
                () => '置顶',
              )
          : null,
        record.status === 1
          ? h(
              Button,
              { size: 'small', onClick: () => openDownReasonModal([record.id]) },
              () => '驳回',
            )
          : h(
              Button,
              { size: 'small', type: 'primary', onClick: () => handleUp([record.id]) },
              () => '通过',
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
    if (searchForm.value.postTop !== undefined)
      params.postTop = String(searchForm.value.postTop);
    if (searchForm.value.hot !== undefined)
      params.hot = String(searchForm.value.hot);
    // 时间范围
    let startTime = '';
    let endTime = '';
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

function getRowClassName(record: any) {
  return record.postTop === 1 ? 'pinned-post-row' : '';
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
  searchForm.value.postTop = undefined;
  searchForm.value.hot = undefined;
  searchForm.value.timeRange = '';
  searchForm.value.dateRange = [];
  page.value = 1;
  loadData();
}

function onRefresh() {
  loadData();
}
function onTimeRangeChange() {
  searchForm.value.dateRange = [];
}
function onDateRangeChange() {
  searchForm.value.timeRange = '';
  onSearch();
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
async function handleDown(ids: number[], reason?: string) {
  try {
    await downPostApi({ ids, reason: reason || undefined });
    message.success('下架成功');
    selectedRowKeys.value = [];
    loadData();
  } catch {
    /* */
  }
}

async function handleTop(id: number) {
  try {
    await topPostApi(id);
    message.success('置顶成功');
    loadData();
  } catch {
    /* */
  }
}

async function handleUntop(id: number) {
  try {
    await untopPostApi(id);
    message.success('已取消置顶');
    loadData();
  } catch {
    /* */
  }
}

function openDownReasonModal(ids: number[]) {
  pendingDownIds.value = ids;
  downReason.value = '';
  downReasonVisible.value = true;
}

async function confirmDownWithReason() {
  if (!pendingDownIds.value.length) return;
  await handleDown(pendingDownIds.value, downReason.value.trim() || undefined);
  downReasonVisible.value = false;
  pendingDownIds.value = [];
  downReason.value = '';
}

function handleBatchUp() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }
  const ids = selectedRowKeys.value as number[];
  Modal.confirm({
    content: `确认上架选中的 ${ids.length} 个帖子吗？`,
    title: '批量通过',
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
  openDownReasonModal(ids);
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

async function handleBatchTop() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }

  // 自动过滤：只保留未置顶的帖子
  const selectedPosts = selectedRows.value.length > 0 
    ? selectedRows.value 
    : tableData.value.filter((p: any) => selectedRowKeys.value.includes(p.id));

  const idsToTop = selectedPosts
    .filter((p: any) => p.postTop !== 1 && p.status === 1)
    .map((p: any) => p.id);

  if (idsToTop.length === 0) {
    message.warning('选中的帖子中没有可置顶的（已置顶或已下架的已自动过滤）');
    return;
  }

  Modal.confirm({
    content: `确认置顶选中的 ${idsToTop.length} 个帖子吗？（已自动过滤已置顶/已下架的帖子）`,
    title: '批量置顶',
    onOk: async () => {
      try {
        await batchTopPostApi(idsToTop);
        message.success(`批量置顶成功，共 ${idsToTop.length} 条`);
        selectedRowKeys.value = [];
        selectedRows.value = [];
        loadData();
      } catch {
        message.error('批量置顶失败');
      }
    },
  });
}

async function handleBatchUntop() {
  if (!hasSelected.value) {
    message.warning('请先选择帖子');
    return;
  }

  // 自动过滤：只保留已置顶的帖子
  const selectedPosts = selectedRows.value.length > 0 
    ? selectedRows.value 
    : tableData.value.filter((p: any) => selectedRowKeys.value.includes(p.id));

  const idsToUntop = selectedPosts
    .filter((p: any) => p.postTop === 1)
    .map((p: any) => p.id);

  if (idsToUntop.length === 0) {
    message.warning('选中的帖子中没有可取消置顶的（未置顶的已自动过滤）');
    return;
  }

  Modal.confirm({
    content: `确认取消置顶选中的 ${idsToUntop.length} 个帖子吗？`,
    title: '批量取消置顶',
    onOk: async () => {
      try {
        await batchUntopPostApi(idsToUntop);
        message.success(`批量取消置顶成功，共 ${idsToUntop.length} 条`);
        selectedRowKeys.value = [];
        selectedRows.value = [];
        loadData();
      } catch {
        message.error('批量取消置顶失败');
      }
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
  { title: '内容', dataIndex: 'content', width: 220, ellipsis: true },
  {
    title: '回复',
    dataIndex: 'toUsername',
    width: 100,
    customRender: ({ text }: any) => (text ? `@${text}` : ''),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) =>
      text === 0
        ? h(Tag, { color: 'orange' }, () => '已下架')
        : h(Tag, { color: 'green' }, () => '正常'),
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 180,
    fixed: 'right' as const,
    customRender: ({ record: cmt }: any) =>
      h(Space, () => [
        cmt.status === 0
          ? h(
              Button,
              { size: 'small', type: 'primary', onClick: () => handleUpComment(cmt.id) },
              () => '通过',
            )
          : h(
              Button,
              { size: 'small', onClick: () => handleDownComment(cmt.id) },
              () => '驳回',
            ),
        h(
          Popconfirm,
          { title: '确认删除此评论?', onConfirm: () => handleDeleteComment(cmt.id) },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
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

async function handleUpComment(id: number) {
  try {
    await upCommentApi([id]);
    message.success('已通过');
    loadComments();
  } catch {
    /* */
  }
}

async function handleDownComment(id: number) {
  try {
    await downCommentApi([id]);
    message.success('已驳回');
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
const detailReviewReason = ref('');

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

const detailStatSaving = ref(false);

function handleViewDetail(record: Record<string, any>) {
  detailData.value = { ...record };
  detailMedia.value = record?.media ?? [];
  currentVideo.value = '';
  detailReviewReason.value = '';
  detailModalVisible.value = true;
}

async function handleSaveDetailStats() {
  detailStatSaving.value = true;
  try {
    await updatePostApi({ id: detailData.value.id, readCount: detailData.value.readCount });
    message.success('浏览量已更新');
    loadData();
  } catch { /* */ } finally {
    detailStatSaving.value = false;
  }
}

// --- 用户详情 ---
const userDetailVisible = ref(false);
const userDetailData = ref<Record<string, any>>({});
const userDetailTags = ref<string[]>([]);

async function handleViewUser(uid: number) {
  if (!uid) return;
  try {
    const res = await getAppUserApi(uid);
    userDetailData.value = res?.user ?? {};
    userDetailTags.value = res?.tags ?? [];
  } catch { /* */ }
  userDetailVisible.value = true;
}

// --- 热门配置 ---
const hotConfigVisible = ref(false);
const hotConfigSaving = ref(false);
const hotConfigForm = ref<HotConfig>({ readThreshold: 0, likeThreshold: 0, commentThreshold: 0, favoriteThreshold: 0 });

async function openHotConfig() {
  try {
    const res = await getHotConfigApi();
    hotConfigForm.value = res?.hotConfig ?? { readThreshold: 0, likeThreshold: 0, commentThreshold: 0, favoriteThreshold: 0 };
  } catch { /* */ }
  hotConfigVisible.value = true;
}

async function saveHotConfig() {
  hotConfigSaving.value = true;
  try {
    await saveHotConfigApi(hotConfigForm.value);
    message.success('热门配置已保存');
    hotConfigVisible.value = false;
    loadData();
  } catch { /* */ } finally {
    hotConfigSaving.value = false;
  }
}

async function handleDetailUp() {
  try {
    await upPostApi([detailData.value.id]);
    message.success('已通过');
    detailData.value.status = 1;
    detailReviewReason.value = '';
    loadData();
  } catch {
    /* */
  }
}

async function handleDetailDown() {
  try {
    const reason = detailReviewReason.value.trim() || undefined;
    await downPostApi({ ids: [detailData.value.id], reason });
    message.success('已驳回');
    detailData.value.status = 0;
    detailReviewReason.value = '';
    loadData();
  } catch {
    /* */
  }
}

async function handleDetailTop() {
  try {
    await topPostApi(detailData.value.id);
    message.success('已置顶');
    detailData.value.postTop = 1;
    loadData();
  } catch {
    /* */
  }
}

async function handleDetailUntop() {
  try {
    await untopPostApi(detailData.value.id);
    message.success('已取消置顶');
    detailData.value.postTop = 0;
    loadData();
  } catch {
    /* */
  }
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
            <Select.Option :value="1">正常</Select.Option>
            <Select.Option :value="0">已下架</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="置顶">
          <Select
            v-model:value="searchForm.postTop"
            allow-clear
            placeholder="是否置顶"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="1">置顶</Select.Option>
            <Select.Option :value="0">未置顶</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="热门">
          <Select
            v-model:value="searchForm.hot"
            allow-clear
            placeholder="是否热门"
            style="width: 110px"
            @change="onSearch"
            @clear="onSearch"
          >
            <Select.Option :value="1">热门</Select.Option>
            <Select.Option :value="0">非热门</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="时间">
          <Select
            v-model:value="searchForm.timeRange"
            allow-clear
            placeholder="全部时间"
            style="width: 110px"
            @change="onTimeRangeChange(); onSearch()"
            @clear="onTimeRangeChange(); onSearch()"
          >
            <Select.Option value="today">今天</Select.Option>
            <Select.Option value="week">本周</Select.Option>
            <Select.Option value="month">本月</Select.Option>
          </Select>
          <DatePicker.RangePicker
            v-model:value="searchForm.dateRange"
            style="width: 240px"
            @change="onDateRangeChange"
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
    <Card title="帖子列表">
      <template #extra>
        <Space>
          <Button :disabled="!hasSelected" size="small" @click="handleBatchUp">
            批量通过
          </Button>
          <Button
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchDown"
          >
            批量驳回
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
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchTop"
          >
            批量置顶
          </Button>
          <Button
            :disabled="!hasSelected"
            size="small"
            @click="handleBatchUntop"
          >
            批量取消置顶
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
          <Button size="small" @click="openHotConfig">
            热门配置
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
        :scroll="{ x: 1520 }"
        :row-class-name="getRowClassName"
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
      width="900px"
    >
      <Table
        :columns="commentColumns"
        :data-source="commentData"
        :loading="commentLoading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 750 }"
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
      <div class="overflow-y-auto" style="max-height: 70vh">
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
            :color="detailData.status === 0 ? 'orange' : 'green'"
            class="ml-auto"
          >
            {{ detailData.status === 0 ? '已下架' : '正常' }}
          </Tag>
          <Tag v-if="detailData.postTop === 1" color="blue">置顶</Tag>
        </div>
        <div v-if="detailData.status === 0 && detailData.rejectReason" class="text-sm text-gray-600">
          <span class="text-gray-500">下架原因：</span>{{ detailData.rejectReason }}
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

        <!-- 数据统计 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">
            数据统计
            <Tag v-if="detailData.isHot" color="volcano" class="ml-2" size="small">热门</Tag>
          </div>
          <div class="grid grid-cols-4 gap-4 mt-2">
            <div>
              <div class="text-xs text-gray-400 mb-1">浏览量</div>
              <div class="flex items-center gap-1">
                <InputNumber v-model:value="detailData.readCount" :min="0" size="small" style="width: 100px" />
                <Button size="small" :loading="detailStatSaving" @click="handleSaveDetailStats">保存</Button>
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">点赞</div>
              <div class="text-base font-medium">{{ detailData.collectionCount ?? 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">评论</div>
              <div class="text-base font-medium">{{ detailData.commentCount ?? 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">收藏</div>
              <div class="text-base font-medium">{{ detailData.favoriteCount ?? 0 }}</div>
            </div>
          </div>
        </div>

        <!-- 审核操作 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">审核操作</div>
          <div class="space-y-3">
            <textarea
              v-model="detailReviewReason"
              placeholder="审核原因（选填），驳回时建议填写"
              rows="2"
              maxlength="200"
              class="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
            />
            <Space>
              <Popconfirm
                v-if="detailData.status === 0"
                title="确认通过该帖子吗？"
                @confirm="handleDetailUp"
              >
                <Button type="primary"> 通过 </Button>
              </Popconfirm>
              <Popconfirm
                v-if="detailData.status === 1"
                title="确认驳回该帖子吗？"
                @confirm="handleDetailDown"
              >
                <Button danger> 驳回 </Button>
              </Popconfirm>
              <span
                v-if="detailData.status !== 0 && detailData.status !== 1"
                class="text-xs text-gray-400"
              >
                当前状态无法操作
              </span>
            </Space>
            <div class="text-xs text-gray-400">
              提示：通过/驳回操作会更新对应内容的实际状态，并记录新的审核日志。
            </div>
          </div>
        </div>

        <!-- 置顶操作 -->
        <div class="rounded-lg detail-block p-4 text-sm">
          <div class="detail-title">置顶操作</div>
          <div class="space-y-2">
            <div v-if="detailData.postTop === 1">
              <Popconfirm
                title="确认取消置顶该帖子吗？"
                @confirm="handleDetailUntop"
              >
                <Button danger size="small">取消置顶</Button>
              </Popconfirm>
              <span class="ml-2 text-xs text-gray-400">该帖子当前为置顶状态</span>
            </div>
            <div v-else>
              <Button type="primary" size="small" @click="handleDetailTop">置顶</Button>
              <span class="ml-2 text-xs text-gray-400">将该帖子设为置顶（优先展示）</span>
            </div>
          </div>
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

    <!-- 下架原因输入弹窗 -->
    <Modal
      v-model:open="downReasonVisible"
      title="填写下架原因（可选）"
      @ok="confirmDownWithReason"
      @cancel="downReasonVisible = false"
    >
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-500">请输入下架/驳回原因（选填）：</div>
        <Input
          v-model:value="downReason"
          placeholder="例如：含有严重违规内容"
          :maxLength="100"
          show-count
        />
        <div class="mt-2 text-xs text-gray-400">
          原因将记录到审核日志中，并在“我的已下架”列表中展示给作者。
        </div>
      </div>
    </Modal>

    <!-- 热门配置弹窗 -->
    <Modal
      v-model:open="hotConfigVisible"
      title="热门帖子配置"
      :confirm-loading="hotConfigSaving"
      @ok="saveHotConfig"
      @cancel="hotConfigVisible = false"
    >
      <div class="text-xs text-gray-400 mb-4">
        帖子同时满足所有设为 &gt;0 的阈值即自动成为热门。全部设为 0 表示关闭热门判定。
      </div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <div class="text-sm text-gray-500 mb-1">浏览量阈值（0=不要求）</div>
          <InputNumber v-model:value="hotConfigForm.readThreshold" :min="0" style="width: 100%" />
        </div>
        <div>
          <div class="text-sm text-gray-500 mb-1">点赞数阈值（0=不要求）</div>
          <InputNumber v-model:value="hotConfigForm.likeThreshold" :min="0" style="width: 100%" />
        </div>
        <div>
          <div class="text-sm text-gray-500 mb-1">评论数阈值（0=不要求）</div>
          <InputNumber v-model:value="hotConfigForm.commentThreshold" :min="0" style="width: 100%" />
        </div>
        <div>
          <div class="text-sm text-gray-500 mb-1">收藏数阈值（0=不要求）</div>
          <InputNumber v-model:value="hotConfigForm.favoriteThreshold" :min="0" style="width: 100%" />
        </div>
      </div>
    </Modal>

    <!-- 用户详情弹窗 -->
    <Modal v-model:open="userDetailVisible" title="用户详情" :footer="null" width="480px">
      <div class="mb-4 flex justify-center">
        <Image v-if="userDetailData.avatar" :src="userDetailData.avatar" :width="64" :preview="true" :style="{ borderRadius: '50%', height: '64px', objectFit: 'cover' }" />
        <Avatar v-else :size="64" />
      </div>
      <Descriptions :column="1" bordered size="small">
        <Descriptions.Item label="UID">{{ userDetailData.uid }}</Descriptions.Item>
        <Descriptions.Item label="用户名">{{ userDetailData.username }}</Descriptions.Item>
        <Descriptions.Item label="手机号">{{ userDetailData.mobile || '-' }}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag :color="userDetailData.status === 1 ? 'red' : 'green'">{{ userDetailData.status === 1 ? '已封禁' : '正常' }}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="积分"><Tag color="blue">{{ userDetailData.integral ?? 0 }}</Tag></Descriptions.Item>
        <Descriptions.Item label="头衔">
          <template v-if="userDetailTags.length">
            <Tag v-for="t in userDetailTags" :key="t" size="small" class="mr-1">{{ t }}</Tag>
          </template>
          <span v-else class="text-gray-400">-</span>
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">{{ userDetailData.createTime }}</Descriptions.Item>
      </Descriptions>
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

/* 置顶帖子高亮 */
.pinned-post-row {
  background-color: #f0f7ff !important;
}
.pinned-post-row:hover {
  background-color: #e6f0ff !important;
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
