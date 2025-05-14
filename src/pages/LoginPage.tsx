// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../services/apiService';
import { saveAccessToken, saveRefreshToken } from '../services/tokenService';  // Para guardar el token
import { Form, Input, Button, Typography, Row, Col } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

interface LoginPageProps {
   onLoginSuccess: () => void; // Función para notificar al App.tsx
}

// Valores esperados por Form onFinish
interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean; // Opcional
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Para leer query params 

  // Mostrar mensaje si viene de registro exitoso
  const showSuccessMessage = new URLSearchParams(location.search).get('registered') === 'true';


  const handleAntdSubmit = async (values: LoginFormValues) => {
    setIsLoading(true); 

    try {
        // Esperamos que el backend devuelva { accessToken: '...', refreshToken: '...' }
        const response = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/login', {
          email: values.email,
          password: values.password
      });
        saveAccessToken(response.data.accessToken);   // <-- Guardar Access Token
        saveRefreshToken(response.data.refreshToken); // <-- Guardar Refresh Token
        onLoginSuccess();
        navigate('/dashboard');
    } catch (err: any) {
        console.error("Error en el login:", err);
        let errorMessage = 'Error al iniciar sesión. Inténtalo de nuevo.'; // Mensaje por defecto

        if (err.response) {
            if (err.response.status === 401) {
                errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
            } else if (err.response.data && err.response.data.message) {
                // Usar mensaje del backend si está disponible y no es 401
                const backendMessage = Array.isArray(err.response.data.message)
                                    ? err.response.data.message.join(', ')
                                    : err.response.data.message;
                errorMessage = `Error: ${backendMessage}`;
            }
        }
        toast.error(errorMessage); 
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Row justify="center" align="middle" style={{ minHeight: 'calc(100vh - 64px - 48px - 48px)' }}>
      <Col xs={22} sm={16} md={12} lg={8} xl={6}> {/* Columnas responsivas */}
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
            Iniciar Sesión
        </Typography.Title>

        {/* Mensaje de registro exitoso */}
        {showSuccessMessage && <p style={{color: 'green', textAlign: 'center', marginBottom: '1rem'}}>¡Registro exitoso! Por favor, inicia sesión.</p>}

        {/* Formulario Ant Design */}
        <Form
          name="login"
          initialValues={{ remember: true }} // Valor inicial para 'remember me'
          onFinish={handleAntdSubmit} // Manejador de envío exitoso
          // onFinishFailed={onFinishFailed} // Podrías añadir manejo de errores de validación aquí
          layout="vertical" // Etiquetas encima de los inputs
        >
          {/* Campo Email */}
          <Form.Item
            name="email" // Clave para el objeto 'values' en onFinish
            label="Correo Electrónico"
            rules={[ // Reglas de validación de AntD
              { required: true, message: '¡Por favor ingresa tu correo!' },
              { type: 'email', message: '¡El formato del correo no es válido!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          {/* Campo Contraseña */}
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: '¡Por favor ingresa tu contraseña!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" size="large" />
          </Form.Item>

          {/* Opciones extra (Recordarme, Olvidé contraseña) - Opcional */}
          {/* <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Recordarme</Checkbox>
            </Form.Item>
            <a href="/forgot-password" style={{ float: 'right' }}>
              ¿Olvidaste tu contraseña?
            </a>
          </Form.Item> */}

          {/* Botón de Envío */}
          <Form.Item>
            <Button
                type="primary"
                htmlType="submit"
                loading={isLoading} // Muestra spinner si está cargando
                block // Hace que el botón ocupe todo el ancho
                size="large"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </Form.Item>

           {/* Enlace a Registro */}
           <div style={{textAlign: 'center'}}>
               ¿No tienes cuenta? <Link to="/register">¡Regístrate ahora!</Link>
           </div>

        </Form>
      </Col>
    </Row>
  );
};

export default LoginPage;