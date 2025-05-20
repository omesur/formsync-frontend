import React, { ChangeEvent } from 'react';
import { Input, InputNumber, Select, Checkbox, Radio, DatePicker, Space } from 'antd';
import { FormFieldDefinition, FormFieldOption } from '../common/interfaces/form-field.interfaces';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

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
            <input
                type="file"
                id={id || `field-${field.id}`}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (onFileChange) {
                        const file = e.target.files?.[0] || null;
                        onFileChange(field.name, file);
                    }
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
                    {field.options?.map((opt: FormFieldOption) => ( <Option key={opt.value} value={opt.value}>{opt.label}</Option> ))}
                </Select>
            );
            break;
        case 'radio':
            inputElement = (
                <Radio.Group value={value} onChange={onChange} id={id}>
                    <Space direction="vertical">
                        {field.options?.map((opt: FormFieldOption) => ( <Radio key={opt.value} value={opt.value}>{opt.label}</Radio> ))}
                    </Space>
                </Radio.Group>
            );
            break;
        case 'checkbox':
            inputElement = <Checkbox checked={value} onChange={onChange as (e: CheckboxChangeEvent) => void} id={id}>{field.placeholder}</Checkbox>;
            break;
        case 'number':
            inputElement = <InputNumber placeholder={field.placeholder} style={{ width: '100%' }} value={value} onChange={onChange} id={id} min={field.validations?.min} max={field.validations?.max} />;
            break;
        case 'date':
            // DatePicker value es un objeto Dayjs, onChange recibe (date: Dayjs | null, dateString: string)
            // AntD Form.Item pasará el objeto Dayjs como 'value' y espera que 'onChange' reciba el objeto Dayjs
            inputElement = <DatePicker
            style={{ width: '100%' }}
            placeholder={field.placeholder || 'Seleccionar fecha'}
            value={value}
            onChange={onChange}
            id={id}
            format="YYYY-MM-DD"/>;            
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