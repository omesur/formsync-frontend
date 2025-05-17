// src/pages/RegisterPage.tsx
import React, { useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// --- Ant Design Imports ---
import { Form, Input, Button, Typography, Row, Col, Card } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';

import apiClient from '../services/apiService'; // Importar nuestro cliente Axios

const { Title } = Typography;

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Dentro de handleSubmit en RegisterPage.tsx:
    const handleSubmit = async () => {
        // setError(null); // Ya no existe setError
        setIsLoading(true);

        if (password !== confirmPassword) {
          toast.error('Las contraseñas no coinciden.');
          return;
      }
      setIsLoading(true);

        try {
          await apiClient.post('/auth/register', { name, email, password });
          // Mostrar toast y redirigir (como antes, pero el toast es suficiente feedback)
          toast.success('¡Registro exitoso! Serás redirigido al login.');
          setTimeout(() => {
              navigate('/login?registered=true');
           }, 1500);

        } catch (err: any) {
          console.error("Error en el registro:", err);
          let errorMessage = 'Error al registrar. Inténtalo de nuevo.';
           if (err.response?.data?.message) {
               const backendMessage = Array.isArray(err.response.data.message)
                                  ? err.response.data.message.join(', ')
                                  : err.response.data.message;
               errorMessage = `Error de registro: ${backendMessage}`;
           }
          toast.error(errorMessage);   
        } finally {
        setIsLoading(false);
        }
    };

  return (
    <Row justify="center" align="middle" style={{ minHeight: 'calc(100vh - 180px)' }}>
             <Col xs={24} sm={16} md={12} lg={10} xl={8}> {/* Un poco más ancho para más campos */}
                 <Card>
                    <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>Crear Cuenta</Title>
                    <Form
                        autoComplete="off"
                        name="register"
                        onFinish={handleSubmit}
                        layout="vertical"
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Nombre Completo"
                            name="name"
                            rules={[{ required: false }]} // El nombre es opcional según DTO/schema
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Tu nombre (opcional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Correo Electrónico"
                            name="email"
                            rules={[{ required: true, message: 'Correo requerido' }, {type: 'email', message: 'Correo inválido'}]}
                        >
                             <Input
                                prefix={<MailOutlined />}
                                placeholder="tu@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="new-email" // O "off"
                             />
                        </Form.Item>

                        <Form.Item
                            label="Contraseña"
                            name="password"
                            rules={[{ required: true, message: 'Contraseña requerida' }, {min: 8, message: 'Mínimo 8 caracteres'}]}
                            hasFeedback // Muestra icono de validación
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Mínimo 8 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password" // Sugiere generar nueva contraseña
                            />
                        </Form.Item>

                         <Form.Item
                            label="Confirmar Contraseña"
                            name="confirmPassword"
                            dependencies={['password']} // Depende del campo password
                            hasFeedback
                            rules={[
                                { required: true, message: 'Confirma tu contraseña' },
                                // Validador personalizado para comparar con el campo 'password'
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve(); // Pasa si está vacío o coincide
                                        }
                                        return Promise.reject(new Error('Las contraseñas no coinciden!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Repite la contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password" // Sugiere generar nueva contraseña 
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={isLoading} block>
                                {isLoading ? 'Registrando...' : 'Registrarse'}
                            </Button>
                        </Form.Item>
                    </Form>
                 </Card>
             </Col>
        </Row>
  );
};

export default RegisterPage;