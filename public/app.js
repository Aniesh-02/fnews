const form = document.querySelector("#topicForm");
const input = document.querySelector("#topicInput");
const chips = document.querySelector("#topicChips");
const refreshButton = document.querySelector("#refreshButton");
const statusText = document.querySelector("#statusText");
const newsGrid = document.querySelector("#newsGrid");
const topicSectionTemplate = document.querySelector("#topicSectionTemplate");
const articleTemplate = document.querySelector("#articleTemplate");

const topics = new Set();
let isLoading = false;
let refreshTimer = null;

renderChips();
refreshTimer = window.setInterval(fetchNews, 60000);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTopic(input.value);
  input.value = "";
});

refreshButton.addEventListener("click", fetchNews);

function addTopic(value) {
  const topic = value.trim().toLowerCase();
  if (!topic || topics.has(topic)) return;

  topics.add(topic);
  renderChips();
  fetchNews();
}

function removeTopic(topic) {
  topics.delete(topic);
  renderChips();
  if (topics.size) {
    fetchNews();
  } else {
    newsGrid.innerHTML = "";
    updateStatus("Search a topic to begin.");
  }
}

function renderChips() {
  chips.innerHTML = "";
  for (const topic of topics) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = topic;
    chip.setAttribute("aria-label", `Remove ${topic}`);
    chip.addEventListener("click", () => removeTopic(topic));
    chips.append(chip);
  }
}

async function fetchNews() {
  if (isLoading || !topics.size) return;

  isLoading = true;
  refreshButton.disabled = true;
  updateStatus("Fetching the latest stories...");

  try {
    const query = encodeURIComponent([...topics].join(","));
    const response = await fetch(`/api/news?topics=${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.detail || "Could not fetch news.");
    }

    renderNews(data.topics);
    const refreshedAt = new Date(data.generatedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    updateStatus(`Updated ${refreshedAt}. Auto-refreshes every minute.`);
  } catch (error) {
    updateStatus(error.message);
  } finally {
    isLoading = false;
    refreshButton.disabled = false;
  }
}

function renderNews(topicGroups) {
  newsGrid.innerHTML = "";

  for (const group of topicGroups) {
    const section = topicSectionTemplate.content.cloneNode(true);
    const heading = section.querySelector("h2");
    const count = section.querySelector(".topic-heading span");
    const articleList = section.querySelector(".article-list");

    heading.textContent = group.topic;
    count.textContent = `${group.articles.length} stories`;

    if (!group.articles.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No fresh stories found for this topic yet.";
      articleList.append(empty);
    }

    for (const article of group.articles) {
      articleList.append(renderArticle(article));
    }

    newsGrid.append(section);
  }
}

function renderArticle(article) {
  const node = articleTemplate.content.cloneNode(true);
  const card = node.querySelector(".article-card");
  const image = node.querySelector("img");
  const source = node.querySelector(".source");
  const time = node.querySelector("time");
  const title = node.querySelector("h3");
  const description = node.querySelector("p");
  const link = node.querySelector("a");

  if (article.imageUrl) {
    image.src = article.imageUrl;
    image.alt = "";
  } else {
    image.remove();
    card.classList.add("no-image");
  }

  source.textContent = article.source || "Unknown source";
  title.textContent = article.title || "Untitled story";
  description.textContent = article.description || "Open the original journal link for the full report.";
  link.href = article.url;
  link.textContent = `Read at ${article.source || "origin"}`;

  if (article.publishedAt) {
    const date = new Date(article.publishedAt);
    time.dateTime = article.publishedAt;
    time.textContent = date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } else {
    time.remove();
  }

  return node;
}

function updateStatus(message) {
  statusText.textContent = message;
}

window.addEventListener("beforeunload", () => {
  window.clearInterval(refreshTimer);
});
