import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiService';
import { toast } from 'react-toastify';
// --- Ant Design Imports ---
import { List, Button, Typography, Card, Empty } from 'antd'; // Usar List, Spin, Card, Empty
import { FormOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface FillableTemplate {
  id: number;
  uniqueCode: string;
  name: string;
  description?: string;
  version: number;
}

const FillableFormsPage: React.FC = () => {
  const [templates, setTemplates] = useState<FillableTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        // Asumimos que /form-templates devuelve todas, podríamos filtrar por isActive si el backend lo soporta
        const response = await apiClient.get<FillableTemplate[]>('/form-templates');
        // Podrías filtrar aquí las activas si el backend no lo hace: response.data.filter(t => t.isActive)
        setTemplates(response.data);
      } catch (error: any) {
        console.error("Error fetching fillable templates:", error);
        toast.error("No se pudieron cargar los formularios disponibles.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  if (isLoading) {
    return <div>Cargando formularios disponibles...</div>;
  }

  return (
    <div>
        <Title level={2}>Formularios Disponibles para Diligenciar</Title>
        <List
            loading={isLoading} // Indicador de carga integrado
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }} // Layout de rejilla responsiva
            dataSource={templates}
            locale={{ emptyText: <Empty description="No hay formularios disponibles en este momento." /> }} // Mensaje si está vacío
            renderItem={(template) => (
                <List.Item>
                    <Card
                        title={`${template.name} (v${template.version})`}
                        actions={[ // Botones en la parte inferior de la tarjeta
                            <Link key="fill" to={`/fill/${template.id}`}>
                                <Button type="primary" icon={<FormOutlined />}>
                                    Diligenciar
                                </Button>
                            </Link>
                        ]}
                    >
                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'más' }}>
                            {template.description || 'Sin descripción.'}
                        </Paragraph>
                        <Paragraph type="secondary" style={{ fontSize: '0.9em' }}>
                            Código: {template.uniqueCode}
                        </Paragraph>
                    </Card>
                </List.Item>
            )}
        />
    </div>
);
};

export default FillableFormsPage;