const DATA_URL = "data.json";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

const byUpdatedDesc = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);

const renderTags = (tags = []) =>
  tags.map((tag) => `<span class="tag">${tag}</span>`).join("");

const renderTopicCard = (topic, items, clusters) => {
  const itemCount = items.filter((item) => item.topic_id === topic.id).length;
  const clusterCount = clusters.filter((cluster) => cluster.topic_id === topic.id).length;

  return `
    <a class="topic-card" href="topic.html?id=${topic.id}">
      <p class="eyebrow">${topic.domain} · 更新 ${formatDate(topic.updated_at)}</p>
      <h3>${topic.title}</h3>
      <p class="muted">${topic.summary}</p>
      <div class="item-meta">
        <span>${itemCount} 篇文章</span>
        <span>${clusterCount} 个观点簇</span>
      </div>
      <div class="tags">${renderTags(topic.tags)}</div>
    </a>
  `;
};

const renderClusterCard = (cluster) => `
  <div class="cluster-card">
    <div class="cluster-title">${cluster.title}</div>
    <p class="muted">${cluster.summary}</p>
  </div>
`;

const renderItemCard = (item) => {
  const summary = item.ai_summary || {};
  const imageMarkup = item.image
    ? `
      <div class="item-media">
        <img class="item-thumb is-blurred" src="${item.image}" alt="${item.image_alt || item.title}" loading="lazy" />
      </div>
    `
    : "";
  return `
    <div class="item-card">
      ${imageMarkup}
      <div class="item-meta">
        <span>${item.outlet}</span>
        <span>${item.author}</span>
        <span>${item.category}</span>
        <span>${formatDate(item.published_at)}</span>
      </div>
      <div class="item-title">${item.title}</div>
      <div class="item-summary">
        <p><strong>核心主张：</strong>${summary.claim || ""}</p>
        <p><strong>理由要点：</strong>${(summary.reasons || []).join("；")}</p>
        <p><strong>争议 / 不确定：</strong>${summary.caveat || ""}</p>
      </div>
      <div class="item-footer">
        <span class="badge">${item.review_status}</span>
        <div class="tags">${renderTags(item.tags)}</div>
        <a class="btn ghost" href="item.html?id=${item.id}">详情</a>
        <a class="btn ghost" href="${item.url}" target="_blank" rel="noopener">原文</a>
      </div>
    </div>
  `;
};

const groupItemsByCluster = (items) => {
  const map = new Map();
  items.forEach((item) => {
    const key = item.cluster_id || "unassigned";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
};

const initIndex = (data) => {
  const container = document.getElementById("topic-list");
  if (!container) return;

  const topics = [...data.topics].sort(byUpdatedDesc);
  container.innerHTML = topics
    .map((topic) => renderTopicCard(topic, data.items, data.clusters))
    .join("");
};

const initTopic = (data) => {
  const titleEl = document.getElementById("topic-title");
  if (!titleEl) return;

  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("id") || data.topics[0]?.id;
  const topic = data.topics.find((entry) => entry.id === topicId);

  if (!topic) {
    titleEl.textContent = "未找到话题";
    return;
  }

  const topicItems = data.items.filter((item) => item.topic_id === topic.id);
  const topicClusters = data.clusters.filter((cluster) => cluster.topic_id === topic.id);

  document.getElementById("topic-title").textContent = topic.title;
  document.getElementById("topic-desc").textContent = topic.summary;
  document.getElementById("topic-meta").textContent = `${topic.domain} · 更新 ${formatDate(topic.updated_at)}`;
  document.getElementById("topic-items").textContent = topicItems.length;
  document.getElementById("topic-clusters").textContent = topicClusters.length;

  const overviewEl = document.getElementById("cluster-overview");
  overviewEl.innerHTML = topicClusters.map(renderClusterCard).join("");

  const itemsByCluster = groupItemsByCluster(topicItems);
  const container = document.getElementById("cluster-items");

  container.innerHTML = topicClusters
    .map((cluster) => {
      const items = itemsByCluster.get(cluster.id) || [];
      const cards = items.map(renderItemCard).join("");
      return `
        <div class="cluster-items">
          <h3>${cluster.title}</h3>
          <p class="muted">${cluster.summary}</p>
          ${cards || "<p class=\"muted\">暂无观点卡片</p>"}
        </div>
      `;
    })
    .join("");
};

const initItem = (data) => {
  const titleEl = document.getElementById("item-title");
  if (!titleEl) return;

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");
  const item = data.items.find((entry) => entry.id === itemId);

  if (!item) {
    titleEl.textContent = "未找到文章";
    return;
  }

  const topic = data.topics.find((entry) => entry.id === item.topic_id);
  const cluster = data.clusters.find((entry) => entry.id === item.cluster_id);
  const summary = item.ai_summary || {};

  document.getElementById("item-title").textContent = item.title;
  document.getElementById("item-meta").textContent = `${item.outlet} · ${item.author} · ${item.category} · ${formatDate(item.published_at)}`;
  document.getElementById("item-topic").textContent = topic ? topic.title : "";
  document.getElementById("item-cluster").textContent = cluster ? cluster.title : "";
  document.getElementById("item-claim").textContent = summary.claim || "";
  document.getElementById("item-caveat").textContent = summary.caveat || "";
  document.getElementById("item-tags").innerHTML = renderTags(item.tags);
  document.getElementById("item-review").textContent = item.review_status || "";

  const reasonsEl = document.getElementById("item-reasons");
  reasonsEl.innerHTML = (summary.reasons || [])
    .map((reason) => `<li>${reason}</li>`)
    .join("");

  const imageEl = document.getElementById("item-image");
  if (item.image) {
    imageEl.src = item.image;
    imageEl.alt = item.image_alt || item.title;
  } else {
    imageEl.closest(".detail-media").style.display = "none";
  }

  const backEl = document.getElementById("item-back");
  if (topic) {
    backEl.href = `topic.html?id=${topic.id}`;
  } else {
    backEl.href = "index.html";
  }

  const sourceEl = document.getElementById("item-source");
  sourceEl.href = item.url;
};

const init = async () => {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  initIndex(data);
  initTopic(data);
  initItem(data);
};

init();
