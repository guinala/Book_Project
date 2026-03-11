import axios, { AxiosError } from "axios";
import i18n from "../plugins/i18n/i18n";

export function getErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) return "";

  const axiosError = err as AxiosError;
  if (axiosError.response) {
    return i18n.t("errors.httpError", {
      status: axiosError.response.status,
      statusText: axiosError.response.statusText,
    });
  } else if (axiosError.request) {
    return i18n.t("errors.connectionFailed");
  }
  return i18n.t("errors.unexpectedError");
}
