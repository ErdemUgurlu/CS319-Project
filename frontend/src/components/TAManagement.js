import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Modal, Form, Input, Select, message } from 'antd';

const TAManagement = () => {
  const [tas, setTAs] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingTA, setEditingTA] = useState(null);

  useEffect(() => {
    fetchTAs();
  }, []);

  const fetchTAs = async () => {
    try {
      const response = await axios.get('/api/tas/');
      setTAs(response.data);
    } catch (error) {
      message.error('Failed to fetch TAs');
    }
  };

  const handleAddTA = () => {
    setEditingTA(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditTA = (ta) => {
    setEditingTA(ta);
    form.setFieldsValue(ta);
    setIsModalVisible(true);
  };

  const handleDeleteTA = async (taId) => {
    try {
      await axios.delete(`/api/tas/${taId}/`);
      message.success('TA deleted successfully');
      fetchTAs();
    } catch (error) {
      message.error('Failed to delete TA');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTA) {
        await axios.put(`/api/tas/${editingTA.id}/`, values);
        message.success('TA updated successfully');
      } else {
        await axios.post('/api/tas/', values);
        message.success('TA added successfully');
      }
      setIsModalVisible(false);
      fetchTAs();
    } catch (error) {
      message.error('Failed to save TA');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Workload',
      dataIndex: 'workload',
      key: 'workload',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <span>
          <Button type="link" onClick={() => handleEditTA(record)}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => handleDeleteTA(record.id)}>
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={handleAddTA} style={{ marginBottom: 16 }}>
        Add TA
      </Button>
      <Table columns={columns} dataSource={tas} rowKey="id" />

      <Modal
        title={editingTA ? 'Edit TA' : 'Add TA'}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input the TA name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input the TA email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: 'Please select the department!' }]}
          >
            <Select>
              <Select.Option value="CS">Computer Science</Select.Option>
              <Select.Option value="EE">Electrical Engineering</Select.Option>
              <Select.Option value="ME">Mechanical Engineering</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="workload"
            label="Workload (hours/week)"
            rules={[{ required: true, message: 'Please input the workload!' }]}
          >
            <Input type="number" min={0} max={40} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingTA ? 'Update' : 'Add'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TAManagement; 