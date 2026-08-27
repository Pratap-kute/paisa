export interface AutoCompleteItem {
  label: string;
  id: string;
}

export interface AutoCompleteField {
  id: string;
  label: string;
  help: string;
  inputType: string;
}

export interface PriceProvider {
  code: string;
  fields: AutoCompleteField[];
  label: string;
  description: string;
}
