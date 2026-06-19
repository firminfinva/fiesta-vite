import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Custom lightweight CSRF protection fallback for serverFn tasks
const csrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Simple verification: block cross-origin post requests if origin header is present
    if (origin && host && !origin.includes(host)) {
      return new Response("CSRF Validation Failed", { status: 403 });
    }
  }
  return await next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));