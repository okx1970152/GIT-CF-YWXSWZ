type GitHubContentResponse = {
  sha?: string;
  message?: string;
};

/** PUT /repos/{owner}/{repo}/contents/{path} — updates file; requires SHA when file exists. */
export async function commitAdsJsonToGithub(params: {
  token: string;
  repo: string;
  branch: string;
  path: string;
  contentJson: string;
  message: string;
}): Promise<void> {
  const { token, repo, branch, path, contentJson, message } = params;
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const base = `https://api.github.com/repos/${repo}/contents/${encodedPath}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const getRes = await fetch(`${base}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, Accept: "application/vnd.github+json" }
  });

  let sha: string | undefined;
  if (getRes.ok) {
    const existing = (await getRes.json()) as GitHubContentResponse & { sha?: string };
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    const text = await getRes.text();
    throw new Error(`GitHub GET failed: ${getRes.status} ${text}`);
  }

  const body: Record<string, string> = {
    message,
    content: Buffer.from(contentJson, "utf8").toString("base64"),
    branch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(base, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`GitHub PUT failed: ${putRes.status} ${text}`);
  }
}
