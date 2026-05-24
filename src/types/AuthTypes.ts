export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
  surname: string;
  birthDate: string;
  acceptedTerms: boolean;
}

export type AuthScreen = "loading" | "login" | "register" | "user";