export type LTLanguageCode = 'spa' | 'eng' | string;

export type LTFactVersion = {
  language: LTLanguageCode;
  facts: string[];
};

export type LTField = {
  name: string;      
  versions: LTFactVersion[];
};

export type LTWorkCK = {
  fields: LTField[];
};