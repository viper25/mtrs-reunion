import { handleApi } from '../_lib/api';
import type { Env } from '../_lib/types';

export const onRequest: PagesFunction<Env> = ({ request, env }) => handleApi(request, env);
