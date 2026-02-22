const CONFIG = {
MUSIC_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/sertanejo",
ANN_API: "https://api.github.com/repos/BRAAR-ORG/4mfm-radio/releases/tags/locutoura",
LOGO: "./icon/logo-4mfm.png",
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
shareBtn: document.getElementById("shareBtn"),
bgVideo: document.getElementById("bgVideo"),
bgImage: document.getElementById("bgImage")
};

/* =========================
FUNDO ALEATÓRIO
=========================*/

const totalImages = 56;
const totalVideos = 6;

function setRandomBackground(){

const useVideo = Math.random() < 0.4;

if(useVideo){
const randomVideo = Math.floor(Math.random()*totalVideos)+1;
el.bgVideo.src = `./vids/video${randomVideo}.mp4`;
el.bgVideo.style.display="block";
el.bgImage.style.display="none";
}else{
const randomImage = Math.floor(Math.random()*totalImages)+1;
const imgNumber = String(randomImage).padStart(3,"0");
el.bgImage.src = `./imgs/img${imgNumber}.png`;
el.bgImage.style.display="block";
el.bgVideo.style.display="none";
}
}

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
.replace(/\.-\./g," |SEP| ")
.replace(/\.e\./g," & ")
.replace(/\./g," ")
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

/* =========================
NOTIFICAÇÕES ALEATÓRIAS
=========================*/

const musicMessages = [
"Clássico que atravessa gerações!",
"O som não para na 4MFM!",
"Sintonize emoção!",
"Aumenta o volume!",
"Mais um sucesso no ar!"
];

const announcerMessages = [
"Kiara está com você!",
"A voz da 4MFM no ar!",
"Mensagem especial chegando!",
"Momento exclusivo da rádio!",
"Kiara traz novidades!"
];

function sendNotification(title, body){

if(!state.notificationsEnabled) return;

if(Notification.permission === "granted"){
new Notification(title,{
body: body,
icon: CONFIG.LOGO
});
}
}

/* =========================
FETCH
=========================*/

async function fetchPlaylist(){

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
}

/* =========================
PLAYER
=========================*/

async function playNext(){

setRandomBackground();

if(state.musicList.length===0){
await fetchPlaylist();
}

const now = Date.now();
let item;
let isAnnouncer=false;

if(
(now-state.lastAnnouncer)>CONFIG.ANNOUNCER_INTERVAL &&
Math.random()<0.3 &&
state.announcerList.length>0
){
item=state.announcerList.shift();
state.lastAnnouncer=now;
isAnnouncer=true;

const formatted=formatTrackName(item.name);

el.track.innerText=formatted.track;
el.artist.innerText="Kiara • 4MFM";

const randomMsg=announcerMessages[Math.floor(Math.random()*announcerMessages.length)];
sendNotification("🎙 Kiara no ar", randomMsg);

}else{
item=state.musicList.shift();
const formatted=formatTrackName(item.name);

el.track.innerText=formatted.track;
el.artist.innerText=formatted.artist;

const randomMsg=musicMessages[Math.floor(Math.random()*musicMessages.length)];
sendNotification("🎵 Tocando Agora", randomMsg);
}

el.audio.src=item.browser_download_url;
await el.audio.play();
}

el.audio.onended=playNext;

/* =========================
START
=========================*/

el.startBtn.addEventListener("click", async ()=>{

if(state.isStarted) return;
state.isStarted=true;

if("Notification" in window){
const permission=await Notification.requestPermission();
state.notificationsEnabled=permission==="granted";
}

el.startBtn.disabled=true;
el.notice.classList.add("hidden");

await fetchPlaylist();
await playNext();

});
