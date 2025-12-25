// Lista de músicas do GitHub Releases
const songs = [
    "Queen.I.Want.It.All.mp3",
    "Blake.Shelton.Footloose.mp3",
    "ACDC.Thunderstruck.mp3",
    "Bon.Jovi.Its.My.Life.mp3"
];

// Corrigir nomes
function formatName(filename) {
    return filename
        .replace(".mp3", "")
        .replace(/\./g, " ")
        .replace(/(\w+)\s(\w+)/, "$1 - $2");
}

// Seleção aleatória
function getRandomSong() {
    return songs[Math.floor(Math.random() * songs.length)];
}

const audio = document.getElementById("audio");
const currentSongText = document.getElementById("currentSong");

// Função principal
function playRandom() {
    const file = getRandomSong();
    const url = `https://github.com/BRAAR-ORG/4mfm-api/releases/download/songs/${file}`;

    audio.src = url;
    currentSongText.textContent = formatName(file);

    audio.play();
}

// Quando terminar, toca outra automaticamente
audio.addEventListener("ended", playRandom);

// Start
playRandom();