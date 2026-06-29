const { algoliasearch } = require('algoliasearch');

let client = null;
let indexName = '';

const getClient = () => {
  if (client) return client;

  const appId = process.env.ALGOLIA_APP_ID;
  const writeKey = process.env.ALGOLIA_WRITE_KEY || process.env.ALGOLIA_API_KEY;
  indexName = process.env.ALGOLIA_INDEX_NAME || 'CRM';

  if (!appId || !writeKey) {
    console.warn('[Algolia] Not configured — skipping indexing');
    return null;
  }

  client = algoliasearch(appId, writeKey);
  console.log(`[Algolia] Client initialized (app: ${appId}, index: ${indexName})`);
  return client;
};

const sanitizeUser = (user) => ({
  objectID: user.id,
  employee_id: user.employee_id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  status: user.accountStatus || user.status || 'active',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const saveUser = async (user) => {
  const c = getClient();
  if (!c) return;
  const obj = sanitizeUser(user);
  console.log(`[Algolia] Indexing user ${user.employee_id || user.id}...`);
  try {
    const res = await c.saveObject({ indexName, body: obj });
    console.log(`[Algolia] Indexed ${user.employee_id || user.id} (taskID: ${res.taskID})`);
  } catch (err) {
    console.error(`[Algolia] FAILED to index user ${user.employee_id || user.id}:`, err.message);
    console.error('[Algolia] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    throw err;
  }
};

const deleteUser = async (userId) => {
  const c = getClient();
  if (!c) return;
  console.log(`[Algolia] Deleting object ${userId}...`);
  try {
    await c.deleteObject({ indexName, objectID: userId });
    console.log(`[Algolia] Deleted ${userId}`);
  } catch (err) {
    console.error(`[Algolia] FAILED to delete ${userId}:`, err.message);
    console.error('[Algolia] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
};

const searchUsers = async (query, filters = {}, page = 1, hitsPerPage = 20) => {
  const c = getClient();
  if (!c) return null;

  const filterParts = [];
  if (filters.role) filterParts.push(`role:${filters.role}`);
  if (filters.status) filterParts.push(`status:${filters.status}`);

  const searchParams = {
    query: query || '',
    page: page - 1,
    hitsPerPage,
  };
  if (filterParts.length > 0) searchParams.filters = filterParts.join(' AND ');

  console.log(`[Algolia] Searching: "${query}" filters=${filterParts.join(',')} page=${page}`);
  try {
    const res = await c.searchSingleIndex({ indexName, searchParams });
    console.log(`[Algolia] Search returned ${res.nbHits} hits`);
    return res;
  } catch (err) {
    console.error('[Algolia] Search error:', err.message);
    console.error('[Algolia] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return null;
  }
};

const indexAllUsers = async (users) => {
  const c = getClient();
  if (!c) return;
  const objects = users.map(sanitizeUser);
  if (objects.length === 0) {
    console.log('[Algolia] No users to index');
    return;
  }
  console.log(`[Algolia] Bulk indexing ${objects.length} users...`);
  try {
    const res = await c.saveObjects({ indexName, objects });
    console.log(`[Algolia] Bulk indexed ${objects.length} users (taskID: ${res.taskID})`);
  } catch (err) {
    console.error('[Algolia] Bulk index FAILED:', err.message);
    console.error('[Algolia] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    throw err;
  }
};

const testConnection = async () => {
  const c = getClient();
  if (!c) return false;
  try {
    await c.searchSingleIndex({ indexName, searchParams: { query: '', hitsPerPage: 1 } });
    console.log(`[Algolia] Connection OK — index "${indexName}" is reachable`);
    return true;
  } catch (err) {
    console.warn(`[Algolia] Connection test FAILED:`, err.message);
    return false;
  }
};

module.exports = { saveUser, deleteUser, searchUsers, indexAllUsers, testConnection };
