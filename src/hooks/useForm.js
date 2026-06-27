import { useState, useCallback } from 'react';

export function useForm(initialValues, validationFn) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [touched]);

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      if (validationFn) {
        const result = validationFn(values);
        if (!result.valid) {
          setErrors((prev) => ({ ...prev, [name]: result.message }));
        }
      }
    },
    [values, validationFn]
  );

  const validate = useCallback(() => {
    if (!validationFn) return true;
    const result = validationFn(values);
    if (!result.valid) {
      setErrors({ form: result.message });
      return false;
    }
    return true;
  }, [values, validationFn]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, handleChange, handleBlur, validate, reset, setErrors, setValues };
}
