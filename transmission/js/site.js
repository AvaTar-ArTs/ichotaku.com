/* site wiring: world tuner, sign-on, transmission, field, keyboard */

import { SpiralSine } from "./spiral-sine.js";
import { Transmission } from "./audio.js";

/* Ten places. Each has one image, one sentence and one doorway. */
const NODES = [
  { name: "Heartbreak Alley", family: "NOIR PUNK GUTTER", image: "assets/worlds/heartbreak-alley.jpg",
    line: "Rain-slicked urban decay where the station transmits from.", href: "../sites/multiverse-icloud-v3/alley/index.html" },
  { name: "TrashCat Radio", family: "24/7 SIGNAL", image: "assets/worlds/trashcat-radio.jpg",
    line: "Punk raccoon philosophy on the air, every hour of every night.", href: "../sites/multiverse-icloud-v3/radio/index.html" },
  { name: "Creator Camp", family: "BUILD THE WORLD", image: "assets/worlds/creator-camp.jpg",
    line: "Build the work. Learn the routes. Ship the world.", href: "../sites/multiverse-icloud-v3/camp/index.html" },
  { name: "Avatar-Arts Labs", family: "PROTOTYPE FIRST", image: "assets/worlds/avatar-arts-labs.jpg",
    line: "Experiments that explain themselves later — and keep their receipts.", href: "../sites/multiverse-icloud-v3/labs/index.html" },
  { name: "Inside The Build", family: "PUBLIC JOURNALS", image: "assets/worlds/inside-the-build.jpg",
    line: "The creative stack, documented while it is still being built.", href: "../sites/multiverse-icloud-v3/builds/index.html" },
  { name: "Creative Archive", family: "MEMORY, NOT STORAGE", image: "assets/worlds/creative-archive.jpg",
    line: "Everything the world has learned, kept in the open.", href: "../sites/multiverse-icloud-v3/archive/index.html" },
  { name: "Systems That Create", family: "INFRASTRUCTURE", image: "assets/worlds/systems-that-create.jpg",
    line: "Creative infrastructure for the agentic era.", href: "../sites/multiverse-icloud-v3/systems/index.html" },
  { name: "The Forge", family: "ichoTaKu · CYBERPUNK MONASTIC", image: "assets/worlds/the-forge.jpg",
    line: "The digital workspace as sacred ground. Where the work gets made.", href: "../sites/avatararts-root/avatararts-multiverse-sites-v3/ichotaku/index.html" },
  { name: "Nocturne Verse", family: "LIMINAL HAUNT", image: "assets/worlds/nocturne-verse.jpg",
    line: "Between-place mysticism: the mood both characters share.", href: "assets/docs/ichotaku-worlds.md" },
  { name: "Sacred Junkyard", family: "INDUSTRIAL FOLK", image: "assets/characters/trashcat-pink.png",
    line: "Found beauty and hard wisdom in what the system discarded.", href: "assets/docs/trashcat-worlds.md" },
];

const $ = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------ the field */

const canvas = $("#spiral");
const fieldState = $("#field-state");
let spiral = null;
if (canvas) {
  try {
    spiral = new SpiralSine(canvas);
    spiral.start();
    fieldState.textContent = spiral.gl
      ? "fluid-inspired interactive field · pointer stirs the vorticity"
      : "fluid-inspired field · reduced 2d rendering (no WebGL2 on this machine)";
  } catch (error) {
    fieldState.textContent = "field unavailable on this machine — the rest of the site still works";
    console.warn("Spiral-Sine failed:", error);
  }
}

/* stop rendering when the hero is off screen */
if (spiral && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) spiral.start();
      else spiral.stop();
    }
  }, { threshold: 0.02 });
  observer.observe($("#signal"));
}

/* --------------------------------------------------------- the sign-on */

const signon = $("#signon");
if (signon) {
  const dismiss = () => signon.classList.add("gone");
  setTimeout(dismiss, 4200);
  window.addEventListener("pointerdown", dismiss, { once: true });
}

/* ------------------------------------------------------ the transmission */

const playButton = $("#play");
const audioElement = $("#audio");
const meter = $("#meter");
const playerState = $("#player-state");
const bug = document.querySelector(".bug");

let transmission = null;
if (playButton && audioElement) {
  transmission = new Transmission(audioElement, {
    onState: (playing) => {
      playButton.textContent = playing ? "Stop transmission" : "Play transmission";
      playButton.setAttribute("aria-pressed", playing ? "true" : "false");
      playerState.textContent = playing
        ? "on air — the field is following the amplitude"
        : "carrier silent — the field is still alive.";
      bug?.classList.toggle("on", playing);
    },
  });

  playButton.addEventListener("click", () => transmission.toggle());

  const tick = () => {
    const read = transmission.read();
    if (meter) {
      const bars = meter.querySelectorAll("i");
      bars.forEach((bar, index) => {
        const value = read.bands[index] ?? 0;
        bar.style.height = `${8 + value * 92}%`;
      });
      meter.classList.toggle("live", read.level > 0.01);
    }
    spiral?.setAudio(read);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* hero: TUNE IN goes to the song and hands the visitor the play control */
document.querySelector('[data-action="tune-in"]')?.addEventListener("click", () => {
  document.querySelector("#song")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => playButton?.focus({ preventScroll: true }), 700);
});

/* -------------------------------------------------------- the world tuner */

const tunerList = $("#tuner-list");
const tunerImage = $("#tuner-image");
const tunerTitle = $("#tuner-title");
const tunerLine = $("#tuner-line");
const tunerFamily = $("#tuner-family");
const tunerLink = $("#tuner-link");

function selectNode(index, focus = false) {
  const node = NODES[index];
  if (!node) return;
  NODES.forEach((_, i) => {
    const button = tunerList.children[i];
    button.setAttribute("aria-selected", i === index ? "true" : "false");
    button.tabIndex = i === index ? 0 : -1;
  });
  tunerImage.src = node.image;
  tunerImage.alt = `${node.name}: ${node.line}`;
  tunerTitle.textContent = node.name;
  tunerLine.textContent = node.line;
  tunerFamily.textContent = node.family;
  tunerLink.href = node.href;
  tunerLink.textContent = node.href.endsWith(".md") ? "Read the world notes" : "Open the door";
  if (focus) tunerList.children[index]?.focus();
}

if (tunerList) {
  NODES.forEach((node, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === 0 ? "true" : "false");
    button.tabIndex = index === 0 ? 0 : -1;
    button.textContent = node.name;
    button.addEventListener("click", () => selectNode(index));
    tunerList.append(button);
  });
  selectNode(0);

  tunerList.addEventListener("keydown", (event) => {
    const current = Array.from(tunerList.children).indexOf(document.activeElement);
    if (current < 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectNode((current + 1) % NODES.length, true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectNode((current - 1 + NODES.length) % NODES.length, true);
    }
  });
}
