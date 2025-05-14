// src/pages/FormTemplateEditorPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs únicos
import {
    Button, Typography, Spin, List, Tooltip, Modal, Form,
    Input, Select, Checkbox, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import apiClient from '../services/apiService';
import { FormFieldDefinition, FormFieldType, FormFieldOption, FormFieldValidations } from '../common/interfaces/form-field.interfaces'; // Importar interfaces

const { Title, Paragraph } = Typography;
const { Option } = Select;

// Interfaz para los datos básicos de la plantilla
interface FormTemplateBasicInfo {
    id: number;
    uniqueCode: string;
    name: string;
    description?: string;
}

// Tipo para el estado del campo que se está editando/creando
type EditingFieldState = {
    id?: string | null;
    name: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    placeholder: string; // Siempre string en el estado del form
    options: string;     // String para el textarea
    validations: string; // String JSON para el textarea
    defaultValue: string; // Tratar como string en el form
};

// Tipo para el estado del campo en el formulario del Modal
type FieldEditorFormState = Omit<FormFieldDefinition, 'id' | 'order' | 'options' | 'validations'> & {
    id?: string | null; // ID es opcional al crear
    optionsString?: string; // Opciones como string para TextArea
    validationsString?: string; // Validaciones como string JSON para TextArea
};

const FormTemplateEditorPage: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();

    const [templateInfo, setTemplateInfo] = useState<FormTemplateBasicInfo | null>(null);
    const [fields, setFields] = useState<FormFieldDefinition[]>([]); // El estado principal: la estructura
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para el formulario de edición/creación de campo
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<EditingFieldState | null>(null); // Datos del campo en el form
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null); // Índice para saber si es edición
    const [fieldForm] = Form.useForm<FieldEditorFormState>();
    const currentModalFieldType = Form.useWatch('type', fieldForm); // Observar el campo 'type' del form del modal

    // --- Carga Inicial de Datos ---
    const fetchTemplateData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get<{ structureDefinition: FormFieldDefinition[] } & FormTemplateBasicInfo>(`/form-templates/${templateId}`);
            setTemplateInfo({
                id: response.data.id,
                uniqueCode: response.data.uniqueCode,
                name: response.data.name,
                description: response.data.description,
            });
            // Ordenar los campos por 'order' al cargar
            const sortedFields = (response.data.structureDefinition || []).sort((a, b) => a.order - b.order);
            setFields(sortedFields);
        } catch (error: any) {
            console.error("Error fetching template data:", error);
            toast.error(`No se pudo cargar la plantilla ${templateId}. ${error.response?.data?.message || ''}`);
            navigate('/templates'); // Volver a la lista si falla la carga
        } finally {
            setIsLoading(false);
        }
    }, [templateId, navigate]);

    useEffect(() => {
        fetchTemplateData();
    }, [fetchTemplateData]);
    
     // --- Lógica del Modal para Añadir/Editar Campo ---
    const showFieldModal = (fieldToEdit?: FormFieldDefinition, index?: number) => {
        if (fieldToEdit) {
            // Editando
            setEditingField(editingField);
            setEditingFieldIndex(index!); // Sabemos que index existe si fieldToEdit existe
            fieldForm.setFieldsValue({
                ...fieldToEdit,
                optionsString: fieldToEdit.options?.map(opt => `${opt.value}:${opt.label}`).join('\n') || '',
                validationsString: JSON.stringify(fieldToEdit.validations || {}, null, 2), // Formateado para legibilidad
            });
        } else {
            // Creando
            setEditingField(null);
            setEditingFieldIndex(null);
            fieldForm.resetFields(); // Limpiar para nuevo campo
            fieldForm.setFieldsValue({ // Valores por defecto para nuevo campo
                type: 'text',
                required: false,
                validationsString: '{}', // JSON vacío por defecto
            });
        }
        setIsModalOpen(true);
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setEditingField(null);
        setEditingFieldIndex(null);
        fieldForm.resetFields();
    };

    const handleSaveFieldFromModal = async (formValues: FieldEditorFormState) => {
        // Validaciones básicas adicionales si es necesario
        if (!formValues.name || !formValues.label) {
            toast.warn('El Nombre interno y la Etiqueta son obligatorios.');
            return;
        }
        const isNameDuplicate = fields.some(
            (f, idx) => f.name === formValues.name.trim() && idx !== editingFieldIndex
        );
        if (isNameDuplicate) {
            toast.warn(`El nombre interno '${formValues.name.trim()}' ya está en uso.`);
            return;
        }

        let parsedOptions: FormFieldOption[] | undefined = undefined;
        if (formValues.type === 'select' || formValues.type === 'radio') {
            if (!formValues.optionsString || formValues.optionsString.trim() === '') {
                toast.warn('Opciones requeridas para select/radio (formato: valor:etiqueta).'); return;
            }
            try {
                parsedOptions = formValues.optionsString.trim().split('\n').map(line => {
                    const parts = line.split(':');
                    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) throw new Error(`Formato inválido: "${line}"`);
                    return { value: parts[0].trim(), label: parts[1].trim() };
                });
            } catch (e: any) { toast.warn(`Error en opciones: ${e.message}`); return; }
        }

        let parsedValidations: FormFieldValidations | undefined = undefined;
        try {
            parsedValidations = formValues.validationsString ? JSON.parse(formValues.validationsString) : {};
            if (Object.keys(parsedValidations!).length === 0) parsedValidations = undefined;
        } catch (e) { toast.warn('Formato de Validaciones JSON inválido.'); return; }

        const finalFieldData: FormFieldDefinition = {
            id: editingField?.id || uuidv4(), // Reusar ID si edita, generar nuevo si crea
            order: 0, // El orden se recalculará
            name: formValues.name.trim(),
            label: formValues.label.trim(),
            type: formValues.type as FormFieldType, // Cast porque el form puede tener string
            required: !!formValues.required,
            placeholder: formValues.placeholder?.trim() || undefined,
            options: parsedOptions,
            validations: parsedValidations,
            defaultValue: formValues.defaultValue || undefined,
        };

        setFields(prevFields => {
            const newFields = [...prevFields];
            if (editingFieldIndex !== null) {
                newFields[editingFieldIndex] = finalFieldData; // Reemplazar
            } else {
                newFields.push(finalFieldData); // Añadir
            }
            return newFields.map((f, idx) => ({ ...f, order: idx })); // Recalcular orden
        });

        handleModalCancel(); // Cerrar y resetear modal
        toast.success(editingField ? 'Campo actualizado' : 'Campo añadido');
    };

    // --- Acciones sobre la Lista de Campos ---
    const handleDeleteField = (indexToDelete: number) => {
        if (window.confirm(`¿Seguro que quieres eliminar el campo "${fields[indexToDelete].label}"?`)) {
            setFields(prevFields => {
                 const newFields = prevFields.filter((_, index) => index !== indexToDelete);
                 // Recalcular orden
                 return newFields.map((f, idx) => ({ ...f, order: idx }));
            });
        }
    };

    const handleMoveField = (indexToMove: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && indexToMove === 0) ||
            (direction === 'down' && indexToMove === fields.length - 1)
        ) {
            return; // No se puede mover más allá de los límites
        }

        setFields(prevFields => {
            const newFields = [...prevFields];
            const targetIndex = direction === 'up' ? indexToMove - 1 : indexToMove + 1;

            // Intercambiar elementos
            [newFields[indexToMove], newFields[targetIndex]] = [newFields[targetIndex], newFields[indexToMove]];

            // Recalcular orden
            return newFields.map((f, idx) => ({ ...f, order: idx }));
        });
    };

    // --- Guardado Final ---
    const handleSaveStructure = async () => {
        setIsSaving(true);
        // Asegurarse que el orden está actualizado justo antes de guardar
        const structureToSave = fields.map((f, idx) => ({ ...f, order: idx }));

        try {
            await apiClient.patch(`/form-templates/${templateId}/structure`, {
                // El backend espera un objeto con la clave structureDefinition
                structureDefinition: structureToSave
            });
            toast.success('¡Estructura del formulario guardada exitosamente!');
            // Opcional: Recargar datos por si el backend hizo algún cambio (ej: versión)
            // await fetchTemplateData();
        } catch (error: any) {
            console.error("Error saving structure:", error);
            toast.error(`Error al guardar: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };


    // --- Renderizado ---
    if (isLoading) { return <div style={{ textAlign: 'center', marginTop: '50px' }}><Spin size="large" tip="Cargando editor..." /></div>; }
    if (!templateInfo) { return <div>Plantilla no encontrada. <Link to="/templates">Volver</Link></div>; }

    return (
        <div>
            <Title level={2}>Editor de Estructura: {templateInfo.name}</Title>
            <Paragraph>Código: {templateInfo.uniqueCode} - {templateInfo.description || 'Sin descripción.'}</Paragraph>
            <hr style={{ marginBottom: '24px' }}/>

            <Button type="primary" icon={<PlusOutlined />} onClick={() => showFieldModal()} style={{ marginBottom: '16px' }}>
                Añadir Campo a la Plantilla
            </Button>

            {fields.length === 0 ? (
                <Paragraph>No hay campos definidos para esta plantilla.</Paragraph>
            ) : (
                <List
                    bordered
                    dataSource={fields}
                    renderItem={(field, index) => (
                        <List.Item
                            actions={[
                                <Tooltip title="Mover Arriba"><Button size="small" icon={<UpOutlined />} onClick={() => handleMoveField(index, 'up')} disabled={index === 0} /></Tooltip>,
                                <Tooltip title="Mover Abajo"><Button size="small" icon={<DownOutlined />} onClick={() => handleMoveField(index, 'down')} disabled={index === fields.length - 1} /></Tooltip>,
                                <Tooltip title="Editar Campo"><Button size="small" type="link" icon={<EditOutlined />} onClick={() => showFieldModal(field, index)} /></Tooltip>,
                                <Tooltip title="Eliminar Campo"><Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteField(index)} /></Tooltip>,
                            ]}
                        >
                            <List.Item.Meta
                                title={`${field.order + 1}. ${field.label} (${field.name})`}
                                description={`Tipo: ${field.type} | Requerido: ${field.required ? 'Sí' : 'No'}`}
                            />
                        </List.Item>
                    )}
                />
            )}

            <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem', textAlign: 'right' }}>
                <Button type="primary" onClick={handleSaveStructure} loading={isSaving} disabled={isLoading}>
                    Guardar Estructura Completa
                </Button>
                <Link to="/templates" style={{ marginLeft: '8px' }}>
                    <Button>Volver a Plantillas</Button>
                </Link>
            </div>


            {/* --- MODAL PARA AÑADIR/EDITAR CAMPO --- */}
            <Modal
                title={editingField ? `Editar Campo: ${editingField.label}` : "Añadir Nuevo Campo"}
                open={isModalOpen}
                onOk={() => fieldForm.submit()} // Disparar onFinish del Form
                onCancel={handleModalCancel}
                okText={editingField ? "Guardar Cambios" : "Añadir Campo"}
                cancelText="Cancelar"
                width={700} // Ajustar ancho
                destroyOnClose // Resetear estado del form al cerrar
            >
                <Form form={fieldForm} layout="vertical" name="field_editor_form" onFinish={handleSaveFieldFromModal}>
                    {/* ID no es editable directamente por el usuario, se genera o se usa el existente */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Nombre Interno (único, sin espacios)" rules={[{ required: true, message: 'Nombre interno es requerido' }, {pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, números y guion bajo (_)'}]}>
                                <Input placeholder="ej: user_email" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="label" label="Etiqueta Visible" rules={[{ required: true, message: 'Etiqueta es requerida' }]}>
                                <Input placeholder="ej: Correo Electrónico del Usuario" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="Tipo de Campo" rules={[{ required: true, message: 'Tipo es requerido' }]}>
                                <Select placeholder="Seleccione un tipo">
                                    {(['text', 'textarea', 'number', 'email', 'password', 'date', 'checkbox', 'select', 'radio', 'file'] as FormFieldType[]).map(type => (
                                        <Option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="placeholder" label="Texto de Ejemplo (Placeholder)">
                                <Input placeholder="ej: Ingrese su nombre aquí" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="required" valuePropName="checked">
                        <Checkbox>¿Es Requerido?</Checkbox>
                    </Form.Item>

                    {/* Opciones condicionales para Select y Radio */}
                    {(currentModalFieldType === 'select' || currentModalFieldType === 'radio') && (
                        <Form.Item name="optionsString" label="Opciones (una por línea, formato: valor:etiqueta)" rules={[{ required: true, message: 'Opciones son requeridas para este tipo'}]}>
                            <Input.TextArea rows={4} placeholder={'ej:\nvalor_1:Opción Uno\nvalor_2:Opción Dos'} />
                        </Form.Item>
                    )}

                    <Form.Item name="defaultValue" label="Valor por Defecto (Opcional)">
                        <Input placeholder="Valor si el campo está vacío" />
                    </Form.Item>
                    <Form.Item name="validationsString" label="Validaciones Extra (JSON, Opcional)">
                        <Input.TextArea rows={3} placeholder='ej: {"minLength": 5, "maxLength": 50, "pattern": "^[A-Za-z]+$"}' />
                    </Form.Item>
                </Form>
            </Modal>
            {/* --- FIN DEL MODAL --- */}

        </div>
    );
};

export default FormTemplateEditorPage;