// lib/mmConcepts.ts
export const MM_CONCEPT_LABELS = [
  "reflect_y_axis",
  "reflect_x_axis",
  "dilate_vertical_k",
  "dilate_horizontal_k",
  "translate_vertical",
  "translate_horizontal",
  "order_of_transform",
  "state_from_equation",
  "state_from_graph",
] as const;

export type MMConceptCode = (typeof MM_CONCEPT_LABELS)[number];
