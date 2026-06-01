<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Image,
  Input,
  message,
  Pagination,
  Popconfirm,
  Radio,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  deleteOssFileApi,
  getOssConfigApi,
  getOssListApi,
  saveOssConfigApi,
  uploadOssFileApi,
} from '#/api/modules/oss';

defineOptions({ name: 'OssManage' });

// --- 存储配置 ---
const storageType = ref<number>(3);
const configLoading = ref(false);
const configSaving = ref(false);
const configForm = ref<Record<string, any>>({
  type: 3,
  r2Domain: '',
  r2Prefix: '',
  r2EndPoint: '',
  r2AccessKeyId: '',
  r2AccessKeySecret: '',
  r2BucketName: '',
  cloudreveUrl: '',
  cloudreveEmail: '',
  cloudrevePassword: '',
});

async function loadConfig() {
  configLoading.value = true;
  try {
    const res = await getOssConfigApi();
    const cfg = res?.config;
    if (cfg && cfg.type) {
      storageType.value = cfg.type;
      configForm.value = { ...configForm.value, ...cfg };
    }
  } catch {
    /* */
  } finally {
    configLoading.value = false;
  }
}

async function handleSaveConfig() {
  configSaving.value = true;
  const submitted = { ...configForm.value, type: storageType.value };
  try {
    await saveOssConfigApi(submitted);
    message.success('配置已保存');
    // 重新拉取服务器配置进行校验
    await loadConfig();
    const loaded = configForm.value;
    // 简单对比关键字段（type + 常用字段）
    const keysToCheck = ['type', 'r2Domain', 'r2BucketName', 'cloudreveUrl'];
    const mismatch = keysToCheck.some(key => submitted[key] !== loaded[key]);
    if (mismatch) {
      message.warning('保存成功，但服务器返回值与提交的不一致，建议刷新页面确认');
    }
  } catch (err: any) {
    message.error(err?.message || '保存失败，请重试');
  } finally {
    configSaving.value = false;
  }
}

function onStorageTypeChange(e: any) {
  storageType.value = e.target.value;
}

// --- 文件管理 ---
const fileLoading = ref(false);
const fileData = ref<any[]>([]);
const fileTotal = ref(0);
const filePage = ref(1);
const filePageSize = ref(10);
const uploading = ref(false);

// 文件类型筛选
const fileSearchForm = ref({
  fileType: '' as string, // 图片 | 视频 | 音频 | 文档 | 其他
});

// 视频站内预览
const videoPreviewVisible = ref(false);
const currentVideoUrl = ref('');

const fileColumns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  {
    title: '预览',
    dataIndex: 'url',
    width: 100,
    customRender: ({ text }: any) => {
      if (!text) return h('span', { class: 'text-gray-400' }, '-');

      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(text);
      const isVideo = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m3u8)(\?|$)/i.test(text);

      if (isImage) {
        return h(Image, {
          src: text,
          width: 64,
          style: { height: '48px', objectFit: 'cover', borderRadius: '4px' },
        });
      }

      if (isVideo) {
        // 视频使用深色背景占位（站内预览）
        return h(
          'div',
          {
            class: 'flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition-colors rounded cursor-pointer',
            style: { width: '64px', height: '48px' },
            onClick: () => {
              currentVideoUrl.value = text;
              videoPreviewVisible.value = true;
            },
            title: '点击站内预览视频',
          },
          [
            h(
              'div',
              {
                class: 'w-6 h-6 flex items-center justify-center rounded-full bg-white/25',
              },
              [h('span', { class: 'text-white text-xs ml-0.5' }, '▶')]
            ),
          ]
        );
      }

      return h('span', { class: 'text-gray-400' }, '-');
    },
  },
  {
    title: '文件类型',
    width: 90,
    customRender: ({ record }: any) => {
      const type = getFileType(record.url);
      const colorMap: Record<string, string> = {
        图片: 'blue',
        视频: 'purple',
        音频: 'green',
        文档: 'orange',
        其他: 'default',
      };
      return h(Tag, { color: colorMap[type] || 'default' }, () => type);
    },
  },
  { title: '文件地址', dataIndex: 'url', ellipsis: true },
  { title: '上传时间', dataIndex: 'createDate', width: 170 },
  {
    title: '操作',
    width: 80,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(
        Popconfirm,
        {
          title: '确认删除此文件?',
          onConfirm: () => handleDeleteFile(record.id),
        },
        {
          default: () =>
            h(Button, { size: 'small', danger: true }, () => '删除'),
        },
      ),
  },
];

async function loadFiles() {
  fileLoading.value = true;
  try {
    const res = await getOssListApi({
      page: filePage.value,
      limit: filePageSize.value,
    });
    let list = res?.page?.list ?? [];

    // 客户端类型筛选（后端暂不支持时生效）
    if (fileSearchForm.value.fileType) {
      list = list.filter((item: any) => getFileType(item.url) === fileSearchForm.value.fileType);
    }

    fileData.value = list;
    fileTotal.value = res?.page?.totalCount ?? list.length;
  } finally {
    fileLoading.value = false;
  }
}

function onFilePageChange(p: number, ps: number) {
  filePage.value = p;
  filePageSize.value = ps;
  loadFiles();
}

async function handleDeleteFile(id: number) {
  try {
    await deleteOssFileApi([id]);
    message.success('删除成功');
    loadFiles();
  } catch {
    /* */
  }
}

async function handleUpload(info: any) {
  if (info.file.status === 'uploading') {
    uploading.value = true;
    return;
  }
  if (info.file.status === 'done') {
    uploading.value = false;
    message.success('上传成功');
    filePage.value = 1;
    loadFiles();
  }
  if (info.file.status === 'error') {
    uploading.value = false;
  }
}

async function customUpload({ file, onSuccess, onError }: any) {
  try {
    const res = await uploadOssFileApi(file);
    onSuccess(res, file);
  } catch (error) {
    onError(error);
  }
}

function onFileSearch() {
  filePage.value = 1;
  loadFiles();
}

function onFileReset() {
  fileSearchForm.value.fileType = '';
  filePage.value = 1;
  loadFiles();
}

function onFileRefresh() {
  loadFiles();
}

// 根据 URL 判断文件类型
function getFileType(url: string): string {
  if (!url) return '其他';
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '图片';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm3u8'].includes(ext)) return '视频';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '音频';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'zip', 'rar'].includes(ext)) return '文档';
  return '其他';
}

// --- 初始化 ---
loadConfig();
loadFiles();
</script>

<template>
  <Page description="管理云存储配置与文件" title="OSS管理">
    <!-- 存储配置 -->
    <Card title="存储配置" class="mb-4" :loading="configLoading">
      <Form layout="vertical">
        <Form.Item label="存储方式">
          <Radio.Group :value="storageType" @change="onStorageTypeChange">
            <Radio :value="3">Cloudflare R2</Radio>
            <Radio :value="4">Cloudreve</Radio>
          </Radio.Group>
        </Form.Item>

        <template v-if="storageType === 3">
          <div class="grid grid-cols-2 gap-x-6">
            <Form.Item label="R2 绑定域名">
              <Input
                v-model:value="configForm.r2Domain"
                placeholder="https://cdn.example.com"
              />
            </Form.Item>
            <Form.Item label="R2 路径前缀">
              <Input
                v-model:value="configForm.r2Prefix"
                placeholder="educial"
              />
            </Form.Item>
            <Form.Item label="R2 EndPoint">
              <Input
                v-model:value="configForm.r2EndPoint"
                placeholder="https://<account>.r2.cloudflarestorage.com"
              />
            </Form.Item>
            <Form.Item label="R2 AccessKeyId">
              <Input
                v-model:value="configForm.r2AccessKeyId"
                placeholder="Access Key ID"
              />
            </Form.Item>
            <Form.Item label="R2 AccessKeySecret">
              <Input.Password
                v-model:value="configForm.r2AccessKeySecret"
                placeholder="Access Key Secret"
              />
            </Form.Item>
            <Form.Item label="R2 BucketName">
              <Input
                v-model:value="configForm.r2BucketName"
                placeholder="bucket-name"
              />
            </Form.Item>
          </div>
        </template>

        <template v-if="storageType === 4">
          <div class="grid grid-cols-2 gap-x-6">
            <Form.Item label="Cloudreve 服务地址">
              <Input
                v-model:value="configForm.cloudreveUrl"
                placeholder="https://cloudreve.example.com"
              />
            </Form.Item>
            <Form.Item label="Cloudreve 管理员邮箱">
              <Input
                v-model:value="configForm.cloudreveEmail"
                placeholder="admin@example.com"
              />
            </Form.Item>
            <Form.Item label="Cloudreve 管理员密码">
              <Input.Password
                v-model:value="configForm.cloudrevePassword"
                placeholder="管理员密码"
              />
            </Form.Item>
          </div>
        </template>

        <Form.Item>
          <Button
            type="primary"
            :loading="configSaving"
            @click="handleSaveConfig"
          >
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </Card>

    <!-- 文件类型筛选 -->
    <Card class="mb-4">
      <Form layout="inline" :model="fileSearchForm">
        <Form.Item label="文件类型">
          <Select
            v-model:value="fileSearchForm.fileType"
            @change="onFileSearch"
            style="width: 120px"
            allow-clear
          >
            <Select.Option value="">全部</Select.Option>
            <Select.Option value="图片">图片</Select.Option>
            <Select.Option value="视频">视频</Select.Option>
            <Select.Option value="音频">音频</Select.Option>
            <Select.Option value="文档">文档</Select.Option>
            <Select.Option value="其他">其他</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onFileSearch">搜索</Button>
            <Button @click="onFileReset">重置</Button>
            <Button @click="onFileRefresh">刷新</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>

    <!-- 文件管理 -->
    <Card title="文件管理">
      <template #extra>
        <Upload
          :show-upload-list="false"
          :custom-request="customUpload"
          @change="handleUpload"
        >
          <Button type="primary" :loading="uploading">上传文件</Button>
        </Upload>
      </template>

      <Table
        :columns="fileColumns"
        :data-source="fileData"
        :loading="fileLoading"
        :pagination="false"
        row-key="id"
        size="middle"
        :scroll="{ x: 800 }"
      />
      <div class="mt-4 flex justify-end">
        <Pagination
          v-model:current="filePage"
          v-model:page-size="filePageSize"
          :total="fileTotal"
          show-size-changer
          @change="onFilePageChange"
        />
      </div>
    </Card>

    <!-- 视频站内预览弹窗 -->
    <Modal
      v-model:open="videoPreviewVisible"
      title="视频预览"
      :footer="null"
      width="800px"
      destroy-on-close
      @cancel="currentVideoUrl = ''"
    >
      <div v-if="currentVideoUrl" style=" padding: 8px 0;background: #000;">
        <video
          :src="currentVideoUrl"
          controls
          autoplay
          style=" display: block;width: 100%; max-height: 70vh; margin: 0 auto;"
        >
          您的浏览器不支持 video 标签。
        </video>
      </div>
    </Modal>
  </Page>
</template>
