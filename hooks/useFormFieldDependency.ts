import { useEffect } from "react";
import { UseFormWatch, UseFormSetValue, FieldValues, Path } from "react-hook-form";

interface FieldDependency<T extends FieldValues> {
  field: Path<T>;
  dependsOn: Path<T>;
  condition: (value: any) => boolean;
  action: (setValue: UseFormSetValue<T>, value: any) => void;
  resetValue?: any;
}

export function useFormFieldDependency<T extends FieldValues>(
  watch: UseFormWatch<T>,
  setValue: UseFormSetValue<T>,
  dependencies: FieldDependency<T>[]
) {
  useEffect(() => {
    dependencies.forEach(({ field, dependsOn, condition, action, resetValue }) => {
      const watchedValue = watch(dependsOn);
      const currentValue = watch(field);

      if (condition(watchedValue)) {
        action(setValue, watchedValue);
      } else if (resetValue !== undefined) {
        setValue(field, resetValue as any, { shouldValidate: false });
      }
    });
  }, [watch, setValue, dependencies]);
}

// Helper function for common dependency patterns
export function createFieldDependency<T extends FieldValues>(
  field: Path<T>,
  dependsOn: Path<T>,
  condition: (value: any) => boolean,
  action: (setValue: UseFormSetValue<T>, value: any) => void,
  resetValue?: any
): FieldDependency<T> {
  return {
    field,
    dependsOn,
    condition,
    action,
    resetValue,
  };
}

