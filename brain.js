// ==========================================
// 1. PERSONALIDADES DOS BOTS
// ==========================================
const PERSONALIDADES = {
    nostalgico: {
        aberturas: ["Cara,", "Nossa,", "Putz,", "Lembro que", "Velho,"],
        fechamentos: ["... que saudade.", " né?", " demais.", " bons tempos.", " 📼"],
        hesitacao: [" hmm...", " sei lá,", " caramba..."],
        chanceCaps: 0.05,
        chanceSemPontuacao: 0.8,
        afinidade: ["saudade", "lembro", "antigamente", "tempo", "infância", "época"]
    },
    entusiasta: {
        aberturas: ["Gente!", "Meu!", "Nossa!", "Caraca!", "AEEE!"],
        fechamentos: [" demais!!", " isso aí!", " sensacional!", " hahaha", " 🔥🔥"],
        hesitacao: ["", " mds", " mano"],
        chanceCaps: 0.5,
        chanceSemPontuacao: 0.3,
        afinidade: ["festa", "música", "tocar", "volume", "dançar", "hit"]
    },
    pratico: {
        aberturas: ["", "Olha,", "Sinceramente,", "Fato:"],
        fechamentos: [" mesmo.", " sim.", " ponto final.", " 💯"],
        hesitacao: ["..."],
        chanceCaps: 0.1,
        chanceSemPontuacao: 0.5,
        afinidade: ["verdade", "exatamente", "concordo", "fato", "certo"]
    },
    curioso: {
        aberturas: ["Mas vem cá,", "Dúvida rápida:", "Gente, uma parada:", "Alguém sabe se"],
        fechamentos: [" o que acham?", " faz sentido?", " loucura né?", " 🤔"],
        hesitacao: [" ahn...", " pera,", " ué,"],
        chanceCaps: 0.1,
        chanceSemPontuacao: 0.6,
        afinidade: ["como", "por que", "alguém", "vocês", "será", "dúvida"]
    },
    reclamao: {
        aberturas: ["Na boa,", "Sinceramente,", "Papo reto,"],
        fechamentos: ["... aff.", " tá osso.", " fazer o que.", " 🙄"],
        hesitacao: [" tsc,", " mano,"],
        chanceCaps: 0.2,
        chanceSemPontuacao: 0.7,
        afinidade: ["chato", "ruim", "antigo", "melhor", "não gosto", "enjoei"]
    }
};

// ==========================================
// 2. MOTOR AUTÔNOMO COM MEMÓRIA CONTEXTUAL
// ==========================================
class MotorAutonomo {
    constructor() {
        this.nomeUsuario = "";
        this.botsAtivos = [];
        
        this.memoriaLongoPrazo = [];
        this.memoriaCurtoPrazo = [];
        this.assuntoAtual = "";
        
        this.loopRodando = false;
        this.gerenciadorRodando = false; // Trava para não duplicar o gerenciador
        this.nivelDeHype = 0; 
        this.humorDaSala = "neutro"; // "excitado", "triste", "nostalgico", "neutro"

        this.ultimaInteracaoUsuario = Date.now();

        this.pedidosMusica = {}; 
        this.votacao = {
            ativa: false,
            musica: "",
            sim: 0,
            nao: 0,
            votantes: new Set()
        };
        
        this.carregarAprendizadosDaMemoria();
    }

    iniciar(nomeUsuario) {
        this.nomeUsuario = nomeUsuario;
        
        // Garante que só adicionamos a cota inicial se a sala estiver vazia
        if (this.botsAtivos.length === 0) {
            this.adicionarBot();
            this.adicionarBot();
            this.adicionarBot(); 
        }
        
        this.iniciarLoopAutonomo();
        this.iniciarGerenciadorDeSala();
    }

    adicionarBot() {
        if (this.botsAtivos.length >= 389 || typeof dbNomes === "undefined") return; 
        const nomesDisponiveis = dbNomes.filter(nome => !this.botsAtivos.some(b => b.nome === nome));
        if (nomesDisponiveis.length === 0) return;

        const nomeSorteado = nomesDisponiveis[Math.floor(Math.random() * nomesDisponiveis.length)];
        const botTema = `tema-${Math.floor(Math.random() * 8) + 1}`;
        const tipos = Object.keys(PERSONALIDADES);
        const tipoSorteado = tipos[Math.floor(Math.random() * tipos.length)];
        const personalidadeBot = PERSONALIDADES[tipoSorteado];

        this.botsAtivos.push({ nome: nomeSorteado, tema: botTema, personalidade: personalidadeBot, tipo: tipoSorteado });

        if (typeof window.adicionarMensagemUI === "function") {
            setTimeout(() => {
                const msgsEntrada = ["colou na grade.", "chegou na área.", "sintonizou.", "apareceu."];
                const msg = msgsEntrada[Math.floor(Math.random() * msgsEntrada.length)];
                window.adicionarMensagemUI("Sistema ⚙️", `${nomeSorteado} ${msg}`, "user", true);
                if (typeof window.atualizarContador === "function") window.atualizarContador(this.botsAtivos.length + 1);
            }, Math.random() * 1000);
        }
    }

    removerBot() {
        if (this.botsAtivos.length <= 6) return; 
        const index = Math.floor(Math.random() * this.botsAtivos.length);
        const botRemovido = this.botsAtivos.splice(index, 1)[0];

        if (typeof window.adicionarMensagemUI === "function") {
            const msgsSaida = ["meteu o pé.", "foi dormir.", "saiu da sala.", "desconectou."];
            const msg = msgsSaida[Math.floor(Math.random() * msgsSaida.length)];
            window.adicionarMensagemUI("Sistema ⚙️", `${botRemovido.nome} ${msg}`, "user", true);
            if (typeof window.atualizarContador === "function") window.atualizarContador(this.botsAtivos.length + 1);
        }
    }

    iniciarGerenciadorDeSala() {
        if (this.gerenciadorRodando) return;
        this.gerenciadorRodando = true;

        setInterval(() => {
            const acao = Math.random();
            const chanceAdicionar = this.botsAtivos.length < 20 ? 0.8 : 0.4; 
            
            if (acao < chanceAdicionar) this.adicionarBot();
            else this.removerBot();
        }, 12000); 
    }

    obterBotAleatorio(afinidadeObrigatoria = null, excluirNome = null) {
        let candidatos = this.botsAtivos;
        if (excluirNome) {
            candidatos = candidatos.filter(b => b.nome !== excluirNome);
        }
        
        if (candidatos.length === 0) return null; // Proteção contra array vazio

        // Se a sala tiver um humor predominante, dá chance de priorizar bots desse humor
        if (this.humorDaSala !== "neutro" && Math.random() > 0.5) {
            const tipoDesejado = this.humorDaSala === "nostalgico" ? "nostalgico" : 
                                 this.humorDaSala === "excitado" ? "entusiasta" : "reclamao";
            const botsNoHumor = candidatos.filter(b => b.tipo === tipoDesejado);
            if (botsNoHumor.length > 0) return botsNoHumor[Math.floor(Math.random() * botsNoHumor.length)];
        }

        if (afinidadeObrigatoria) {
            const comAfinidade = candidatos.filter(b => b.personalidade.afinidade.includes(afinidadeObrigatoria));
            if (comAfinidade.length > 0) return comAfinidade[Math.floor(Math.random() * comAfinidade.length)];
        }
        return candidatos[Math.floor(Math.random() * candidatos.length)];
    }

    carregarAprendizadosDaMemoria() {
        const salvos = localStorage.getItem('4mfm_LongTermMemory');
        if (salvos) {
            try {
                this.memoriaLongoPrazo = JSON.parse(salvos);
            } catch (error) {
                console.warn("⚠️ [Memória] Falha ao ler memória de longo prazo. Resetando...", error);
                this.memoriaLongoPrazo = [];
                localStorage.removeItem('4mfm_LongTermMemory');
            }
        }
    }

    memorizarConceito(texto) {
        if (texto.length > 15 && !this.memoriaLongoPrazo.includes(texto)) {
            this.memoriaLongoPrazo.push(texto);
            if (this.memoriaLongoPrazo.length > 100) this.memoriaLongoPrazo.shift(); 
            localStorage.setItem('4mfm_LongTermMemory', JSON.stringify(this.memoriaLongoPrazo));
        }
    }

    atualizarContexto(texto, autor) {
        this.memoriaCurtoPrazo.push({ autor, texto, timestamp: Date.now() });
        if (this.memoriaCurtoPrazo.length > 15) this.memoriaCurtoPrazo.shift();

        this.nivelDeHype = Math.min(this.nivelDeHype + 1, 5);
        setTimeout(() => { this.nivelDeHype = Math.max(0, this.nivelDeHype - 1); }, 10000);

        // Tracker de Humor da Sala
        const txtLower = texto.toLowerCase();
        if (/(saudade|antigo|tempo|época|lembro)/.test(txtLower)) this.humorDaSala = "nostalgico";
        else if (/(foda|top|muito bom|aee|bora|aoba)/.test(txtLower)) this.humorDaSala = "excitado";
        else if (/(chato|ruim|merda|credo)/.test(txtLower)) this.humorDaSala = "triste";

        const palavrasIgnoradas = ["que", "para", "com", "não", "uma", "um", "isso", "mais", "aqui", "esse", "essa", "como", "mas"];
        const palavras = txtLower.replace(/[^\w\sáéíóúãõç]/g, '').split(' ');
        const palavrasValidas = palavras.filter(p => p.length > 4 && !palavrasIgnoradas.includes(p));
        
        if (palavrasValidas.length > 0) {
            this.assuntoAtual = palavrasValidas[Math.floor(Math.random() * palavrasValidas.length)];
        }
    }

    verificarPalavrao(texto) {
        const palavrasProibidas = ["porra", "caralho", "buceta", "puta", "merda", "cacete", "foder", "foda", "cu", "piroca", "rola", "pinto", "arrombado", "viado", "putaria", "krl", "pqp", "fdp", "vsf", "tnc", "corno", "vadia", "otário", "desgraça", "sexo"];
        const textoLimpo = texto.toLowerCase().replace(/[^a-z0-9áéíóúãõç\s]/g, "");
        const palavrasArray = textoLimpo.split(/\s+/);
        return palavrasProibidas.some(palavrao => palavrasArray.includes(palavrao));
    }

    registrarPedido(musica) {
        if (this.votacao.ativa) return; 
        this.pedidosMusica[musica] = (this.pedidosMusica[musica] || 0) + 1;
        if (this.pedidosMusica[musica] >= 3) {
            this.iniciarVotacao(musica);
            this.pedidosMusica = {}; 
        }
    }

    iniciarVotacao(musica) {
        this.votacao = { ativa: true, musica: musica, sim: 0, nao: 0, votantes: new Set() };
        let nomeMusicaLimpo = musica.replace(".mp3", "").replace(".wav", "");

        if (typeof window.adicionarMensagemUI === "function") {
            window.adicionarMensagemUI("Camilla 🎧", `Gente, vi que vocês estão pedindo muito a música **${nomeMusicaLimpo}**! Querem que eu toque ela na sequência? Digitem **SIM** ou **NÃO** no chat! Têm 30 segundos! ⏱️`, "user", true);
        }
        setTimeout(() => this.encerrarVotacao(), 30000);
    }

    encerrarVotacao() {
        this.votacao.ativa = false;
        let nomeMusicaLimpo = this.votacao.musica.replace(".mp3", "").replace(".wav", "");
        let resultadoTxt = `Votação encerrada! Tivemos ${this.votacao.sim} votos SIM e ${this.votacao.nao} votos NÃO. `;

        if (this.votacao.sim > this.votacao.nao) {
            resultadoTxt += `A maioria venceu! Colocando **${nomeMusicaLimpo}** como a próxima música da fila! 🎶`;
            if (typeof window.colocarComoProximaNaFila === 'function') window.colocarComoProximaNaFila(this.votacao.musica);
        } else if (this.votacao.nao > this.votacao.sim) {
            resultadoTxt += `Pelo visto a galera não tá a fim de ouvir essa agora. Fica pra próxima! 🚫`;
        } else {
            resultadoTxt += `Deu empate! E na dúvida, eu decido... não vou tocar agora não. Fica pra próxima! 🤷‍♀️`;
        }

        if (typeof window.adicionarMensagemUI === "function") window.adicionarMensagemUI("Camilla 🎧", resultadoTxt, "user", true);
    }

    processarMensagemUsuario(texto) {
        this.ultimaInteracaoUsuario = Date.now(); 
        this.atualizarContexto(texto, this.nomeUsuario || "Usuário");
        
        // Defesa da Autoridade / Filtro de Palavrão
        if (this.verificarPalavrao(texto)) {
            const xingandoDJ = /(dj|locutor|rádio|camilla|música|som)/i.test(texto);
            
            setTimeout(() => {
                let bot;
                let bronca;
                
                if (xingandoDJ) {
                    bot = this.botsAtivos.find(b => b.tipo === "reclamao") || this.obterBotAleatorio();
                    if (!bot) return;
                    const defesas = ["respeita o dj aí ô", "tá achando ruim faz melhor", "ninguém te obrigou a ouvir, mano", "pô, mó falta de respeito com a rádio"];
                    bronca = defesas[Math.floor(Math.random() * defesas.length)];
                } else {
                    bot = this.obterBotAleatorio();
                    if (!bot || typeof dbConversas === "undefined" || !dbConversas.reacao_palavrao) return;
                    bronca = dbConversas.reacao_palavrao[Math.floor(Math.random() * dbConversas.reacao_palavrao.length)];
                }
                
                bronca = this.aplicarVariabilidadeHumana(bronca, bot.personalidade);
                if (typeof window.adicionarMensagemUI === "function") window.adicionarMensagemUI(bot.nome, bronca, bot.tema);
            }, 800 + Math.random() * 1000); 
            return; 
        }

        this.memorizarConceito(texto);

        // Votação intercepta as mensagens
        if (this.votacao.ativa) {
            if (!this.votacao.votantes.has(this.nomeUsuario)) {
                let textoLower = texto.toLowerCase();
                if (textoLower.includes("sim") || textoLower.includes("quero") || textoLower.includes("toca") || textoLower === "s") {
                    this.votacao.sim++;
                    this.votacao.votantes.add(this.nomeUsuario);
                } else if (textoLower.includes("não") || textoLower.includes("nao") || textoLower.includes("pula") || textoLower === "n") {
                    this.votacao.nao++;
                    this.votacao.votantes.add(this.nomeUsuario);
                }
            }
            return; // Se a votação está ativa, não gera resposta contextual
        } else {
            // Checa pedidos de música espontâneos
            if (window.listaDeMusicasGlobal) {
                window.listaDeMusicasGlobal.forEach(musica => {
                    let pedacoNome = musica.toLowerCase().split(' - ')[1] || musica.toLowerCase();
                    if (texto.toLowerCase().includes(pedacoNome)) {
                        this.registrarPedido(musica);
                    }
                });
            }
        }

        const tempoLeitura = Math.min(texto.length * 20, 1500); 

        setTimeout(() => {
            const bot1 = this.obterBotAleatorio();
            if(!bot1 || typeof dbConversas === "undefined") return;
            
            let resposta = this.gerarRespostaContextual(texto, bot1);
            resposta = this.aplicarVariabilidadeHumana(resposta, bot1.personalidade);
            
            if (typeof window.adicionarMensagemUI === "function") {
                window.adicionarMensagemUI(bot1.nome, resposta, bot1.tema);
            }

            // Chance de um segundo bot entrar na conversa concordando ou discordando
            if (Math.random() > 0.4) {
                setTimeout(() => {
                    const bot2 = this.obterBotAleatorio(null, bot1.nome); 
                    if(bot2) {
                        const falarComBot = Math.random() > 0.5;
                        let msgExtra = "";
                        
                        if(falarComBot && dbConversas.concordancia) {
                            if (bot2.tipo === "reclamao") {
                                const discordancias = ["nada a ver isso aí.", "viajou legal.", "discordo craque.", "tá falando besteira."];
                                msgExtra = `@${bot1.nome} ${discordancias[Math.floor(Math.random() * discordancias.length)]}`;
                            } else {
                                let concorda = dbConversas.concordancia[Math.floor(Math.random() * dbConversas.concordancia.length)];
                                msgExtra = `@${bot1.nome} ${concorda}`;
                            }
                        } else if (dbConversas.falar_com_usuario) {
                            let falaUser = dbConversas.falar_com_usuario[Math.floor(Math.random() * dbConversas.falar_com_usuario.length)];
                            msgExtra = `@${this.nomeUsuario || "visitante"} ${falaUser}`;
                        }
                        
                        if(msgExtra !== "") {
                            window.adicionarMensagemUI(bot2.nome, this.aplicarVariabilidadeHumana(msgExtra, bot2.personalidade), bot2.tema);
                        }
                    }
                }, 1200 + Math.random() * 1500);
            }
        }, tempoLeitura); 
    }

    gerarRespostaContextual(inputUsuario, bot) {
        const inputLower = inputUsuario.toLowerCase();
        const regexSaudacao = /\b(oi|olá|ola|bom dia|boa tarde|boa noite|salve|opa|e ai|eai|td bem|tudo bem|fala galera)\b/;
        const regexDespedida = /\b(tchau|flw|falou|fui|até mais|indo nessa|vazando|vou dormir|fui dormir|abraço)\b/;
        const ultimaMsg = this.memoriaCurtoPrazo[this.memoriaCurtoPrazo.length - 1];
        
        // Dinâmica de interdependência e fofoca
        if (ultimaMsg && ultimaMsg.autor !== bot.nome && ultimaMsg.autor !== this.nomeUsuario && Math.random() > 0.3) {
            let fraseConcordancia = "é verdade.";
            if (typeof dbConversas !== 'undefined' && dbConversas.concordancia) {
                fraseConcordancia = dbConversas.concordancia[Math.floor(Math.random() * dbConversas.concordancia.length)];
            }
            return `Nossa, mas falando nisso, @${ultimaMsg.autor}... ${this.substituirVariaveis(fraseConcordancia)}`;
        }

        if (regexDespedida.test(inputLower) && typeof dbConversas !== 'undefined' && dbConversas.resposta_despedida) {
            let frase = dbConversas.resposta_despedida[Math.floor(Math.random() * dbConversas.resposta_despedida.length)];
            return this.substituirVariaveis(frase);
        }

        if (regexSaudacao.test(inputLower) && typeof dbConversas !== 'undefined' && dbConversas.resposta_saudacao) {
            let frase = dbConversas.resposta_saudacao[Math.floor(Math.random() * dbConversas.resposta_saudacao.length)];
            return this.substituirVariaveis(frase);
        }

        if (this.assuntoAtual && Math.random() > 0.4 && this.memoriaLongoPrazo.length > 0) {
            const lembranca = this.memoriaLongoPrazo[Math.floor(Math.random() * this.memoriaLongoPrazo.length)];
            return `Pior que falando de ${this.assuntoAtual}... lembrei do que falaram mais cedo: "${lembranca}"`;
        }

        let frasesReacao = ["Pode crer.", "Exatamente.", "Fato.", "Verdade mano."];
        if (typeof dbConversas !== 'undefined') {
             frasesReacao = dbConversas.falar_com_usuario || dbConversas.concordancia || frasesReacao;
        }
        let fraseBase = frasesReacao[Math.floor(Math.random() * frasesReacao.length)];
        return this.substituirVariaveis(fraseBase);
    }

    gerarMensagemAutonoma() {
        const bot = this.obterBotAleatorio();
        if (!bot || typeof dbConversas === "undefined") return { texto: "..." };

        // Hype Flood 
        if (this.nivelDeHype >= 4 && Math.random() < 0.4 && !this.votacao.ativa) {
            const emotesHype = ["🔥🔥🔥", "🚀🚀🚀", "😍😍", "🎶🎶🎶", "pqp mt bom 🔥", "AAAAAAAA", "slc 🤯"];
            return { bot, texto: emotesHype[Math.floor(Math.random() * emotesHype.length)] };
        }

        // Bots votando autonomamente
        if (this.votacao.ativa) {
            if (!this.votacao.votantes.has(bot.nome)) {
                const votouSim = Math.random() > 0.3; 
                let fraseVoto = votouSim 
                    ? dbConversas.voto_sim[Math.floor(Math.random() * dbConversas.voto_sim.length)]
                    : dbConversas.voto_nao[Math.floor(Math.random() * dbConversas.voto_nao.length)];
                
                votouSim ? this.votacao.sim++ : this.votacao.nao++;
                this.votacao.votantes.add(bot.nome);
                
                return { bot, texto: this.aplicarVariabilidadeHumana(fraseVoto, bot.personalidade) };
            }
            return { texto: "..." }; 
        }

        let categoria = "iniciar_assunto";
        let texto = "";
        let infoMusica = "";

        const tempoInativoUsuario = Date.now() - this.ultimaInteracaoUsuario;
        const botsNaMemoria = this.memoriaCurtoPrazo.filter(m => m.autor !== this.nomeUsuario && m.autor !== bot.nome && m.autor !== "Sistema ⚙️" && m.autor !== "Camilla 🎧");
        
        // CORREÇÃO: Probabilidades calculadas de forma dinâmica e independente para evitar falhas de lógica
        if (tempoInativoUsuario > 60000 && this.nomeUsuario !== "" && Math.random() < 0.20) {
            const puxaAssunto = [
                `@${this.nomeUsuario} tá muito quieto, foi dormir?`,
                `Alguém viu o @${this.nomeUsuario}?`,
                `@${this.nomeUsuario} curte esse tipo de som?`,
                `Manda um alô aí @${this.nomeUsuario}!`
            ];
            texto = puxaAssunto[Math.floor(Math.random() * puxaAssunto.length)];
            categoria = "interacao_humano";
        }
        else if (botsNaMemoria.length > 0 && dbConversas.concordancia && Math.random() < 0.35) {
            const ultimaMsg = botsNaMemoria[botsNaMemoria.length - 1];
            categoria = "interacao_bot";
            
            if (bot.tipo === "reclamao") {
                const polemicas = ["cês viajam demais.", "eu acho isso mó chatice.", "tá, mas e daí?", "que assunto merda kkk"];
                texto = `@${ultimaMsg.autor} ${polemicas[Math.floor(Math.random() * polemicas.length)]}`;
            } else {
                let fraseConcordancia = dbConversas.concordancia[Math.floor(Math.random() * dbConversas.concordancia.length)];
                texto = `@${ultimaMsg.autor} ${fraseConcordancia}`;
            }
        } 
        else if (window.musicaAtualTocando && Math.random() < 0.35) {
            categoria = "comentar_musica";
            infoMusica = window.musicaAtualTocando;
            this.assuntoAtual = "música"; 
        } 
        else if (window.listaDeMusicasGlobal && window.listaDeMusicasGlobal.length > 0 && Math.random() < 0.20) {
            categoria = "pedir_musica";
            infoMusica = window.listaDeMusicasGlobal[Math.floor(Math.random() * window.listaDeMusicasGlobal.length)];
            this.registrarPedido(infoMusica);
        } 
        else if (Math.random() < 0.25) {
            const hora = new Date().getHours();
            categoria = "comentario_tempo";
            if (hora >= 0 && hora < 5) texto = "Música na madrugada bate diferente, né?";
            else if (hora >= 5 && hora < 12) texto = "Bom dia pra quem já tá na luta ouvindo som.";
            else if (hora >= 12 && hora < 18) texto = "Tarde boa pra deixar o rádio tocando de fundo.";
            else texto = "Boa noite chat, qual a boa de hoje?";
        }
        else if (this.memoriaLongoPrazo.length > 3 && Math.random() < 0.30) {
            categoria = "aprendizado";
        }

        // Formatação final do texto se ele foi gerado a partir do banco de dados (dbConversas)
        if (categoria !== "interacao_bot" && categoria !== "interacao_humano" && categoria !== "comentario_tempo") {
            if (!dbConversas[categoria]) categoria = "iniciar_assunto"; 
            
            // Proteção extra caso iniciar_assunto tbm não exista
            if (dbConversas[categoria]) {
                const lista = dbConversas[categoria];
                let fraseBase = lista[Math.floor(Math.random() * lista.length)];
                texto = this.substituirVariaveis(fraseBase, infoMusica);
                
                const abertura = bot.personalidade.aberturas[Math.floor(Math.random() * bot.personalidade.aberturas.length)];
                const fechamento = bot.personalidade.fechamentos[Math.floor(Math.random() * bot.personalidade.fechamentos.length)];
                const hesitacao = bot.personalidade.hesitacao[Math.floor(Math.random() * bot.personalidade.hesitacao.length)];
                
                texto = `${abertura}${hesitacao} ${texto} ${fechamento}`.trim();
            } else {
                texto = "Mó brisa isso aí kkkk"; // Fallback absoluto
            }
        }

        if (Math.random() < bot.personalidade.chanceCaps) texto = texto.toUpperCase();
        texto = this.aplicarVariabilidadeHumana(texto, bot.personalidade); 
        
        this.atualizarContexto(texto, bot.nome); 
        return { bot, texto: texto };
    }

    substituirVariaveis(texto, infoMusica = "") {
        if (!texto) return "";
        let txt = texto.replace(/{USER}/g, this.nomeUsuario || "galera");
        
        if (txt.includes('{MUSICA}') && infoMusica !== "") {
            let nomeLimpo = infoMusica.replace(".mp3", "").replace(".wav", "");
            txt = txt.replace(/{MUSICA}/g, nomeLimpo);
        }
        if (txt.includes('{MEMORIA}') && this.memoriaLongoPrazo.length > 0) {
            const indice = Math.floor(Math.random() * this.memoriaLongoPrazo.length);
            txt = txt.replace(/{MEMORIA}/g, this.memoriaLongoPrazo[indice]);
        }
        return txt;
    }

    aplicarVariabilidadeHumana(texto, personalidade) {
        if (!texto) return "";
        let txtFinal = texto;
        
        // Retira pontuação (Abaixo-assinado contra o ponto final formal)
        if (Math.random() < personalidade.chanceSemPontuacao) {
            txtFinal = txtFinal.replace(/[.!?](?=\s|$)/g, ""); 
            txtFinal = txtFinal.toLowerCase(); 
        }
        
        // Simula pensar no meio da frase com reticências
        if (Math.random() > 0.8 && txtFinal.split(" ").length > 4 && !txtFinal.includes("...")) {
            const palavras = txtFinal.split(" ");
            const meio = Math.floor(palavras.length / 2);
            palavras[meio] = palavras[meio] + "...";
            txtFinal = palavras.join(" ");
        }

        // Variação do "k" orgânico
        if (txtFinal.includes("kk")) {
            const qtdK = Math.floor(Math.random() * 6) + 2; 
            txtFinal = txtFinal.replace(/k{2,}/g, 'k'.repeat(qtdK));
        }

        // Erro de teclado orgânico (agora focado e corrigido, realmente substitui o espaço por uma letra adjacente no teclado)
        if (Math.random() > 0.85 && txtFinal.length > 12 && !txtFinal.includes('@')) {
            const espacos = [];
            for (let i = 2; i < txtFinal.length - 2; i++) {
                if (txtFinal[i] === " ") espacos.push(i);
            }
            if (espacos.length > 0) {
                const index = espacos[Math.floor(Math.random() * espacos.length)];
                const erroComum = ['c', 'v', 'b', 'n', 'm'];
                txtFinal = txtFinal.substring(0, index) + erroComum[Math.floor(Math.random() * erroComum.length)] + txtFinal.substring(index + 1);
            }
        }
        
        const girias = ["", "", "", " né", " mano", " véi", " rs", " lol"];
        return txtFinal + girias[Math.floor(Math.random() * girias.length)];
    }

    iniciarLoopAutonomo() {
        if (this.loopRodando) return;
        this.loopRodando = true;
        
        const loop = () => {
            let delay;

            if (this.votacao.ativa) {
                delay = Math.floor(Math.random() * 1500) + 500;
            } else if (this.nivelDeHype > 2) {
                delay = Math.floor(Math.random() * 3500) + 2000;
            } else {
                delay = Math.floor(Math.random() * 5000) + 4000;
            }

            setTimeout(() => {
                const acao = this.gerarMensagemAutonoma();
                
                if(typeof window.adicionarMensagemUI === "function" && acao.texto !== "...") {
                    window.adicionarMensagemUI(acao.bot.nome, acao.texto, acao.bot.tema);
                }
                
                if (Math.random() < 0.20 && !this.votacao.ativa) {
                    setTimeout(loop, 800 + Math.random() * 1000);
                } else {
                    loop();
                }
            }, delay);
        };
        loop();
    }
}
// Instancia o Cérebro
const cerebro = new MotorAutonomo();