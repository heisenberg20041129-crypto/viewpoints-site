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
  const tags = (topic.tags || [])
    .map((tag) => `<span class="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors">${tag}</span>`)
    .join("");

  const image = topic.image || "";
  const imageAlt = topic.image_alt || topic.title;

  return `
    <article class="group relative bg-white dark:bg-[#111] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none">
      <a class="block" href="topic.html?id=${topic.id}">
        <div class="grid lg:grid-cols-2">
          <div class="relative overflow-hidden aspect-[16/10] lg:aspect-auto">
            ${image ? `<img alt="${imageAlt}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${image}" loading="lazy"/>` : ""}
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
          <div class="p-10 lg:p-14 flex flex-col justify-center">
            <div class="flex items-center gap-3 text-slate-400 text-xs font-medium mb-6">
              <span class="text-accent font-bold">${topic.domain}</span>
              <span>•</span>
              <span>更新 ${formatDate(topic.updated_at)}</span>
            </div>
            <h3 class="text-3xl md:text-4xl font-serif font-bold mb-6 group-hover:text-accent transition-colors">${topic.title}</h3>
            <p class="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">${topic.summary}</p>
            <div class="flex flex-wrap items-center gap-6 mb-10">
              <div class="flex items-center gap-2">
                <span class="material-icons-outlined text-slate-400 text-sm">article</span>
                <span class="text-sm font-medium text-slate-600 dark:text-slate-400">${itemCount} 篇文章</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-icons-outlined text-slate-400 text-sm">groups</span>
                <span class="text-sm font-medium text-slate-600 dark:text-slate-400">${clusterCount} 个观点簇</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              ${tags}
            </div>
          </div>
        </div>
      </a>
    </article>
  `;
};

const renderItemCard = (item) => {
  const summary = item.ai_summary || {};
  const reason = (summary.reasons || [])[0] || "";
  const tags = (item.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join("");
  return `
    <div class="item-row" data-tags="${(item.tags || []).join(",")}">
      <div class="item-row-top">
        <span class="item-source">${item.outlet}</span>
        <span class="item-date">${formatDate(item.published_at)}</span>
        <a class="icon-btn" href="${item.url}" target="_blank" rel="noopener" title="打开原文">↗</a>
      </div>
      <div class="item-claim">${summary.claim || ""}</div>
      <div class="item-row-foot">
        <span class="item-mini">理由：${reason}</span>
        <span class="item-mini">限定：${summary.caveat || ""}</span>
        <span class="item-chips">${tags}</span>
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
  const render = (list) => {
    container.innerHTML = list
      .map((topic) => renderTopicCard(topic, data.items, data.clusters))
      .join("");
  };

  render(topics);
  container.classList.remove("is-loading");

  const searchInput = document.getElementById("topic-search");
  const clearBtn = document.getElementById("search-clear");
  if (searchInput) {
    const applySearch = () => {
      const keyword = searchInput.value.trim().toLowerCase();
      if (!keyword) {
        render(topics);
        return;
      }
      const filtered = topics.filter((topic) => {
        const title = (topic.title || "").toLowerCase();
        const summary = (topic.summary || "").toLowerCase();
        return title.includes(keyword) || summary.includes(keyword);
      });
      render(filtered);
    };

    searchInput.addEventListener("input", applySearch);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        render(topics);
        searchInput.focus();
      });
    }
  }
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

  const itemsByCluster = groupItemsByCluster(topicItems);
  const container = document.getElementById("cluster-items");

  const navEl = document.getElementById("cluster-nav");
  navEl.innerHTML = topicClusters
    .map((cluster, index) => {
      const label = String.fromCharCode(65 + index);
      return `<button class="nav-chip" data-target="cluster-${cluster.id}">${label} ${cluster.title}</button>`;
    })
    .join("");

  const overviewEl = document.getElementById("topic-overview");
  if (overviewEl) {
    overviewEl.textContent = topic.overview || "暂无总览。";
  }

  container.innerHTML = topicClusters
    .map((cluster) => {
      const items = itemsByCluster.get(cluster.id) || [];
      const cards = items.map(renderItemCard).join("");
      return `
        <details class="cluster-block" id="cluster-${cluster.id}" open>
          <summary>
            <span class="cluster-title">${cluster.title}</span>
            <span class="cluster-count">${items.length}</span>
            <span class="cluster-summary">${cluster.summary}</span>
            <span class="cluster-tags">${(cluster.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join("")}</span>
          </summary>
          <div class="cluster-body">
            ${cards || "<p class=\"muted\">暂无观点卡片</p>"}
          </div>
        </details>
      `;
    })
    .join("");

  const filterBar = document.getElementById("filter-bar");
  if (filterBar) {
    const tagSet = new Set();
    topicItems.forEach((item) => (item.tags || []).forEach((tag) => tagSet.add(tag)));
    const tagList = Array.from(tagSet);
    filterBar.innerHTML = `
      <button class="filter-chip is-active" data-tag="all">清除筛选</button>
      ${tagList.map((tag) => `<button class="filter-chip" data-tag="${tag}">${tag}</button>`).join("")}
    `;
  }

  const applyFilter = () => {
    const active = Array.from(document.querySelectorAll(".filter-chip.is-active"))
      .map((el) => el.dataset.tag)
      .filter((tag) => tag && tag !== "all");
    document.querySelectorAll(".item-row").forEach((row) => {
      const rowTags = (row.dataset.tags || "").split(",").filter(Boolean);
      const match = active.length === 0 || active.some((tag) => rowTags.includes(tag));
      row.style.display = match ? "grid" : "none";
    });
  };

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const tag = chip.dataset.tag;
      if (tag === "all") {
        document.querySelectorAll(".filter-chip").forEach((el) => el.classList.remove("is-active"));
        chip.classList.add("is-active");
      } else {
        document.querySelector(".filter-chip[data-tag=\"all\"]")?.classList.remove("is-active");
        chip.classList.toggle("is-active");
      }
      applyFilter();
    });
  });

  navEl.querySelectorAll(".nav-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const targetId = chip.dataset.target;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const navChip = navEl.querySelector(`[data-target="${id}"]`);
          if (navChip) {
            navChip.classList.toggle("is-active", entry.isIntersecting);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0.1 }
    );
    document.querySelectorAll(".cluster-block").forEach((block) => observer.observe(block));
  }
};

const init = async () => {
  const themeToggle = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", initialTheme === "dark");
  document.documentElement.setAttribute("data-theme", initialTheme);

  if (themeToggle) {
    if (themeToggle.dataset.mode !== "icon") {
      themeToggle.textContent = initialTheme === "dark" ? "日间" : "暗夜";
    }
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", !isDark);
      const nextTheme = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("theme", nextTheme);
      if (themeToggle.dataset.mode !== "icon") {
        themeToggle.textContent = nextTheme === "dark" ? "日间" : "暗夜";
      }
    });
  }

  const response = await fetch(DATA_URL);
  const data = await response.json();
  initIndex(data);
  initTopic(data);
};

init();
