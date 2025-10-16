export function createResponse<T>(
  success: boolean,
  message: string,
  data: T | null = null,
  error: any = null,
  meta: object | null = null
): ApiResponse<T> {
    function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
  return {
    success,
    message,
    data,
    error:getErrorMessage(error),
    meta,
  };
}