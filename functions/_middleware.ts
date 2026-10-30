import { authenticateAdmin } from './_lib/auth';
import { errorResponse, secureResponse, type Data, type Env } from './_lib/types';

export const onRequest: PagesFunction<Env, string, Data> = async context => {
  try {
    const path = new URL(context.request.url).pathname;
    if (path === '/admin' || path.startsWith('/admin/') || path === '/api/admin' || path.startsWith('/api/admin/')) {
      context.data.adminEmail = await authenticateAdmin(context.request, context.env);
    }
    const response = await context.next();
    return secureResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
};
