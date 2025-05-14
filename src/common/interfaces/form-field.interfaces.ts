// Definir los tipos de campo permitidos
export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'file' | 'textarea' | 'email' | 'password'; 

export interface FormFieldOption {
    value: string | number;
    label: string;
}

export interface FormFieldValidations {
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex
    min?: number; // Para tipo number/date
    max?: number; // Para tipo number/date
    allowedMimeTypes?: string[]; // Para tipo file
}

export interface FormFieldDefinition {
    id: string; // UUID o similar generado en frontend
    order: number;
    name: string; // Debe ser único en el formulario
    label: string;
    type: FormFieldType;
    required: boolean;
    placeholder?: string;
    options?: FormFieldOption[]; // Solo para 'select', 'radio'
    validations?: FormFieldValidations;
    defaultValue?: any; // Valor por defecto opcional
}

export interface FileUploadState {
    file?: File;        // Objeto File original (mientras sube o si falla)
    status: 'selected' | 'uploading' | 'uploaded' | 'error'; // Estados posibles
    storageKey?: string;// Clave devuelta por el backend (ruta local relativa)
    filename?: string;  // Nombre original
    mimeType?: string;  // Tipo MIME
    size?: number;      // Tamaño
    error?: string;     // Mensaje de error si falla
    progress?: number;  // Progreso 0-100
}