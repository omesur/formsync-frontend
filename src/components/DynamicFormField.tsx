import React, { ChangeEvent } from 'react';
import { Input, InputNumber, Select, Checkbox, Radio, DatePicker, Space } from 'antd';
import { FormFieldDefinition, FormFieldOption } from '../common/interfaces/form-field.interfaces';

const { Option } = Select;

interface DynamicFormFieldProps {
    field: FormFieldDefinition;
    onFileChange?: (fieldName: string, file: File | null) => void;
    // Props inyectadas por Form.Item
    value?: any;
    onChange?: (...args: any[]) => void;
    id?: string; // id que Form.Item pasa para el label htmlFor
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({ field, onFileChange, value, onChange, id }) => {
    if (field.type === 'file') {
        return (
            // Para el input file, el id es el que generamos
            <input
                type="file"
                id={id || `field-${field.id}`} // Usar id de Form.Item si existe, sino el nuestro
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (onFileChange) {
                        const file = e.target.files?.[0] || null;
                        onFileChange(field.name, file);
                    }
                    // Si AntD Form.Item pasa un onChange, podríamos necesitar llamarlo
                    // pero para file, es mejor manejarlo separado.
                }}
            />
        );
    }

    // Para los demás tipos, devolver el componente AntD apropiado
    let inputElement: React.ReactElement;

    switch (field.type) {
        case 'textarea':
            inputElement = <Input.TextArea rows={4} placeholder={field.placeholder} value={value} onChange={onChange} id={id} maxLength={field.validations?.maxLength} />;
            break;
        case 'select':
            inputElement = (
                <Select placeholder={field.placeholder || 'Seleccione...'} value={value} onChange={onChange} id={id} allowClear={!field.required}>
                    {field.options?.map((opt: FormFieldOption) => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                </Select>
            );
            break;
        case 'radio':
            inputElement = (
                <Radio.Group value={value} onChange={onChange} id={id}>
                    <Space direction="vertical">
                        {field.options?.map((opt: FormFieldOption) => (
                            <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
                        ))}
                    </Space>
                </Radio.Group>
            );
            break;
        case 'checkbox':
            // Para Checkbox, AntD Form.Item espera que el value sea el estado 'checked'
            // y el onChange reciba un CheckboxChangeEvent. valuePropName="checked" en Form.Item lo maneja.
            inputElement = <Checkbox checked={value} onChange={onChange} id={id}>{field.placeholder}</Checkbox>;
            break;
        case 'number':
            inputElement = <InputNumber placeholder={field.placeholder} style={{ width: '100%' }} value={value} onChange={onChange} id={id} min={field.validations?.min} max={field.validations?.max} />;
            break;
        case 'date':
            // DatePicker espera un objeto Dayjs para 'value' y devuelve Dayjs en onChange
            inputElement = <DatePicker style={{ width: '100%' }} placeholder={field.placeholder || 'Seleccionar fecha'} value={value} onChange={onChange} id={id} format="YYYY-MM-DD"/>;
            break;
        case 'password':
            inputElement = <Input.Password placeholder={field.placeholder} value={value} onChange={onChange} id={id} maxLength={field.validations?.maxLength} />;
            break;
        case 'text':
        case 'email':
        default:
            inputElement = <Input placeholder={field.placeholder} type={field.type === 'email' ? 'email' : 'text'} value={value} onChange={onChange} id={id} maxLength={field.validations?.maxLength}/>;
            break;
    }
    return inputElement;
};

export default DynamicFormField;