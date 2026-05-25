<script lang="ts" setup>
import { h, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
} from 'ant-design-vue';

import {
  createSysMenuApi,
  deleteSysMenuApi,
  getSysMenuApi,
  getSysMenuListApi,
  getSysMenuSelectApi,
  updateSysMenuApi,
} from '#/api/modules/sys-menu';

defineOptions({ name: 'SysMenu' });

const loading = ref(false);
const tableData = ref<any[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增菜单');
const formData = ref<Record<string, any>>({ type: 1 });
const parentSelect = ref<any[]>([]);
const formRef = ref();

const columns = [
  { title: 'ID', dataIndex: 'menuId', width: 60 },
  { title: '名称', dataIndex: 'name' },
  {
    title: '类型',
    dataIndex: 'type',
    width: 80,
    customRender: ({ text }: any) => {
      const map: Record<number, string> = { 0: '目录', 1: '菜单', 2: '按钮' };
      const colors: Record<number, string> = {
        0: 'blue',
        1: 'green',
        2: 'orange',
      };
      return h(Tag, { color: colors[text] }, () => map[text] ?? text);
    },
  },
  { title: '上级菜单', dataIndex: 'parentName' },
  { title: '路由URL', dataIndex: 'url' },
  { title: '权限标识', dataIndex: 'perms' },
  { title: '图标', dataIndex: 'icon' },
  { title: '排序', dataIndex: 'orderNum', width: 60 },
  {
    title: '操作',
    width: 240,
    fixed: 'right' as const,
    customRender: ({ record }: any) =>
      h(Space, () => [
        h(
          Button,
          { size: 'small', onClick: () => handleEdit(record.menuId) },
          () => '编辑',
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'dashed',
            onClick: () => handleAddChild(record.menuId),
          },
          () => '添加子菜单',
        ),
        h(
          Popconfirm,
          {
            title: '确认删除?',
            onConfirm: () => handleDelete(record.menuId),
          },
          {
            default: () =>
              h(Button, { size: 'small', danger: true }, () => '删除'),
          },
        ),
      ]),
  },
];

function buildTreeOptions(menus: any[]): any[] {
  return menus
    .filter((m: any) => m.type !== 2)
    .map((m: any) => ({
      value: m.menuId,
      label: m.type === 0 ? `📁 ${m.name}` : m.name,
      children: buildTreeOptions(
        menus.filter((c: any) => c.parentId === m.menuId),
      ),
    }));
}

async function loadData() {
  loading.value = true;
  try {
    const menus = await getSysMenuListApi();
    tableData.value = Array.isArray(menus)
      ? menus
      : (menus?.list ?? menus ?? []);
  } finally {
    loading.value = false;
  }
}

async function openModal(parentId: null | number = null) {
  modalTitle.value = '新增菜单';
  formData.value = { type: 1, parentId: parentId ?? 0, orderNum: 0 };
  try {
    const res = await getSysMenuSelectApi();
    parentSelect.value = buildTreeOptions(res?.menuList ?? []);
  } catch {
    /* */
  }
  modalVisible.value = true;
}

function handleAddChild(parentId: number) {
  openModal(parentId);
}

async function handleEdit(menuId: number) {
  modalTitle.value = '编辑菜单';
  try {
    const [menuRes, selectRes] = await Promise.all([
      getSysMenuApi(menuId),
      getSysMenuSelectApi(),
    ]);
    formData.value = menuRes?.menu ?? {};
    parentSelect.value = buildTreeOptions(selectRes?.menuList ?? []);
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
  if (formData.value.menuId) {
    await updateSysMenuApi(formData.value);
    message.success('更新成功');
  } else {
    await createSysMenuApi(formData.value);
    message.success('创建成功');
  }
  modalVisible.value = false;
  loadData();
}

async function handleDelete(menuId: number) {
  try {
    await deleteSysMenuApi(menuId);
    message.success('删除成功');
    loadData();
  } catch {
    /* */
  }
}

loadData();
</script>

<template>
  <Page description="管理系统菜单及权限" title="系统菜单">
    <Card title="菜单列表">
      <template #extra>
        <Button type="primary" @click="openModal(null)">新增菜单</Button>
      </template>
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="menuId"
        size="middle"
        :expand-columns="true"
        default-expand-all-rows
      />
    </Card>

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      destroy-on-close
      @ok="handleSubmit"
    >
      <Form ref="formRef" :model="formData" layout="vertical">
        <Form.Item label="类型" name="type" :rules="[{ required: true }]">
          <Select v-model:value="formData.type">
            <Select.Option :value="0">目录</Select.Option>
            <Select.Option :value="1">菜单</Select.Option>
            <Select.Option :value="2">按钮</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="名称" name="name" :rules="[{ required: true }]">
          <Input v-model:value="formData.name" />
        </Form.Item>
        <Form.Item label="上级菜单" name="parentId">
          <TreeSelect
            v-model:value="formData.parentId"
            :tree-data="parentSelect"
            tree-default-expand-all
            allow-clear
          />
        </Form.Item>
        <Form.Item v-if="formData.type !== 2" label="路由URL" name="url">
          <Input v-model:value="formData.url" />
        </Form.Item>
        <Form.Item v-if="formData.type !== 2" label="图标" name="icon">
          <Input v-model:value="formData.icon" placeholder="如: lucide:home" />
        </Form.Item>
        <Form.Item v-if="formData.type === 2" label="权限标识" name="perms">
          <Input
            v-model:value="formData.perms"
            placeholder="如: sys:user:list"
          />
        </Form.Item>
        <Form.Item label="排序" name="orderNum">
          <InputNumber
            v-model:value="formData.orderNum"
            :min="0"
            class="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
