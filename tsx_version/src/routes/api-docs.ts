const html = '<!DOCTYPE html><html lang="ko"><meta charset="utf-8"><title>SolidStart 게시판 OpenAPI</title>' +
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui.css">' +
  '<body><p><a href="/">홈</a> · <a href="/api/docs/openapi">OpenAPI JSON</a></p><div id="swagger-ui"></div>' +
  '<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.31.0/swagger-ui-bundle.js"></script>' +
  '<script>SwaggerUIBundle({url:"/api/docs/openapi",dom_id:"#swagger-ui",validatorUrl:null});</script></body></html>';

export function GET() {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
