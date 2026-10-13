import { db, authResponses } from '../fakes.js';

const fakeAuthClient = () => new Proxy({}, {
  get: (_t, group) => (group === 'auth'
    ? new Proxy({}, {
      get: (_x, fn) => async (...args) => (typeof authResponses[fn] === 'function'
        ? authResponses[fn](...args)
        : authResponses[fn] ?? { data: {}, error: null }),
    })
    : undefined),
});

const adminAuth = {
  getUser: async () => ({ data: { user: null }, error: { message: 'bad' } }),
  admin: { updateUserById: async () => ({ error: null }), deleteUser: async () => ({ error: null }) },
};

export const admin = {
  from: db.from,
  auth: adminAuth,
  storage: {
    from: () => ({
      createSignedUrls: async () => ({ data: [], error: null }),
      remove: async () => ({ error: null }),
      upload: async () => ({ error: null }),
    }),
  },
};
export const authClient = fakeAuthClient;
