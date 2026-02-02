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
  const imageMarkup = topic.image
    ? `
      <div class="topic-media">
        <img class="topic-thumb is-blurred" src="${topic.image}" alt="${topic.image_alt || topic.title}" loading="lazy" />
      </div>
    `
    : "";

  return `
    <a class="topic-card" href="topic.html?id=${topic.id}">
      ${imageMarkup}
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
  return `
    <div class="item-card">
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

  const heroImage = document.getElementById("topic-image");
  if (heroImage) {
    if (topic.image) {
      heroImage.src = topic.image;
      heroImage.alt = topic.image_alt || topic.title;
    } else {
      heroImage.closest(".topic-media-hero").style.display = "none";
    }
  }

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

const init = async () => {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  initIndex(data);
  initTopic(data);
};

init();
