export async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const body = await response.text();
    throw new Error(
      body.startsWith('<!DOCTYPE') || body.startsWith('<html')
        ? 'The server returned an HTML error page instead of JSON.'
        : 'Unexpected response received from server.'
    );
  }

  return response.json();
}
