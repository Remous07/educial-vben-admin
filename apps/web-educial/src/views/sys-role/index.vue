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
  Space,
  Table,
  Tree,
} from 'ant-design-vue';

import { getSysMenuListApi } from '#/api/modules/sys-menu';
import {
  createSysRoleApi,
  deleteSysRoleApi,
  getSysRoleApi,
  getSysRoleListApi,
  updateSysRoleApi,
} from '#/api/modules/sys-role';

defineOptions({ name: 'SysRole' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchForm = ref({ roleName: '' });
const modalVisible = ref(false);
const modalTitle = ref('新增角色');
const formData = ref<Record<string, any>>({});
const menuTree = ref<any[]>([]);
const checkedMenuKeys = ref<number[]>([]);
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'roleId', width: 60 },
  { title: '角色名称', dataIndex: 'roleName' },
  { title: '备注', dataIndex: 'remark' },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  {
    title: '操作',
    width: 200,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.roleId) },
          () => '编辑',
        ),
        h(
          Popconfirm,
          {
            title: '确认删除?',
            onConfirm: () => handleDelete([record.roleId]),
          },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
  },
];

function buildMenuTree(menus: any[]): any[] {
  const map = new Map<number, any>();
  const tree: any[] = [];
  menus.forEach((m: any) => {
    m.key = m.menuId;
    m.title = m.name;
    m.children = [];
    map.set(m.menuId, m);
  });
  menus.forEach((m: any) => {
    const parent = map.get(m.parentId);
    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(m);
    } else if (m.parentId === 0) {
      tree.push(m);
    }
  });
  return tree;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getSysRoleListApi({
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
  searchForm.value.roleName = '';
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

async function openModal() {
  modalTitle.value = '新增角色';
  formData.value = {};
  checkedMenuKeys.value = [];
  try {
    const menus = await getSysMenuListApi();
    const list = Array.isArray(menus) ? menus : (menus?.list ?? []);
    menuTree.value = buildMenuTree(list);
  } catch {
    /* */
  }
  modalVisible.value = true;
}

async function handleEdit(roleId: number) {
  modalTitle.value = '编辑角色';
  try {
    const [roleRes, menus] = await Promise.all([
      getSysRoleApi(roleId),
      getSysMenuListApi(),
    ]);
    const list2 = Array.isArray(menus) ? menus : (menus?.list ?? []);
    menuTree.value = buildMenuTree(list2);
    formData.value = roleRes?.role ?? {};
    checkedMenuKeys.value = formData.value.menuIdList ?? [];
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
  const data: Record<string, any> = {
    ...formData.value,
    menuIdList: checkedMenuKeys.value,
  };
  if (data.roleId) {
    await updateSysRoleApi(data);
    message.success('更新成功');
  } else {
    await createSysRoleApi(data);
    message.success('创建成功');
  }
  modalVisible.value = false;
  loadData();
}

async function handleDelete(ids: number[]) {
  try {
    await deleteSysRoleApi(ids);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理角色及权限分配" title="系统角色">
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="角色名">
          <Input v-model:value="searchForm.roleName" placeholder="角色名称" />
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
    <Card title="角色列表">
      <template #extra>
        <Button type="primary" @click="openModal">新增角色</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="roleId"
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
      width="600px"
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item
          label="角色名称"
          name="roleName"
          :rules="[{ required: true }]"
        >
          <Input v-model:value="formData.roleName" />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input.TextArea v-model:value="formData.remark" />
        </Form.Item>
        <Form.Item label="权限分配">
          <Tree
            v-model:checked-keys="checkedMenuKeys"
            :tree-data="menuTree"
            checkable
            :default-expand-all="true"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
