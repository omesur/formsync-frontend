// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'; 
import { ConfigProvider, Layout, Menu, theme, Button, message, Typography } from 'antd'; 
import {
  HomeOutlined,
  LoginOutlined,
  UserAddOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  FileProtectOutlined,
  FormOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { ToastContainer } from 'react-toastify'; // <--- Importar ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // <--- Importar el CSS
import 'antd/dist/reset.css';
import { Role } from './common/enums/role.enum'; 
import apiClient from './services/apiService';

import './App.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FormTemplatesPage from './pages/FormTemplatesPage'; 
import FormTemplateEditorPage from './pages/FormTemplateEditorPage';
import FillableFormsPage from './pages/FillableFormsPage'; 
import FormFillingPage from './pages/FormFillingPage';   
import MyInstancesPage from './pages/MyInstancesPage';
import InstanceDetailPage from './pages/InstanceDetailPage';
import { getAccessToken, removeAccessToken, removeTokens} from './services/tokenService';

// Estilos básicos (puedes moverlos a App.css si prefieres)
const headerStyle: React.CSSProperties = {
  position: 'sticky', // Hacer el header pegajoso (opcional)
  top: 0,
  zIndex: 10, // Asegurar que esté sobre el contenido
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  paddingInline: 48,
};

const logoStyle: React.CSSProperties = {
  color: 'white', 
  fontSize: '1.6rem', // Un poco más grande
  marginRight: 'auto',
  display: 'flex', // Para alinear icono y texto
  alignItems: 'center',
  padding: '0 48px', // Padding horizontal
  marginTop: '24px', // Espacio debajo del header
};

const innerContentStyle: React.CSSProperties = {
  padding: 24,
  minHeight: 'calc(100vh - 64px - 48px - 24px)', // Ajustar altura restando header, padding y margen
  background: '', // Se establecerá con el token del tema
  borderRadius: 0, // Se establecerá con el token del tema
};

interface UserData { // <- Nueva interfaz para datos de usuario
  id: number;
  email: string;
  name?: string;
  role: Role;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken());
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const location = useLocation(); 
  const { token: themeTokens } = theme.useToken(); // Obtener tokens del tema

  innerContentStyle.background = themeTokens.colorBgContainer;
  innerContentStyle.borderRadius = themeTokens.borderRadiusLG;
  logoStyle.color = themeTokens.colorTextHeading; // Ajustar color logo si el tema cambia

  // Función para obtener datos del usuario (incluyendo rol)
  const fetchUserData = useCallback(async () => {
    const token = getAccessToken();
    if (token) {
      setIsLoadingUser(true);
      try {
        const response = await apiClient.get<UserData>('/auth/profile');
        setUser(response.data);
        setIsAuthenticated(true); // Asegurar que está autenticado
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Si falla (ej: token inválido), desloguear
        removeAccessToken();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
         setIsLoadingUser(false);
      }
    } else {
       // Si no hay token, asegurar estado limpio
       setUser(null);
       setIsAuthenticated(false);
       setIsLoadingUser(false);
    }
  }, []); // useCallback con array vacío

  // Obtener datos del usuario al cargar la app o al cambiar isAuthenticated
  useEffect(() => {
    setIsLoadingUser(true); // Inicia carga
    fetchUserData();
 }, [fetchUserData]); // Depende de fetchUserData

  // Función para actualizar el estado cuando el usuario hace login/logout
  const handleAuthChange = (authStatus: boolean) => {
    setIsAuthenticated(authStatus);
    if (authStatus) {
       fetchUserData(); // Cargar datos del usuario al hacer login
    } else {
       setUser(null); // Limpiar datos al hacer logout
    }
  };

  const handleLogout = async () => { // Convertir a async
    try {
        const token = getAccessToken(); // Necesitamos el access token para llamar a logout
        if (token) {
            // Llama al backend para invalidar el refresh token en el servidor
            await apiClient.post('/auth/logout', {}, { // Añadir body vacío si es necesario
                 headers: { Authorization: `Bearer ${token}` } // Asegurar el token para esta petición
            });
        }
    } catch (error) {
        console.error("Error durante el logout en backend:", error);
        // Continuar con el logout local incluso si el backend falla
        message.error('Error al cerrar sesión en el servidor.');  
    } finally {
         // Siempre limpiar tokens locales y estado
         removeTokens(); // Usar la nueva función que borra ambos
         handleAuthChange(false); // Actualizar estado local
         message.success('Sesión cerrada exitosamente.'); // Mensaje de éxito
    }
};

  // Hooks de React Router
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken(); // Hook para obtener tokens del tema  


// --- Definición dinámica de items del menú ---
const getMenuItems = () => {
  const items = [];

  items.push({
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Inicio</Link>,
  });

  if (isAuthenticated) {
      items.push({
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: <Link to="/dashboard">Dashboard</Link>,
      });
      items.push({
          key: '/fillable-forms',
          icon: <FileTextOutlined />,
          label: <Link to="/fillable-forms">Diligenciar Formulario</Link>,
      });
      items.push({
          key: '/my-instances',
          icon: <FileProtectOutlined />, // Icono diferente para distinguir
          label: <Link to="/my-instances">Mis Formularios</Link>,
      });

      // Menú solo para DocBuilder/Admin
      if (user?.role === Role.DocBuilder || user?.role === Role.Admin) {
           items.push({
               key: '/templates',
               icon: <SettingOutlined />,
               label: <Link to="/templates">Plantillas</Link>,
           });
      }

      // Opción de Logout podría ir en el menú o como botón separado
      // items.push({
      //     key: '/logout',
      //     icon: <LogoutOutlined />,
      //     label: 'Logout',
      //     onClick: handleLogout, // Asociar acción directamente
      //     danger: true, // Estilo de peligro
      // });

  } else {
      // Menú para usuarios no autenticados
      items.push({
          key: '/login',
          icon: <LoginOutlined />,
          label: <Link to="/login">Login</Link>,
      });
      items.push({
          key: '/register',
          icon: <UserAddOutlined />,
          label: <Link to="/register">Registro</Link>,
      });
  }

  return items;
};

  // Verificar el token al cargar la app
  useEffect(() => {
    setIsAuthenticated(!!getAccessToken());
  }, []);


  if (isLoadingUser) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando sesión...</div>;
 }

  return (
    <ConfigProvider /* theme={customTheme} */ >
                <Layout style={{ minHeight: '100vh' }}>
                    {/* --- Header --- */}
                    <Layout.Header style={headerStyle}>
                        {/* Logo o Título */}
                        <Typography.Title level={2} style={{...logoStyle, color:'white', marginBlockEnd: 0 }}>
                             <FormOutlined style={{ marginRight: '10px', verticalAlign: 'middle' }} /> {/* Icono añadido */}
                             FormSync
                        </Typography.Title>

                        {/* Menú de Navegación */}
                        <Menu
                            theme="dark" // O "light" según el fondo del header
                            mode="horizontal" // Menú horizontal
                            items={getMenuItems()} // Items generados dinámicamente
                            selectedKeys={[location.pathname]} // Resaltar item activo según ruta actual
                            style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }} // Empujar items a la derecha
                            overflowedIndicator={<SettingOutlined />} // Icono para menú colapsado (móvil/estrecho)
                        />

                         {/* Botón de Logout (alternativa a ponerlo en el menú) */}
                         {isAuthenticated && (
                              <Button
                                   type="primary"
                                   danger
                                   icon={<LogoutOutlined />}
                                   onClick={handleLogout}
                                   style={{ marginLeft: '16px' }} // Espacio respecto al menú
                               >
                                   Logout
                               </Button>
                          )}
                    </Layout.Header>

                    {/* --- Contenido Principal --- */}
                    <Layout.Content style={{ padding: '24px 48px' }}> {/* Añadir padding */}
                        {/* Fondo y borde redondeado para el área de contenido */}
                        <div style={{ background: colorBgContainer, minHeight: 'calc(100vh - 64px - 48px)', padding: 24, borderRadius: borderRadiusLG }}>
                            <Routes>
                                {/* --- Tus Rutas como antes --- */}
                                <Route path="/login" element={!isAuthenticated ? <LoginPage onLoginSuccess={() => handleAuthChange(true)} /> : <Navigate to="/dashboard" />} />
                                <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
                                <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
                                <Route path="/fillable-forms" element={isAuthenticated ? <FillableFormsPage /> : <Navigate to="/login" />} />
                                <Route path="/fill/:templateId" element={isAuthenticated ? <FormFillingPage /> : <Navigate to="/login" />} />
                                <Route path="/my-instances" element={isAuthenticated ? <MyInstancesPage /> : <Navigate to="/login" />} />
                                <Route path="/instance/:instanceId/view" element={isAuthenticated ? <InstanceDetailPage /> : <Navigate to="/login" />} />
                                <Route path="/instance/:instanceId/edit" element={isAuthenticated ? <FormFillingPage /> : <Navigate to="/login" />} />
                                <Route path="/templates" element={ isAuthenticated && (user?.role === Role.DocBuilder || user?.role === Role.Admin) ? <FormTemplatesPage userRole={user?.role} /> : <Navigate to={isAuthenticated ? "/dashboard" : "/login"} /> } />
                                <Route path="/templates/:templateId/edit" element={ isAuthenticated && (user?.role === Role.DocBuilder || user?.role === Role.Admin) ? <FormTemplateEditorPage /> : <Navigate to={isAuthenticated ? "/templates" : "/login"} /> } />
                                <Route path="/" element={isAuthenticated ? <DashboardPage /> : <LoginPage onLoginSuccess={() => handleAuthChange(true)} />} /> {/* Ruta raíz */}
                                <Route path="*" element={<Navigate to="/" />} /> {/* Ruta comodín */}
                            </Routes>
                        </div>
                    </Layout.Content>

                     {/* --- Footer Opcional --- */}
                     {/* <Layout.Footer style={{ textAlign: 'center' }}>
                         FormSync ©{new Date().getFullYear()} Creado con Ant Design
                     </Layout.Footer> */}
                </Layout>
                 {/* ToastContainer fuera del Layout principal si causa problemas de z-index */}
                 <ToastContainer position="top-right" autoClose={5000} /* ...otras props... */ theme="light" />
        </ConfigProvider>
  );
}

export default App; 