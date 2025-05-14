// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react'; // Asegúrate que useEffect esté importado
import { toast } from 'react-toastify';
import apiClient from '../services/apiService';
import { Role } from '../common/enums/role.enum'; 
// Descomenta estas líneas si decides implementar la redirección/logout automático en caso de error 401
// import { useNavigate } from 'react-router-dom';
// import { removeToken } from '../services/tokenService';

interface UserProfile {
  id: number;
  email: string;
  name?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

const DashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Inicia como true
  // Descomenta si implementas redirección
  // const navigate = useNavigate();

  // Define la función para buscar el perfil
  const fetchProfile = async () => {
    // No es necesario poner setLoading(true) aquí si ya inicia en true
    // y solo se llama una vez al montar.
    try {
      const response = await apiClient.get<UserProfile>('/auth/profile');
      setProfile(response.data); // Guarda el perfil si la petición es exitosa
    } catch (err: any) {
      console.error("Error al obtener el perfil:", err);
      let errorMessage = 'No se pudo cargar la información del perfil.';
      if (err.response && err.response.status === 401) {
          errorMessage = "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.";
          // --- Opcional: Desloguear y redirigir ---
          // removeToken();
          // navigate('/login');
          // ---------------------------------------
      }
      toast.error(errorMessage);
      setProfile(null); // Asegúrate de limpiar el perfil en caso de error
    } finally {
      // Este bloque se ejecuta siempre, tanto en éxito como en error
      setLoading(false); // Indica que la carga ha terminado
    }
  };

  // *** ¡AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL! ***
  // Usamos useEffect para llamar a fetchProfile solo una vez
  // cuando el componente se monta por primera vez.
  useEffect(() => {
    fetchProfile();
  }, []); // El array de dependencias vacío [] asegura que se ejecute solo al montar

  // Mientras está cargando, muestra un mensaje
  if (loading) {
      return <p>Cargando dashboard...</p>;
  }

  // Si ya no está cargando, muestra el perfil o un mensaje de error/fallback
  return (
      <div>
          <h2>Dashboard (Ruta Protegida)</h2>
          {profile ? ( // Si tenemos datos del perfil, muéstralos
              <div>
                  <p>¡Bienvenido, {profile.name || profile.email}!</p>
                  <p>ID: {profile.id}</p>
                  <p>Email: {profile.email}</p>
                  <p>Registrado en: {new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
          ) : ( // Si no hay perfil (posiblemente debido a un error que ya mostró el toast)
              <p>No se pudo cargar la información del usuario. Intenta recargar o inicia sesión de nuevo.</p>
          )}
      </div>
  );
}

export default DashboardPage;