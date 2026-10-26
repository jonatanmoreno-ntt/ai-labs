type ResponseDetailKey = 'message' | 'detail';

function getProperty(value: unknown, property: string): unknown {
  if (typeof value !== 'object' || value === null || !(property in value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[property];
}

export function getRequestErrorMessage(
  error: unknown,
  responseDetailKey: ResponseDetailKey,
  fallbackMessage: string
): string {
  const response = getProperty(error, 'response');
  const responseData = getProperty(response, 'data');
  const responseDetail = getProperty(responseData, responseDetailKey);
  if (typeof responseDetail === 'string' && responseDetail.length > 0) {
    return responseDetail;
  }

  const errorMessage = getProperty(error, 'message');
  return typeof errorMessage === 'string' && errorMessage.length > 0
    ? errorMessage
    : fallbackMessage;
}
