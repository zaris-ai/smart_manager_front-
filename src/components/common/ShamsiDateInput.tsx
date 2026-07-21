import { formatDateInputValue, toSafeDate } from '@/utils/shamsi-date';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persianFa from 'react-date-object/locales/persian_fa';


export type ShamsiDateInputProps = {
  value?: string | Date | null;
  onChange: (gregorianDateKey: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
};

const toPickerValue = (value?: string | Date | null) => {
  const safeDate = toSafeDate(value);

  if (!safeDate) return null;

  return new DateObject({
    date: safeDate,
    calendar: persian,
    locale: persianFa,
  });
};

const toGregorianDateKey = (value: unknown): string => {
  if (!value) return '';

  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (!selectedValue) return '';

  if (selectedValue instanceof DateObject) {
    return formatDateInputValue(selectedValue.toDate());
  }

  if (selectedValue instanceof Date) {
    return formatDateInputValue(selectedValue);
  }

  if (typeof selectedValue === 'object' && 'toDate' in selectedValue) {
    const candidate = selectedValue as { toDate: () => Date };
    return formatDateInputValue(candidate.toDate());
  }

  return formatDateInputValue(String(selectedValue));
};

const ShamsiDateInput = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  placeholder = 'انتخاب تاریخ',
  hint,
  error,
}: ShamsiDateInputProps) => {
  const inputClasses = `input input-bordered w-full bg-white text-right dark:bg-gray-950 ${
    error ? 'input-error' : ''
  } ${inputClassName}`.trim();

  return (
    <label className={`form-control ${className}`.trim()} dir="rtl">
      {label ? (
        <span className="label label-text font-semibold">{label}</span>
      ) : null}

      <DatePicker
        value={toPickerValue(value)}
        onChange={(selectedDate) => onChange(toGregorianDateKey(selectedDate))}
        calendar={persian}
        locale={persianFa}
        calendarPosition="top-right"
        zIndex={9999}
        format="YYYY/MM/DD"
        inputClass={inputClasses}
        containerClassName="w-full relative"
        placeholder={placeholder}
        disabled={disabled}
        editable={false}
        hideOnScroll
      />

      {error || hint ? (
        <span className={`mt-1 text-xs ${error ? 'text-error' : 'text-gray-500'}`}>
          {error || hint}
        </span>
      ) : null}

      {required ? <span className="sr-only">تاریخ الزامی است</span> : null}
    </label>
  );
};

export default ShamsiDateInput;
