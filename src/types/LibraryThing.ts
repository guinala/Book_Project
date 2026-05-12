export type LTLanguageCode = 'spa' | 'eng' | string;

export type LTFactVersion = {
  language: LTLanguageCode;
  facts: string[];
};

export type LTField = {
  name: string;          // "description", "summary", "characters", ...
  versions: LTFactVersion[];
};

export type LTWorkCK = {
  fields: LTField[];
};