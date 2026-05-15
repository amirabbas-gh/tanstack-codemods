export default async function proxy(request: Request) {
  const notFoundUrl = new URL(request.url);
  notFoundUrl.pathname = "/404";
  return Response.redirect(notFoundUrl.toString(), 307);
}
