import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo } from "react";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  regions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      selected: z.boolean(),
      children: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          selected: z.boolean(),
        }),
      ),
    }),
  ),
});

export type InterventionAreaFormData = z.infer<typeof schema>;
export type Deparment = {
  id: string;
  code: string;
  label: string;
};
export type Region = {
  id: string;
  label: string;
  departments: Deparment[];
};

export const useInterventionAreaFormLogic = ({
  entityDepartments,
  regions,
}: {
  entityDepartments: Deparment[];
  regions: Region[];
}) => {
  const regionItems: InterventionAreaFormData["regions"] = useMemo(
    () =>
      regions.map((r) => {
        const departmentItems = r.departments.map((d) => ({
          id: d.id,
          label: `${d.label} (${d.code})`,
          selected: !!entityDepartments.find((cad) => cad.id === d.id),
        }));
        return {
          id: r.id,
          label: r.label,
          selected: departmentItems.every((d) => d.selected),
          children: departmentItems,
        };
      }),
    [regions, entityDepartments],
  );

  const methods = useForm<InterventionAreaFormData>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      regions: regionItems,
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting, isDirty },
  } = methods;

  const regionsAndDeparmController = useController({
    name: "regions",
    control,
  });

  const toggleRegionOrDepartment = (regionOrdepartmentId: string) => {
    const type = regions.find((r) => r.id === regionOrdepartmentId)
      ? "region"
      : "department";

    if (type === "region") {
      toggleRegion(regionOrdepartmentId);
    } else {
      toggleDepartment(regionOrdepartmentId);
    }
  };

  const toggleRegion = (regionId: string) => {
    const newValues = regionsAndDeparmController.field.value.map((r) => {
      return { ...r, children: r.children.map((d) => ({ ...d })) };
    });
    const regionIndex = newValues.findIndex((r) => r.id === regionId);
    const region = newValues[regionIndex];
    region.selected = !region.selected;
    for (const dep of region.children) {
      dep.selected = region.selected;
    }
    setValue("regions", newValues, { shouldDirty: true });
  };

  const toggleDepartment = (departmentId: string) => {
    const newValues = regionsAndDeparmController.field.value.map((r) => {
      return { ...r, children: r.children.map((d) => ({ ...d })) };
    });
    const regionIndex = newValues.findIndex(
      (r) => !!r.children.find((d) => d.id === departmentId),
    );
    const department = newValues[regionIndex].children.find(
      (d) => d.id === departmentId,
    );

    if (department) {
      department.selected = !department.selected;
    }
    const region = newValues[regionIndex];
    region.selected = region.children.every((d) => d.selected);
    setValue("regions", newValues, { shouldDirty: true });
  };

  const toggleAllRegionsAndDepartments = (selected: boolean) => {
    const newValues = regionsAndDeparmController.field.value.map((r) => {
      return { ...r, children: r.children.map((d) => ({ ...d })) };
    });
    for (const v of newValues) {
      v.selected = selected;
      for (const dv of v.children) {
        dv.selected = selected;
      }
    }
    setValue("regions", newValues, { shouldDirty: true });
  };

  return {
    regionsAndDeparmController,
    handleSubmit,
    toggleRegionOrDepartment,
    toggleAllRegionsAndDepartments,
    reset,
    isSubmitting,
    isDirty,
  };
};
