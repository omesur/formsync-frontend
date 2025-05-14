// Solución completa para FormFillingPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
// Ant Design Imports
import { Form, Button, Spin, Typography, Space, Row, Col } from 'antd';
import type { Rule } from 'antd/es/form';
// Otros Imports
import apiClient from '../services/apiService';
import { FormFieldDefinition, FileUploadState } from '../common/interfaces/form-field.interfaces';
import DynamicFormField from '../components/DynamicFormField';
import { FormStatus } from '../common/enums/form-status.enum';

const { Title, Paragraph } = Typography;

interface UploadedFileDataFromServer {
    id: number;
    filename: string;
    storageKey: string;
    mimeType: string;
    size: number;
    fieldName: string;
    }

interface TemplateDataForPage {
    id: number;
    uniqueCode?: string;
    name: string;
    description?: string;
    structureDefinition: FormFieldDefinition[];
    version?: number;
}

const FormFillingPage: React.FC = () => {
    const { templateId: templateIdParam, instanceId: instanceIdParam } = useParams<{ templateId?: string; instanceId?: string }>();
    const navigate = useNavigate();
    const isEditMode = !!instanceIdParam;

    const [form] = Form.useForm<Record<string, any>>();
    const [template, setTemplate] = useState<TemplateDataForPage | null>(null);
    const [fileUploads, setFileUploads] = useState<Record<string, FileUploadState | null>>({});
    const [isLoading, setIsLoading] = useState(true); // isLoading ahora solo para la carga inicial
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialFormValues, setInitialFormValues] = useState<Record<string, any> | undefined>(undefined);
    // formKey ya no es estrictamente necesaria con este enfoque, pero no hace daño mantenerla si se actualiza

    // Efecto para resetear y establecer valores cuando initialFormValues cambia
    useEffect(() => {
        if (initialFormValues && template?.structureDefinition && form) {
            console.log('EFFECT (initialValues): Resetting, setting fields, and validating with:', initialFormValues);
            form.resetFields(); // Limpia el estado de AntD Form completamente
            form.setFieldsValue(initialFormValues);
            console.log('EFFECT (initialValues): Fields reset and values set.');


            const fieldsThatHaveInitialValueAndAreNotFile = template.structureDefinition
                .filter(field =>
                    field.type !== 'file' &&
                    initialFormValues.hasOwnProperty(field.name) &&
                    initialFormValues[field.name] !== null && // O diferente de lo que consideres "vacío"
                    initialFormValues[field.name] !== ''
                )
                .map(field => field.name);

            if (fieldsThatHaveInitialValueAndAreNotFile.length > 0) {
                console.log('EFFECT (initialValues): Validating fields with initial values:', fieldsThatHaveInitialValueAndAreNotFile);
                form.validateFields(fieldsThatHaveInitialValueAndAreNotFile)
                    .then(() => {
                        console.log('EFFECT (initialValues): Validation successful for fields with initial values.');
                    })
                    .catch((errorInfo) => {
                        // Esto es normal si algunos campos con valor inicial aún no cumplen otras reglas (ej: formato email)
                        console.warn('EFFECT (initialValues): Validation found errors for fields with initial values:', errorInfo.errorFields);
                    });
            } else {
                 console.log('EFFECT (initialValues): No fields with initial values to validate immediately.');
                 // Si queremos que los errores de "required" para campos vacíos aparezcan de inmediato:
                 // form.validateFields().catch(() => {}); // Validar todo
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialFormValues, form, template]); // Depender de initialFormValues, form y template

    // Cargar datos de la plantilla o instancia
     const loadData = useCallback(async () => {
        console.log('LOAD_DATA: Start');
        setIsLoading(true);
        setFileUploads({});
        setInitialFormValues(undefined); 

        let calculatedInitialValues: Record<string, any> = {};
        let localInitialFileUploads: Record<string, FileUploadState | null> = {};
        let loadedTemplateData: TemplateDataForPage | null = null;

        try {
            if (isEditMode && instanceIdParam) {
                const response = await apiClient.get<any>(`/form-instances/${instanceIdParam}`);
                const instanceRespData = response.data;
                console.log('LOAD_DATA: Edit mode - instance fetched:', instanceRespData);

                if (instanceRespData.status !== FormStatus.Draft) {
                    toast.warn(`Formulario (Estado: ${instanceRespData.status}) no editable.`);
                    navigate(`/instance/${instanceIdParam}/view`, { replace: true });
                    setIsLoading(false); return;
                }
                if (!instanceRespData.template) throw new Error("Instancia sin info de plantilla.");

                const structure = (instanceRespData.template.structureDefinition || []).sort((a: any, b: any) => a.order - b.order) as FormFieldDefinition[];
                loadedTemplateData = { ...instanceRespData.template, structureDefinition: structure };

                const instanceStoredData = instanceRespData.data || {};
                structure.forEach((field) => {
                    if (field.type === 'file') {
                        const existingFile = (instanceRespData.uploadedFiles || []).find((f: UploadedFileDataFromServer) => f.fieldName === field.name);
                        if (existingFile) {
                            localInitialFileUploads[field.name] = {
                                status: 'uploaded', storageKey: existingFile.storageKey, filename: existingFile.filename,
                                mimeType: existingFile.mimeType, size: existingFile.size,
                            };
                        }
                        calculatedInitialValues[field.name] = null; // Para AntD Form, no intentará controlar
                    } else {
                        calculatedInitialValues[field.name] = instanceStoredData.hasOwnProperty(field.name)
                            ? instanceStoredData[field.name]
                            : (field.defaultValue ?? (field.type === 'checkbox' ? false : null));
                    }
                });

            } else if (templateIdParam) {
                const response = await apiClient.get<TemplateDataForPage>(`/form-templates/${templateIdParam}`);
                const templateRespData = response.data;
                console.log('LOAD_DATA: Create mode - template fetched:', templateRespData);

                const structure = (templateRespData.structureDefinition || []).sort((a, b) => a.order - b.order);
                loadedTemplateData = { ...templateRespData, structureDefinition: structure };

                structure.forEach((field) => {
                    calculatedInitialValues[field.name] = field.type !== 'file'
                        ? (field.defaultValue ?? (field.type === 'checkbox' ? false : null))
                        : null;
                });
            } else {
                throw new Error("ID no provisto para cargar datos.");
            }

            if (loadedTemplateData) setTemplate(loadedTemplateData);
            setFileUploads(localInitialFileUploads);
            setInitialFormValues(calculatedInitialValues); // ESTO disparará el re-render del Form con nueva 'key' y 'initialValues'

            console.log('LOAD_DATA: initialFormValues prepared and set to state:', JSON.stringify(calculatedInitialValues, null, 2));

        } catch (error: any) { /* ... manejo de error ... */ }
        finally {
            console.log('LOAD_DATA: Finally block, setting isLoading to false');
            if (isLoading) setIsLoading(false); // Condicional
            console.log('LOAD_DATA: End');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateIdParam, instanceIdParam, isEditMode, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Validación de campos de archivo
    const validateFileFields = useCallback(() => {
    if (!template) return true; // No hay plantilla, no hay nada que validar
    let allRequiredFilesOk = true;
    template.structureDefinition.forEach((field) => {
        if (field.type === 'file' && field.required) {
            const fileState = fileUploads[field.name];
            if (!fileState || fileState.status !== 'uploaded') {
                allRequiredFilesOk = false;
                // Opcional: Mostrar un toast específico para este archivo
                toast.error(`${field.label} es requerido.`);
            }
        }
    });
    return allRequiredFilesOk;
    }, [template, fileUploads]);

    // Manejo de subida de archivos
    const uploadFileLocal = async (fieldName: string, fileToUpload: File) => {
        form.setFields([{
            name: fieldName,
            errors: ['Archivo en proceso de carga...']
        }]);
        
        setFileUploads(prev => ({
            ...prev, 
            [fieldName]: { 
                file: fileToUpload, 
                status: 'uploading', 
                filename: fileToUpload.name, 
                progress: 0 
            }
        }));
        
        const fd = new FormData();
        fd.append('file', fileToUpload);
        
        try {
            const response = await apiClient.post('/storage/upload-local', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setFileUploads(prev => {
                const current = prev[fieldName];
                return current ? {
                    ...prev,
                    [fieldName]: {
                        status: 'uploaded',
                        storageKey: response.data.storageKey,
                        filename: response.data.filename,
                        mimeType: response.data.mimeType,
                        size: response.data.size,
                        progress: 100
                    }
                } : prev;
            });
            
            // Actualizar el valor del campo en el formulario
            form.setFields([{
                name: fieldName,
                value: response.data.filename,
                errors: []
            }]);
            
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Fallo de subida';
            
            setFileUploads(prev => {
                const current = prev[fieldName];
                return current ? {
                    ...prev,
                    [fieldName]: {
                        ...current,
                        status: 'error',
                        error: errorMsg,
                        progress: undefined
                    }
                } : prev;
            });
            
            form.setFields([{
                name: fieldName,
                errors: [`Error al subir: ${errorMsg}`]
            }]);
            
            toast.error(`Error al subir ${fileToUpload.name}: ${errorMsg}`);
        }
    };

    // Manejo de selección de archivos
    const handleFileSelected = (fieldName: string, file: File | null) => {
        if (file) {
            const currentUploadState = fileUploads[fieldName];
            
            if (!currentUploadState || 
                currentUploadState.status === 'error' || 
                currentUploadState.filename !== file.name) {
                    
                uploadFileLocal(fieldName, file);
            }
        } else {
            // Si se eliminó el archivo
            setFileUploads(prev => ({ ...prev, [fieldName]: null }));
            
            form.setFields([{
                name: fieldName,
                value: null
            }]);
            
            // Verificar si el campo es requerido
            const field = template?.structureDefinition.find((f: FormFieldDefinition) => f.name === fieldName);
            if (field?.required) {
                form.setFields([{
                    name: fieldName,
                    errors: [`${field.label} es requerido.`]
                }]);
            }
        }
    };

    // Envío del formulario
    const handleFinish = async (formValues: Record<string, any>, submitStatus: FormStatus = FormStatus.Submitted) => {
        // Verificar archivos en proceso de carga
                
        // Validación explícita de campos de archivo
        if (!validateFileFields()) {
            toast.error("Por favor complete todos los campos de archivo obligatorios.");
            return;
        }
        
        setIsSubmitting(true);
        
        // Preparar datos para enviar
        const dataToSend: Record<string, any> = {};
        
        template?.structureDefinition.forEach((field: FormFieldDefinition) => {
            if (field.type === 'file') {
                const fileState = fileUploads[field.name];
                
                if (fileState?.status === 'uploaded' && fileState.storageKey) {
                    dataToSend[field.name] = {
                        storageKey: fileState.storageKey,
                        filename: fileState.filename,
                        mimeType: fileState.mimeType,
                        size: fileState.size
                    };
                } else {
                    dataToSend[field.name] = null;
                }
            } else if (field.type === 'date' && formValues[field.name] && 
                       typeof formValues[field.name].toISOString === 'function') {
                dataToSend[field.name] = formValues[field.name].toISOString();
            } else {
                dataToSend[field.name] = formValues[field.name];
            }

        });
        
        try {
            if (isEditMode && instanceIdParam) {
                console.log('DEBUG: Data being sent to backend (dataToSend):', JSON.stringify(dataToSend, null, 2));
                console.log('DEBUG: Values from AntD Form (formValuesFromAntD):', JSON.stringify(formValues, null, 2));
                await apiClient.patch(`/form-instances/${instanceIdParam}`, {
                    data: dataToSend,
                    status: submitStatus
                });
                toast.success('¡Formulario actualizado exitosamente!');
            } else if (templateIdParam) {
                console.log('DEBUG: Data being sent to backend (dataToSend):', JSON.stringify(dataToSend, null, 2));
                console.log('DEBUG: Values from AntD Form (formValuesFromAntD):', JSON.stringify(formValues, null, 2));
                await apiClient.post('/form-instances', {
                    templateId: Number(templateIdParam),
                    data: dataToSend,
                    status: submitStatus
                });
                toast.success('¡Formulario enviado exitosamente!');
            }
            navigate('/my-instances');
        } catch (error: any) {
            console.error("Error submitting form:", error);
            toast.error(`Error al guardar: ${error.response?.data?.message || 'Error desconocido'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Guardar como borrador
    const handleSaveAsDraft = async () => {
        try {
            const currentValues = form.getFieldsValue(true);
            handleFinish(currentValues, FormStatus.Draft);
        } catch (error) {
            console.error("Error getting form values for draft:", error);
            toast.error("Error al preparar el borrador");
        }
    };

    if (isLoading || !template) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}><Spin size="large" tip="Cargando..." /></div>;
    }

    const handleFinishFailed = (errorInfo: any) => {
        console.log('FORM FINISH FAILED - Validation Errors from AntD:', errorInfo);
        if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
            // Puedes mostrar un toast general o iterar y mostrar cada error
            toast.error("Por favor, corrige los errores marcados en el formulario.");
        } else {
            // Si no hay errorFields pero onFinishFailed se llamó, es raro.
            toast.error("Ocurrió un error al intentar enviar el formulario.");
        }
    };

    return (
        <div>
            <Title level={2}>
                {isEditMode ? `Editar Formulario: ${template.name}` : template.name}
            </Title>
            
            {isEditMode && (
                <Paragraph>
                    Editando instancia #{instanceIdParam} (Plantilla: {template.name} v{template.version})
                </Paragraph>
            )}
            
            {!isEditMode && (
                <Paragraph>
                    {template.description || `Diligencie el formulario ${template.name}`}
                </Paragraph>
            )}
            
            <hr style={{ marginBottom: '24px' }} />

            <Form
                form={form}
                layout="vertical"
                onFinish={(values) => handleFinish(values, FormStatus.Submitted)}
                onFinishFailed={handleFinishFailed} // <-- AÑADIR ESTO
                //key={formKey} // Usar la clave única para forzar re-renderizado completo
            >
            <Row gutter={[16, 0]}>

                {template.structureDefinition.map(field => {
                    const currentFileState = fileUploads[field.name];
                    const rules: Rule[] = [];
                    
                    // Configurar reglas de validación
                    if (field.required && field.type !== 'file') {
                        rules.push({ 
                            required: true, 
                            message: `${field.label} es requerido.` 
                        });
                    }
                    
                    if (field.required && field.type === 'file') {
                        rules.push({
                            validator: async (_rule, value) => {
                                const fileState = fileUploads[field.name];
                                if (!fileState || fileState.status !== 'uploaded') {
                                    throw new Error(`${field.label} es requerido.`);
                                }
                            }
                        });
                    }
                    
                    //Otras validaciones
                    if (field.type === 'email') {
                        rules.push({ 
                            type: 'email', 
                            message: 'Formato de correo inválido.' 
                        });
                    }
                    
                    if (field.validations?.minLength && field.type !== 'file') {
                        rules.push({ 
                            min: field.validations.minLength, 
                            message: `Mínimo ${field.validations.minLength} caracteres.` 
                        });
                    }
                    
                    if (field.validations?.maxLength && field.type !== 'file') {
                        rules.push({ 
                            max: field.validations.maxLength, 
                            message: `Máximo ${field.validations.maxLength} caracteres.` 
                        });
                    }
                    
                    if (field.validations?.pattern && field.type !== 'file') {
                        try {
                            rules.push({ 
                                pattern: new RegExp(field.validations.pattern), 
                                message: `Formato inválido.` 
                            });
                        } catch (e) {
                            console.error("Error RegExp:", e);
                        }
                    }

                    // Renderizado de campos
                    if (field.type === 'file') {
                        return (
                            <Col xs={24} sm={12} md={8} key={field.id || field.name}> {/* Cada campo en su Col */}
                                <div style={{ marginBottom: '24px' }}>
                                <div key={field.id || field.name} style={{ marginBottom: '24px' }}>
                                <label htmlFor={`field-${field.id || field.name}`} /* ... */ >
                                    {field.label}
                                    {/* Mostrar asterisco visualmente si es requerido, pero no habrá validación AntD */}
                                    {field.required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
                                </label>
                                <DynamicFormField field={field} onFileChange={handleFileSelected} id={`field-${field.id || field.name}`} />
                                    {currentFileState && (
                                        <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                                            {currentFileState.status === 'selected' && (
                                                <span>Seleccionado: {currentFileState.filename}</span>
                                            )}
                                            {currentFileState.status === 'uploading' && (
                                                <span>
                                                    Subiendo {currentFileState.filename}... 
                                                    <Spin size="small" style={{ marginLeft: '5px' }} />
                                                </span>
                                            )}
                                            {currentFileState.status === 'uploaded' && (
                                                <span style={{ color: 'green' }}>
                                                    ✓ Subido: {currentFileState.filename} 
                                                    ({(currentFileState.size! / 1024).toFixed(1)} KB)
                                                </span>
                                            )}
                                            {currentFileState.status === 'error' && (
                                                <span style={{ color: 'red' }}>
                                                    ✗ Error: {currentFileState.error || 'Fallo de subida'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>
                            </Col>
                        );
                    } else {
                        return (
                            <Col xs={24} sm={12} md={8} key={field.id || field.name}>
                                <Form.Item
                                    key={field.id || field.name}
                                    label={field.label}
                                    name={field.name}
                                    rules={rules}
                                    valuePropName={field.type === 'checkbox' ? 'checked' : 'value'}
                                    required={field.required}
                                    
                                >
                                    <div style={{ maxWidth: '400px' }}>
                                        <DynamicFormField field={field} />
                                    </div>
                                </Form.Item>
                            </Col>
                        );
                    }
                })}
            </Row>

                {template.structureDefinition.length > 0 && (
                    <Form.Item style={{ marginTop: '24px' }}>
                        <Space wrap>
                            <Button 
                                type="primary"
                                htmlType="submit"
                                loading={isSubmitting}
                                disabled={isLoading}
                            >
                                {isEditMode ? 'Guardar y Enviar' : 'Enviar Formulario'}
                            </Button>
                            <Button
                                htmlType="button"
                                onClick={handleSaveAsDraft}
                                loading={isSubmitting}
                                disabled={isLoading}
                            >
                                Guardar como Borrador
                            </Button>
                        </Space>
                    </Form.Item>
                )}
            </Form>
            
            <div style={{ marginTop: '2rem' }}>
                <Link to={isEditMode ? '/my-instances' : '/fillable-forms'}>
                    <Button type="default">← Cancelar</Button>
                </Link>
            </div>
        </div>
    );
};

export default FormFillingPage;