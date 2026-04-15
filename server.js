import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

loadEnvFile();

const port = Number(process.env.PORT || 3000);
const provider = (process.env.NEWS_PROVIDER || "newsapi").toLowerCase();
const language = process.env.NEWS_LANGUAGE || "en";
const country = process.env.NEWS_COUNTRY || "us";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/news") {
      await handleNewsRequest(url, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, {
      error: "Something went wrong while serving the request.",
      detail: error.message
    });
  }
});

server.listen(port, () => {
  console.log(`News app running at http://localhost:${port}`);
});

async function handleNewsRequest(url, response) {
  const topics = (url.searchParams.get("topics") || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!topics.length) {
    sendJson(response, 400, { error: "Add at least one topic." });
    return;
  }

  const results = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      articles: await fetchArticles(topic)
    }))
  );

  sendJson(response, 200, {
    provider,
    generatedAt: new Date().toISOString(),
    topics: results
  });
}

async function fetchArticles(topic) {
  if (provider === "gnews") {
    return fetchGNews(topic);
  }

  return fetchNewsApi(topic);
}

async function fetchNewsApi(topic) {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    throw new Error("Missing NEWSAPI_KEY in .env");
  }

  const endpoint = new URL("https://newsapi.org/v2/everything");
  endpoint.searchParams.set("q", topic);
  endpoint.searchParams.set("language", language);
  endpoint.searchParams.set("sortBy", "publishedAt");
  endpoint.searchParams.set("pageSize", "8");
  endpoint.searchParams.set("apiKey", apiKey);

  const data = await fetchJson(endpoint);

  return (data.articles || []).map((article) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    imageUrl: article.urlToImage,
    source: article.source?.name || "Unknown source",
    author: article.author,
    publishedAt: article.publishedAt
  }));
}

async function fetchGNews(topic) {
  const apiKey = process.env.GNEWS_KEY;
  if (!apiKey) {
    throw new Error("Missing GNEWS_KEY in .env");
  }

  const endpoint = new URL("https://gnews.io/api/v4/search");
  endpoint.searchParams.set("q", topic);
  endpoint.searchParams.set("lang", language);
  endpoint.searchParams.set("country", country);
  endpoint.searchParams.set("max", "8");
  endpoint.searchParams.set("apikey", apiKey);

  const data = await fetchJson(endpoint);

  return (data.articles || []).map((article) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    imageUrl: article.image,
    source: article.source?.name || "Unknown source",
    author: null,
    publishedAt: article.publishedAt
  }));
}

async function fetchJson(endpoint) {
  const response = await fetch(endpoint);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.errors?.join(", ") || "News provider request failed.");
  }

  return data;
}

async function serveStatic(pathname, response) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const requestedPath = path.normalize(path.join(publicDir, normalizedPath));

  if (!requestedPath.startsWith(publicDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const filePath = existsSync(requestedPath) ? requestedPath : path.join(publicDir, "index.html");
  const extension = path.extname(filePath);
  const content = await readFile(filePath);

  response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
  response.end(content);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
