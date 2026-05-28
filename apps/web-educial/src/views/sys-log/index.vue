<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Form, Input, Pagination, Table } from 'ant-design-vue';

import { getSysLogListApi } from '#/api/modules/sys-log';

defineOptions({ name: 'SysLog' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ key: '' });

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '用户名', dataIndex: 'username' },
  { title: '操作', dataIndex: 'operation' },
  { title: '方法', dataIndex: 'method' },
  { title: '参数', dataIndex: 'params', ellipsis: true },
  { title: 'IP', dataIndex: 'ip', width: 130 },
  { title: '耗时(ms)', dataIndex: 'time', width: 90 },
  { title: '创建时间', dataIndex: 'createDate', width: 170 },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getSysLogListApi({
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
  searchForm.value.key = '';
  page.value = 1;
  loadData();
}

function onPageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

loadData();
</script>

<template>
  <Page description="查看系统操作日志" title="操作日志">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="关键词">
          <Input v-model:value="searchForm.key" placeholder="用户名/操作" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="onSearch">搜索</Button>
            <Button @click="onClearSearch">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
    <Card title="日志列表">
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
  </Page>
</template>
