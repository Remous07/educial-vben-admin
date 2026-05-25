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

import { getSysRoleSelectApi } from '#/api/modules/sys-role';
import {
  createSysUserApi,
  deleteSysUserApi,
  getSysUserApi,
  getSysUserListApi,
  updateSysUserApi,
} from '#/api/modules/sys-user';

defineOptions({ name: 'SysUser' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ username: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增用户');
const formRef = ref();
const formData = ref<Record<string, any>>({});
const roleList = ref<any[]>([]);

const columns = [
  { title: 'ID', dataIndex: 'userId', width: 60 },
  { title: '用户名', dataIndex: 'username' },
  { title: '姓名', dataIndex: 'realName' },
  { title: '邮箱', dataIndex: 'email' },
  { title: '手机号', dataIndex: 'mobile' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ text }: any) =>
      text === 1
        ? h(Tag, { color: 'green' }, () => '正常')
        : h(Tag, { color: 'red' }, () => '禁用'),
  },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 200,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.userId) },
          () => '编辑',
        ),
        h(
          Popconfirm,
          {
            title: '确认删除?',
            onConfirm: () => handleDelete([record.userId]),
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
    const res = await getSysUserListApi({
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

async function openModal() {
  modalTitle.value = '新增用户';
  formData.value = { status: 1 };
  try {
    const res = await getSysRoleSelectApi();
    roleList.value = res?.list ?? [];
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleEdit(userId: number) {
  modalTitle.value = '编辑用户';
  try {
    const [res, roleRes] = await Promise.all([
      getSysUserApi(userId),
      getSysRoleSelectApi(),
    ]);
    roleList.value = roleRes?.list ?? [];
    formData.value = res?.user ?? {};
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
  if (formData.value.userId) {
    await updateSysUserApi(formData.value);
    message.success('更新成功');
  } else {
    await createSysUserApi(formData.value);
    message.success('创建成功');
  }
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteSysUserApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理系统用户" title="系统用户">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="用户名">
          <Input v-model:value="searchForm.username" placeholder="用户名" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" @click="onSearch">搜索</Button>
        </Form.Item>
      </Form>
    </Card>
    <Card title="用户列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增用户</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="userId"
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
        <Form.Item label="用户名" name="username" :rules="[{ required: true }]">
          <Input v-model:value="formData.username" />
        </Form.Item>
        <Form.Item
          v-if="!formData.userId"
          label="密码"
          name="password"
          :rules="[{ required: true }]"
        >
          <Input.Password v-model:value="formData.password" />
        </Form.Item>
        <Form.Item label="姓名" name="realName">
          <Input v-model:value="formData.realName" />
        </Form.Item>
        <Form.Item label="邮箱" name="email">
          <Input v-model:value="formData.email" />
        </Form.Item>
        <Form.Item label="手机号" name="mobile">
          <Input v-model:value="formData.mobile" />
        </Form.Item>
        <Form.Item label="状态" name="status">
          <Select v-model:value="formData.status">
            <Select.Option :value="1">正常</Select.Option>
            <Select.Option :value="0">禁用</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="角色" name="roleIdList">
          <Select v-model:value="formData.roleIdList" mode="multiple">
            <Select.Option
              v-for="role in roleList"
              :key="role.roleId"
              :value="role.roleId"
            >
              {{ role.roleName }}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
