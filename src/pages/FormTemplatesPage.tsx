// src/pages/FormTemplatesPage.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiService';
import { toast } from 'react-toastify';
import { Role } from '../common/enums/role.enum';
import { Link } from 'react-router-dom'; 
// --- Ant Design Imports ---
import { Table, Button, Space, Typography, Tooltip, Modal, Form, Input, Tag } from 'antd';
import { ExperimentOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

// Definir una interfaz para la estructura de la plantilla que esperamos de la API
interface FormTemplate {
  id: number;
  uniqueCode: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

// Añadir prop para el rol del usuario
interface FormTemplatesPageProps {
  userRole?: Role; // El rol puede ser undefined si el usuario no está cargado aún
}

const { Title } = Typography;
const FormTemplatesPage: React.FC<FormTemplatesPageProps> = ({ userRole }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el Modal de creación/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<FormTemplate> | null>(null);
  const [form] = Form.useForm();
  
  // Función para cargar las plantillas
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<FormTemplate[]>('/form-templates');
      setTemplates(response.data);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      toast.error('No se pudieron cargar las plantillas.'); 
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar plantillas al montar el componente
  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async (values: Omit<FormTemplate, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    const payload = {
      uniqueCode: values.uniqueCode,
      name: values.name,
      description: values.description,
    };
    
    try {
      if (editingTemplate?.id) {
        // TODO: Implementar PATCH /form-templates/:id para actualizar básicos
        // await apiClient.patch(`/form-templates/${editingTemplate.id}`, payload);
        toast.info("Funcionalidad de editar plantilla no implementada aún.");
      } else {
        // Crear nueva plantilla
        await apiClient.post('/form-templates', payload);
        toast.success('¡Plantilla creada exitosamente!');
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
      form.resetFields(); // Limpiar formulario del modal
      fetchTemplates(); // Recargar lista
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(`Error al guardar: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showModal = (template: FormTemplate | null = null) => {
    setEditingTemplate(template); // Corregido: ahora asigna el parámetro recibido
    
    form.resetFields(); // Limpiar el formulario antes de establecer nuevos valores
    
    if (template) {
      // Si estamos editando, establecer los valores del template en el formulario
      form.setFieldsValue({
        id: template.id,
        uniqueCode: template.uniqueCode,
        name: template.name,
        description: template.description || '',
      });
    }
    
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
  };

  // --- Renderizado ---
  if (isLoading && templates.length === 0) {
    return <p>Cargando plantillas...</p>;
  }

  // --- Definición de Columnas ---
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a: FormTemplate, b: FormTemplate) => a.id - b.id },
    { title: 'Código Único', dataIndex: 'uniqueCode', key: 'uniqueCode', sorter: (a: FormTemplate, b: FormTemplate) => a.uniqueCode.localeCompare(b.uniqueCode) },
    { title: 'Nombre', dataIndex: 'name', key: 'name', sorter: (a: FormTemplate, b: FormTemplate) => a.name.localeCompare(b.name) },
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    { title: 'Versión', dataIndex: 'version', key: 'version' },
    { title: 'Activa', dataIndex: 'isActive', key: 'isActive', render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Sí' : 'No'}</Tag> },
    { title: 'Creada', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: FormTemplate) => (
        <Space size="small">
          <Tooltip title="Editar Estructura">
            <Link to={`/templates/${record.id}/edit`}>
              <Button type="primary" icon={<ExperimentOutlined />} size="small" />
            </Link>
          </Tooltip>
          <Tooltip title="Editar Información Básica">
            <Button icon={<EditOutlined />} size="small" onClick={() => showModal(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ marginBottom: 0 }}>Gestión de Plantillas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal(null)}>
          Crear Plantilla
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      {/* --- Modal para Crear/Editar --- */}
      <Modal
        title={editingTemplate?.id ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}
        open={isModalOpen}
        onCancel={handleCancel}           
        footer={[
          <Button key="back" onClick={handleCancel}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
            {editingTemplate?.id ? 'Guardar Cambios' : 'Crear Plantilla'}
          </Button>,
        ]}
        destroyOnClose
      >
        <Form 
          form={form} 
          layout="vertical" 
          name="template_form_modal" 
          onFinish={handleSaveTemplate}
        >
          {/* Campo oculto para ID si estamos editando */}
          {editingTemplate?.id && <Form.Item name="id" hidden><Input /></Form.Item>}

          <Form.Item
            name="uniqueCode"
            label="Código Único"
            rules={[{ required: true, message: 'Código es requerido' }, { max: 50 }]}
          >
            <Input placeholder="Ej: CS-F-1" disabled={!!editingTemplate?.id} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Nombre de Plantilla"
            rules={[{ required: true, message: 'Nombre es requerido' }, { max: 255 }]}
          >
            <Input placeholder="Ej: Formato Registro Clientes" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Descripción (Opcional)"
            rules={[{ max: 1000 }]}
          >
            <Input.TextArea rows={3} placeholder="Describe el propósito del formato" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FormTemplatesPage;