import { AdminUser } from '../types';

/**
 * Fixed hardcoded demo admin credentials directly in application source code.
 * Never stored or retrieved through localStorage.
 */
export const DEMO_ADMIN = {
  email: 'admin@larielextravaganza.com',
  password: 'admin123',
};

export const DEMO_ADMIN_ALT_EMAIL = 'admin@larielessentials.com';

export const DEMO_ADMIN_USER: AdminUser = {
  id: 'admin-1',
  name: 'Laide',
  email: 'admin@larielextravaganza.com',
  role: 'Super Admin',
  avatar: '/src/assets/images/laide_founder_portrait_1789650582034.jpg',
};
