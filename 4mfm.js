const player = document.getElementById("player");
const preloadPlayer = document.getElementById("preloadPlayer");
const allowBtn = document.getElementById("allowBtn");
const modal = document.getElementById("permissionModal");
const songName = document.getElementById("songName");
const liveTitle = document.getElementById("liveTitle");
const notify = document.getElementById("notify");

const bgItems = [...document.querySelectorAll(".bg-container video, .bg-container img")];

let playlist = [];
let announcers = [];
let playCount = 0;
let bgIndex = 0;

/* ---------------- UTIL ---------------- */

function notifyMsg(msg) {
  notify.textContent = msg;
  notify.style.display = "block";
  setTimeout(() => notify.style.display = "none", 3000);
}

function formatTitle(name) {
  return name.replace(".mp3", "").replace(/[.-]/g, " ");
}

/* ---------------- BACKGROUND ---------------- */

function showNextBg() {
  bgItems.forEach(el => {
    el.classList.remove("active");
    el.pause && el.pause();
  });

  const item = bgItems[bgIndex];
  item.classList.add("active");

  if (item.tagName === "VIDEO") {
    item.currentTime = 0;
    item.play();
    item.onended = nextBg;
  } else {
    setTimeout(nextBg, 6000);
  }

  bgIndex = (bgIndex + 1) % bgItems.length;
}

function nextBg() {
  showNextBg();
}

/* ---------------- AUDIO ---------------- */

player.volume = 1;

player.addEventListener("timeupdate", () => {
  localStorage.setItem("lastSrc", player.src);
  localStorage.setItem("lastTime", player.currentTime);
});

player.onended = () => playNext();

async function loadData() {
  const songs = await fetch("https://api.github.com/repos/BRAAR-ORG/4mfm-api/releases/tags/songs").then(r=>r.json());
  const ann = await fetch("https://api.github.com/repos/BRAAR-ORG/4mfm-api/releases/tags/announcer").then(r=>r.json());

  playlist = songs.assets.filter(a=>a.name.endsWith(".mp3"));
  announcers = ann.assets.filter(a=>a.name.endsWith(".mp3"));
}

function pickNext() {
  playCount++;

  if ((playCount % 6 === 0 || playCount % 12 === 0) && announcers.length) {
    const a = announcers[Math.random()*announcers.length|0];
    return { src:a.browser_download_url, title:"🎙 Kiara no Ar", locutora:true };
  }

  const m = playlist[Math.random()*playlist.length|0];
  return { src:m.browser_download_url, title:formatTitle(m.name), locutora:false };
}

async function playSong(data, resume=false) {
  try {
    player.src = data.src;
    songName.textContent = data.title;

    liveTitle.classList.toggle("locutora", data.locutora);

    if (resume) {
      notifyMsg("Retomando reprodução…");
      player.currentTime = parseFloat(localStorage.getItem("lastTime")) || 0;
    }

    await player.play();

    const next = pickNext();
    preloadPlayer.src = next.src;

  } catch {
    playNext();
  }
}

function playNext() {
  playSong(pickNext());
}

/* ---------------- START ---------------- */

allowBtn.onclick = async () => {
  modal.style.display = "none";

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();

  await loadData();
  showNextBg();

  const savedSrc = localStorage.getItem("lastSrc");

  if (savedSrc) {
    playSong({ src:savedSrc, title:"Retomando…" }, true);
  } else {
    playNext();
  }
};
