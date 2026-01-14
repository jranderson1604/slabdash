import fetch from "node-fetch";

const PSA_BASE = "https://api.psacard.com/publicapi";

export async function psaGet(apiKey, path) {
  const res = await fetch(`${PSA_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export const getSubmissionProgress = (key, submission) =>
  psaGet(key, `/order/GetSubmissionProgress/${submission}`);

export const getCertByNumber = (key, cert) =>
  psaGet(key, `/cert/GetByCertNumber/${cert}`);
