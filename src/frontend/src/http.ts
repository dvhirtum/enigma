import type { ApiResult, Problem } from './api';
import type { Route } from './routes';

function isProblem(value: unknown): value is Problem {
  return typeof value === 'object' && value !== null && typeof (value as Problem).title === 'string';
}

async function readProblem(response: Response): Promise<Problem> {
  const body: unknown = await response.json().catch(() => null);
  if (isProblem(body)) {
    return { status: response.status, title: body.title, detail: body.detail };
  }
  return { status: response.status, title: `The backend returned status ${response.status}.` };
}

export async function send<T>(baseUrl: string, route: Route): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: route.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: route.body === undefined ? undefined : JSON.stringify(route.body),
    });
  } catch (error) {
    return { ok: false, problem: { status: 0, title: 'The backend is unreachable.', detail: String(error) } };
  }

  if (!response.ok) {
    return { ok: false, problem: await readProblem(response) };
  }
  if (response.status === 204) {
    return { ok: true, value: null as T };
  }
  return { ok: true, value: (await response.json()) as T };
}
