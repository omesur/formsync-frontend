// src/pages/InstanceDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
// --- Ant Design Imports ---
import { Descriptions, Button, Spin, Typography, Tag } from 'antd'; // Importar Descriptions, Tag, Space
import { DownloadOutlined, EditOutlined } from '@ant-design/icons'; // Para el botón de descarga
import apiClient from '../services/apiService';
import { FormStatus } from '../common/enums/form-status.enum'; // Reutilizar o definir enum
import { FormFieldDefinition } from '../common/interfaces/form-field.interfaces'; // Reutilizar interfaz

const { Title, Paragraph } = Typography;

// Interfaz para la plantilla completa (incluyendo estructura)
interface FullFormTemplate {
    id: number;
    uniqueCode: string;
    name: string;
    description?: string;
    structureDefinition?: FormFieldDefinition[]; // La estructura es clave aquí
    version: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UploadedFile {
    id: number;
    filename: string;
    storageKey: string; // Ruta local relativa
    mimeType: string;
    size: number;
    fieldName: string;
}

// Interfaz para la instancia completa que esperamos del backend
interface FullFormInstance {
    id: number;
    data: Record<string, any>; // Los datos diligenciados
    status: FormStatus;
    createdAt: string;
    updatedAt: string;
    templateId: number;
    ownerUserId: number;
    template: FullFormTemplate; // Incluye la plantilla completa
    uploadedFiles: UploadedFile[];
}


// Helper para mostrar el estado (puedes moverlo a un archivo utils)
const getStatusLabel = (status: FormStatus): string => {
    switch (status) {
        case FormStatus.Draft: return 'Borrador';
        case FormStatus.Submitted: return 'Enviado';
        case FormStatus.Approved: return 'Aprobado';
        case FormStatus.Rejected: return 'Rechazado';
        case FormStatus.Signed: return 'Firmado';
        case FormStatus.Archived: return 'Archivado';
        default: return status;
    }
}

// Helper para el Tag de AntD
const getStatusTag = (status: FormStatus): React.ReactNode => {
    let color: string;
    let text: string = getStatusLabel(status); // Reutilizar getStatusLabel
    switch (status) {
        case FormStatus.Draft: color = 'blue'; break;
        case FormStatus.Submitted: color = 'processing'; break;
        case FormStatus.Approved: color = 'success'; break;
        case FormStatus.Rejected: color = 'error'; break;
        case FormStatus.Signed: color = 'gold'; break;
        case FormStatus.Archived: color = 'default'; break;
        default: color = 'default';
    }
    return <Tag color={color}>{text.toUpperCase()}</Tag>;
};

// Helper para formatear valores (puedes expandirlo)
const formatFieldValue = (value: any, type: FormFieldDefinition['type']): string => {
    if (value === null || value === undefined) return 'No proporcionado';
    if (type === 'date' && typeof value === 'string') {
        try { return new Date(value).toLocaleDateString(); } catch { return value; }
    }
    if (type === 'checkbox') {
        return value ? 'Sí' : 'No';
    }
    // TODO: Manejar tipo 'file' (mostrar nombre, enlace?)
    // TODO: Manejar tipo 'password' (mostrar '********')
    if (typeof value === 'object') { // Por si acaso (ej: FileList)
        return JSON.stringify(value);
    }
    return String(value);
}


const InstanceDetailPage: React.FC = () => {
    const { instanceId } = useParams<{ instanceId: string }>();
    const navigate = useNavigate();

    const [instanceData, setInstanceData] = useState<FullFormInstance | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleDownloadClick = (file: UploadedFile) => {
        try {
            // Construir la URL completa al endpoint de descarga local
            const downloadUrl = `${apiClient.defaults.baseURL}/storage/download-local/file/${file.id}`;
            console.log("Attempting to download from:", downloadUrl);
            // Abrir la URL directamente, el backend se encarga de enviar el archivo
            window.open(downloadUrl, '_blank');
        } catch (error) {
            // Este catch probablemente no atrape errores de red de window.open
            console.error(`Error constructing download URL for file ${file.id}:`, error);
            toast.error(`No se pudo iniciar la descarga para ${file.filename}`);
        }
    };
    
    const fetchInstanceDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            // Usamos el endpoint GET /form-instances/:id que ya valida propiedad en el backend
            const response = await apiClient.get<FullFormInstance>(`/form-instances/${instanceId}`);
            // Ordenar la estructura de la plantilla por si acaso
            if(response.data.template?.structureDefinition) {
                 response.data.template.structureDefinition.sort((a, b) => a.order - b.order);
            }
            setInstanceData(response.data);
        } catch (error: any) {
            console.error("Error fetching instance details:", error);
            const errorMessage = error.response?.status === 403
                ? "No tienes permiso para ver este formulario."
                : `No se pudo cargar el detalle del formulario (ID: ${instanceId}). ${error.response?.data?.message || ''}`;
            toast.error(errorMessage);
            navigate('/my-instances'); // Volver a la lista si hay error
        } finally {
            setIsLoading(false);
        }
    }, [instanceId, navigate]);

    useEffect(() => {
        fetchInstanceDetails();
    }, [fetchInstanceDetails]);

    if (isLoading) { return <div style={{ textAlign: 'center', marginTop: '50px' }}><Spin size="large" tip="Cargando detalles..." /></div>; }
    if (!instanceData) { return <div>No se pudo cargar la información. <Link to="/my-instances">Volver</Link></div>; }

    const { template, data: filledData, status, createdAt, updatedAt, id: currentInstanceId } = instanceData;
    const structure = template?.structureDefinition || [];

    return (
        <div>
            <Title level={3} style={{ marginBottom: '24px' }}>
                Detalle del Formulario: {template?.name || `Instancia #${currentInstanceId}`}
            </Title>
            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small">
                <Descriptions.Item label="Nombre Plantilla">{template?.name || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Código Plantilla">{template?.uniqueCode || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Versión Plantilla">{template?.version || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="ID Instancia">{currentInstanceId}</Descriptions.Item>
                <Descriptions.Item label="Estado">{getStatusTag(status)}</Descriptions.Item>
                <Descriptions.Item label="Enviado el">{new Date(createdAt).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Última Actualización">{new Date(updatedAt).toLocaleString()}</Descriptions.Item>
            </Descriptions>

             {status === FormStatus.Draft && (
                <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                    <Link to={`/instance/${currentInstanceId}/edit`}>
                        <Button type="primary" icon={<EditOutlined />}>Editar Formulario</Button>
                    </Link>
                </div>
            )}

            <Title level={4} style={{ marginTop: '32px', marginBottom: '16px' }}>Datos Diligenciados</Title>
            {structure.length === 0 ? (
                <Paragraph>La plantilla asociada no tiene una estructura definida.</Paragraph>
            ) : (
                <Descriptions bordered column={1} size="small">
                    {structure.map(fieldDef => {
                        let displayValue: React.ReactNode;
                        const rawValue = filledData[fieldDef.name];

                        if (fieldDef.type === 'file') {
                            const relatedFile = instanceData.uploadedFiles?.find(f => f.fieldName === fieldDef.name);
                            if (relatedFile) {
                                displayValue = (
                                    <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownloadClick(relatedFile)} style={{ padding: 0, height: 'auto' }} >
                                        {relatedFile.filename} ({(relatedFile.size / 1024).toFixed(1)} KB)
                                    </Button>
                                );
                            } else { displayValue = <i>No se adjuntó archivo.</i>; }
                        } else {
                            displayValue = formatFieldValue(rawValue, fieldDef.type);
                        }
                        return (
                            <Descriptions.Item label={fieldDef.label} key={fieldDef.id || fieldDef.name}>
                                {displayValue}
                            </Descriptions.Item>
                        );
                    })}
                </Descriptions>
            )}

              <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                 <Link to="/my-instances">
                     <Button>← Volver a Mis Formularios</Button>
                 </Link>
             </div>
        </div>
    );
};

export default InstanceDetailPage;