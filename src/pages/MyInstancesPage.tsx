// src/pages/MyInstancesPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 

// --- Ant Design Imports ---
import { Table, Tag, Button, Space, Typography, Tooltip } from 'antd'; // Importar Table, Tag, Button, etc.
import { EditOutlined, EyeOutlined } from '@ant-design/icons'; // Importar iconos

// Importar tipos específicos de Table
import type { TableProps } from 'antd'; // <-- Importar tipos de Table
import type { Key } from 'react';

import apiClient from '../services/apiService';
import { toast } from 'react-toastify';
import { FormStatus } from '../common/enums/form-status.enum'; 

const { Title } = Typography; // Para el título

// Interfaz para la información que esperamos del endpoint /my
interface MyFormInstanceSummary {
    id: number;
    status: FormStatus; // Usar el tipo Enum
    createdAt: string;
    updatedAt: string;
    templateId: number;
    template: { // Objeto anidado con datos de la plantilla
        id: number;
        name: string;
        uniqueCode: string;
    };
    // Nota: No esperamos el campo 'data' aquí
}

// Helper para mostrar el estado de forma más amigable
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

// Helper para el tag de estado
const getStatusTag = (status: FormStatus): React.ReactNode => {
    let color: string;
    let text: string = status;
    switch (status) {
        case FormStatus.Draft: color = 'blue'; text = 'Borrador'; break;
        case FormStatus.Submitted: color = 'processing'; text = 'Enviado'; break; // 'processing' da un efecto azul brillante
        case FormStatus.Approved: color = 'success'; text = 'Aprobado'; break;
        case FormStatus.Rejected: color = 'error'; text = 'Rechazado'; break;
        case FormStatus.Signed: color = 'gold'; text = 'Firmado'; break;
        case FormStatus.Archived: color = 'default'; text = 'Archivado'; break;
        default: color = 'default';
    }
    return <Tag color={color}>{text}</Tag>;
}

const MyInstancesPage: React.FC = () => {
    const [instances, setInstances] = useState<MyFormInstanceSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInstances = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient.get<MyFormInstanceSummary[]>('/form-instances/my');
                setInstances(response.data);
            } catch (error: any) {
                console.error("Error fetching user instances:", error);
                toast.error("No se pudieron cargar tus formularios enviados.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInstances();
    }, []); // Ejecutar solo al montar

    const columns: TableProps<MyFormInstanceSummary>['columns'] = [
        {
            title: 'ID Instancia',
            dataIndex: 'id', // Propiedad del objeto en 'instances'
            key: 'id',
            sorter: (a: MyFormInstanceSummary, b: MyFormInstanceSummary) => a.id - b.id, // Habilitar ordenación
        },
        {
            title: 'Formulario (Plantilla)',
            dataIndex: ['template', 'name'], // Acceder a propiedad anidada
            key: 'templateName',
            sorter: (a: MyFormInstanceSummary, b: MyFormInstanceSummary) => a.template.name.localeCompare(b.template.name),
        },
        {
            title: 'Código Plantilla',
            dataIndex: ['template', 'uniqueCode'],
            key: 'templateCode',
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status: FormStatus) => getStatusTag(status), // Usar el helper para renderizar Tag
            filters: Object.values(FormStatus).map(s => ({ text: getStatusLabel(s), value: s })), // Añadir filtros
            onFilter: (value: Key | boolean, record: MyFormInstanceSummary): boolean => {
                // 'value' puede ser string, number o boolean
                // Sabemos que nuestros filtros usan los valores string del enum FormStatus
                if (typeof value === 'string') {
                    // Comparamos el status del registro con el valor del filtro (ambos son strings del enum)
                    return record.status === (value as FormStatus); // <-- Cast explícito a FormStatus
                }
                // Si el valor no es string (o no coincide), no filtramos este registro
                return false;
           },
        },
        {
            title: 'Fecha Creación',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleString(),
            sorter: (a: MyFormInstanceSummary, b: MyFormInstanceSummary) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        },
        {
            title: 'Última Modificación',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (date: string) => new Date(date).toLocaleString(),
             sorter: (a: MyFormInstanceSummary, b: MyFormInstanceSummary) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_: any, record: MyFormInstanceSummary) => ( // '_' ignora el primer argumento (valor de celda), 'record' es el objeto de la fila
                <Space size="small"> {/* Space para espaciar botones */}
                    <Tooltip title="Ver Detalles"> {/* Tooltip para accesibilidad */}
                         <Link to={`/instance/${record.id}/view`}>
                            <Button type="primary" icon={<EyeOutlined />} size="small" />
                         </Link>
                    </Tooltip>
                    {record.status === FormStatus.Draft && ( // Mostrar Editar solo si es Draft
                        <Tooltip title="Editar Borrador">
                             <Link to={`/instance/${record.id}/edit`}>
                                 <Button icon={<EditOutlined />} size="small" />
                             </Link>
                        </Tooltip>
                    )}
                     {/* Podrías añadir botón de eliminar aquí si implementas la funcionalidad */}
                     {/* <Tooltip title="Eliminar"> */}
                     {/*    <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)} /> */}
                     {/* </Tooltip> */}
                </Space>
            ),
        },
    ];


    return (
        <div>
            <Title level={2}>Mis Formularios Enviados</Title>
            <Table
                columns={columns} // Definición de columnas
                dataSource={instances} // Array de datos
                loading={isLoading} // Indicador de carga
                rowKey="id" // Clave única para cada fila (debe ser una propiedad del objeto)
                size="small" // O 'middle', 'large'
                pagination={{ pageSize: 10 }} // Opciones de paginación (opcional)
                scroll={{ x: 'max-content' }} // Permitir scroll horizontal si es necesario
                style={{ marginTop: '20px' }}
            />
        </div>
    );
};

export default MyInstancesPage;