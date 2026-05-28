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
  Table,
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
  try {
    await saveOssConfigApi({ ...configForm.value, type: storageType.value });
    message.success('配置已保存');
  } catch {
    /* */
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

const fileColumns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  {
    title: '预览',
    dataIndex: 'url',
    width: 100,
    customRender: ({ text }: any) =>
      text && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(text)
        ? h(Image, {
            src: text,
            width: 64,
            style: { height: '48px', objectFit: 'cover', borderRadius: '4px' },
          })
        : h('span', { class: 'text-gray-400' }, '-'),
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
    const data = res?.page;
    fileData.value = data?.list ?? [];
    fileTotal.value = data?.totalCount ?? 0;
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
  </Page>
</template>
