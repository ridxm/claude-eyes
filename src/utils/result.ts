export interface ToolSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ToolError {
  success: false;
  error: string;
  suggestion?: string;
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolError;

export function success<T>(data: T): ToolSuccess<T> {
  return { success: true, data };
}

export function error(message: string, suggestion?: string): ToolError {
  return { success: false, error: message, suggestion };
}

export function formatResult(result: ToolResult): string {
  if (result.success) {
    if (typeof result.data === 'string') {
      return result.data;
    }
    return JSON.stringify(result.data, null, 2);
  }

  let text = `Error: ${result.error}`;
  if (result.suggestion) {
    text += `\nSuggestion: ${result.suggestion}`;
  }
  return text;
}
