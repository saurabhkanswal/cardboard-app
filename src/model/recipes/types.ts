/**
 * Recipe data-transfer objects — what a recipe asks the user for, as a backend would send it.
 * Domain shaping happens in the ViewModel layer.
 */

export interface RecipeFieldDTO {
  /** Key in the project's `recipe/inputs.json`. */
  id: string;
  label: string;
  placeholder: string;
  optional: boolean;
  maxLength: number;
}

export interface RecipeDTO {
  /** Bridge kit id. */
  id: string;
  name: string;
  /** Heading over the video picker. */
  mediaPrompt: string;
  mediaHint: string;
  fields: RecipeFieldDTO[];
}
