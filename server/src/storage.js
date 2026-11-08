const workerUrl = process.env.R2_PROXY_URL;
const workerToken = process.env.R2_PROXY_TOKEN;

if (Boolean(workerUrl) !== Boolean(workerToken)) {
  throw new Error('Configure both R2_PROXY_URL and R2_PROXY_TOKEN');
}
if (process.env.NODE_ENV === 'production' && !workerUrl) {
  throw new Error('Configure the R2 photo-storage Worker before running the API in production');
}

export const photoStorage = workerUrl
  ? { url: workerUrl.replace(/\/+$/, ''), token: workerToken }
  : null;
