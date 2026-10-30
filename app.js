const { pages, families, familyCounts } = window.ATLAS_DATA;
const grid = document.querySelector("#card-grid");
const filters = document.querySelector("#filters");
const search = document.querySelector("#search");
const count = document.querySelector("#result-count");
const dialog = document.querySelector("#artifact-dialog");
let activeFamily = "all";

const filterButton = (key, label, total, color) => {
  const button = document.createElement("button");
  button.className = `filter${key === "all" ? " active" : ""}`;
  button.dataset.family = key;
  button.style.setProperty("--family", color || "#25e6db");
  button.textContent = `${label} · ${total}`;
  button.addEventListener("click", () => {
    activeFamily = key;
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
  filters.append(button);
};

filterButton("all", "All", pages.length, "#f4efdf");
Object.entries(families).forEach(([key, family]) => filterButton(key, family.label, familyCounts[key], family.color));

function openArtifact(page) {
  document.querySelector("#dialog-image").src = page.image;
  document.querySelector("#dialog-image").alt = `Preview of ${page.title}`;
  document.querySelector("#dialog-family").textContent = `${String(page.id).padStart(2, "0")} / ${page.familyLabel}`;
  document.querySelector("#dialog-title").textContent = page.title;
  document.querySelector("#dialog-purpose").textContent = page.purpose;
  document.querySelector("#dialog-source").textContent = page.source;
  const openLink = document.querySelector("#dialog-open");
  openLink.href = page.url || "#";
  openLink.hidden = !page.url;
  dialog.showModal();
}

function render() {
  const query = search.value.trim().toLowerCase();
  const visible = pages.filter((page) => {
    const matchesFamily = activeFamily === "all" || page.family === activeFamily;
    const haystack = `${page.title} ${page.purpose} ${page.source} ${page.familyLabel}`.toLowerCase();
    return matchesFamily && (!query || haystack.includes(query));
  });
  count.textContent = `${visible.length} artifact${visible.length === 1 ? "" : "s"}`;
  grid.replaceChildren(...visible.map((page) => {
    const card = document.createElement("button");
    card.className = "artifact";
    card.style.setProperty("--family", families[page.family].color);
    card.innerHTML = `<img loading="lazy" src="${page.image}" alt=""><div class="artifact-copy"><div class="artifact-meta"><span>${page.familyLabel}</span><span>${String(page.id).padStart(2, "0")}</span></div><h3>${page.title}</h3><p>${page.purpose}</p></div>`;
    card.addEventListener("click", () => openArtifact(page));
    return card;
  }));
}

search.addEventListener("input", render);
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
render();
