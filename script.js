const CONFIG = {
MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
LOGO: "logo-4mfm.png",
ANNOUNCER_INTERVAL: 6 * 60 * 1000
};

const state = {
musicList: [],
announcerList: [],
isStarted: false,
lastAnnouncer: 0,
notificationsEnabled: false
};

const el = {
audio: document.getElementById("audio"),
track: document.getElementById("track"),
artist: document.getElementById("artist"),
startBtn: document.getElementById("startBtn"),
notice: document.getElementById("notice"),
shareBtn: document.getElementById("shareBtn")
};

/* =========================
UTILS
=========================*/

function shuffle(array){
for(let i=array.length-1;i>0;i--){
const j=Math.floor(Math.random()*(i+1));
[array[i],array[j]]=[array[j],array[i]];
}
return array;
}

function formatTrackName(filename){

let clean = filename
.replace(".mp3","")

// separador artista / música
.replace(/\.-\./g," |SEP| ")

// troca ".e." por "&"
.replace(/\.e\./g," & ")

// troca pontos restantes por espaço
.replace(/\./g," ")

// remove espaços duplicados
.replace(/\s+/g," ")
.trim();

if(clean.includes("|SEP|")){
const parts = clean.split("|SEP|");

return {
artist: parts[0].trim(),
track: parts[1].trim()
};
}

return {
artist: "4MFM RADIO",
track: clean
};
}

function sendNotification(title, body){

if(!state.notificationsEnabled) return;

if(Notification.permission === "granted"){
new Notification(title,{
body: body,
icon: CONFIG.LOGO
});
}
}

function updateMediaSession(title, artist){

if("mediaSession" in navigator){

navigator.mediaSession.metadata = new MediaMetadata({
title: title,
artist: artist,
album: "4MFM RADIO",
artwork: [{ src: CONFIG.LOGO, sizes: "512x512", type: "image/png" }]
});

navigator.mediaSession.setActionHandler("play",()=>el.audio.play());
navigator.mediaSession.setActionHandler("pause",()=>el.audio.pause());
navigator.mediaSession.setActionHandler("nexttrack",()=>playNext());
}
}

/* =========================
FETCH PLAYLIST
=========================*/

async function fetchPlaylist(){

try{

const [mRes,aRes] = await Promise.all([
fetch(CONFIG.MUSIC_API).then(r=>r.json()),
fetch(CONFIG.ANN_API).then(r=>r.json())
]);

state.musicList = shuffle(
mRes.assets.filter(a=>a.name.endsWith(".mp3"))
);

state.announcerList = shuffle(
aRes.assets.filter(a=>a.name.endsWith(".mp3"))
);

}catch(e){
console.error("Erro playlist:",e);
}
}

/* =========================
PLAYER
=========================*/

async function playNext(){

if(state.musicList.length === 0){
await fetchPlaylist();
if(state.musicList.length === 0){
el.track.innerText="Sem músicas";
return;
}
}

const now = Date.now();
let item;
let isAnnouncer = false;

if(
(now - state.lastAnnouncer) > CONFIG.ANNOUNCER_INTERVAL &&
Math.random() < 0.3 &&
state.announcerList.length > 0
){
item = state.announcerList.shift();
state.lastAnnouncer = now;
isAnnouncer = true;

el.track.innerText = "Mensagem Especial";
el.artist.innerText = "Kiara • 4MFM";

sendNotification("🎙 Kiara está no ar!", "Mensagem especial da 4MFM");

}else{

item = state.musicList.shift();
const formatted = formatTrackName(item.name);

el.track.innerText = formatted.track;
el.artist.innerText = formatted.artist;

sendNotification("🎵 Tocando Agora", `${formatted.artist} - ${formatted.track}`);
updateMediaSession(formatted.track, formatted.artist);
}

el.audio.src = item.browser_download_url;

try{
await el.audio.play();
}catch(e){
console.error("Erro ao tocar:",e);
}
}

el.audio.onended = playNext;

/* =========================
SHARE SYSTEM
=========================*/

el.shareBtn.addEventListener("click", async ()=>{

const shareData = {
title: "4MFM RADIO",
text: "Estou ouvindo a 4MFM RADIO 🎵",
url: window.location.href
};

if(navigator.share){
await navigator.share(shareData);
}else{
navigator.clipboard.writeText(window.location.href);
alert("Link copiado!");
}
});

/* =========================
START BUTTON
=========================*/

el.startBtn.addEventListener("click", async ()=>{

if(state.isStarted) return;

state.isStarted = true;

if("Notification" in window){
const permission = await Notification.requestPermission();
state.notificationsEnabled = permission === "granted";
}

el.startBtn.disabled = true;
el.startBtn.innerText = "Sintonizando...";
el.notice.classList.add("hidden");

await fetchPlaylist();
await playNext();

el.startBtn.innerText = "No Ar";
});
