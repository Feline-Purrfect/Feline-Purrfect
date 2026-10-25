import { db, authResponses, storageCalls } from '../fakes.js';

const fakeAuthClient = () => new Proxy({}, {
  get: (_t, group) => (group === 'auth'
    ? new Proxy({}, {
      get: (_x, fn) => async (...args) => (typeof authResponses[fn] === 'function'
        ? authResponses[fn](...args)
        : authResponses[fn] ?? { data: {}, error: null }),
    })
    : undefined),
});

// Tests can override admin calls through authResponses.adminGetUser / adminUpdateUserById / adminSignOut.
const adminAuth = {
  getUser: async (...args) => (typeof authResponses.adminGetUser === 'function'
    ? authResponses.adminGetUser(...args)
    : authResponses.adminGetUser ?? { data: { user: null }, error: { message: 'bad' } }),
  admin: {
    updateUserById: async (...args) => (typeof authResponses.adminUpdateUserById === 'function'
      ? authResponses.adminUpdateUserById(...args)
      : authResponses.adminUpdateUserById ?? { error: null }),
    deleteUser: async () => ({ error: null }),
    signOut: async (...args) => (typeof authResponses.adminSignOut === 'function'
      ? authResponses.adminSignOut(...args)
      : { error: null }),
  },
};

export const admin = {
  from: db.from,
  rpc: db.rpc,
  auth: adminAuth,
  storage: {
    from: () => ({
      createSignedUrls: async (paths) => ({ data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })), error: null }),
      remove: async (paths) => { storageCalls.removed.push(...paths); return { error: null }; },
      upload: async (path) => { storageCalls.uploaded.push(path); return { error: null }; },
    }),
  },
};
export const authClient = fakeAuthClient;
