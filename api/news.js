const provider = (process.env.NEWS_PROVIDER || "newsapi").toLowerCase();
const language = process.env.NEWS_LANGUAGE || "en";
const country = process.env.NEWS_COUNTRY || "us";

export default async function handler(request, response) {
  try {
    const requestUrl = new URL(request.url, `https://${request.headers.host}`);
    const topics = (requestUrl.searchParams.get("topics") || "")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!topics.length) {
      response.status(400).json({ error: "Add at least one topic." });
      return;
    }

    const results = await Promise.all(
      topics.map(async (topic) => ({
        topic,
        articles: await fetchArticles(topic)
      }))
    );

    response.status(200).json({
      provider,
      generatedAt: new Date().toISOString(),
      topics: results
    });
  } catch (error) {
    response.status(500).json({
      error: "Something went wrong while fetching the latest news.",
      detail: error.message
    });
  }
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
    throw new Error("Missing NEWSAPI_KEY in environment variables.");
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
    throw new Error("Missing GNEWS_KEY in environment variables.");
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
  const providerResponse = await fetch(endpoint);
  const data = await providerResponse.json().catch(() => ({}));

  if (!providerResponse.ok) {
    throw new Error(data.message || data.errors?.join(", ") || "News provider request failed.");
  }

  return data;
}
