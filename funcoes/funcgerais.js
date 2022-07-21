// Bibliotecas padrão
const child_process = require('child_process');
const { Console } = require('console');
const fs = require('fs');
const Discord = require('discord.js');
const { off } = require('process');
const path = require('path');

// Executáveis usados
const pathLoudDetector = './../executaveis/loud_detector';

function owoify(str) {
	var replaces = {
		'pin': 'pwi',
		'bo': 'bwo',
		'cu': 'cwu',
		'mi': 'mwi',
		'da': 'dwa',
		'go': 'gwo',
		'r': 'ww',
		'mu': 'mwu'
	}

	var randoms = ['* wiggles *', '* nuzzles *', 'OwO ~~', 'X3', '* snuggles *', '\'UwU', ' ✧w✧', ' (⁄ʘ⁄ ⁄ ω⁄ ⁄ ʘ⁄)♡']

	var splitted = str.split(' ').map((item) => {
		var parsed = item;
		for (var i in replaces) {
			parsed = parsed.split(i).join(replaces[i]);
		}
		if (Math.random() > 0.8) {
			return parsed + ' ' + randoms[Math.ceil(Math.random() * (randoms.length - 1))];
		}
		return parsed
	});
	return splitted.join(' ');
}

// Checa se mídia é alta
function checaAlto(url) {
	
	/* Checa se o formato do arquivo é válido */
	var videoformat = url.substring(url.lastIndexOf('.') + 1, url.length);
	var acceptedformats = ['mp4', 'webm', 'ogg'];

	if (acceptedformats.includes(videoformat)) {
		var aux = ['-i', url];
		aux = aux.concat(opcoesmidiaalta);

		/* Criação de um processo filho chamando o executável loud_detector */
		var t1 = child_process.execFileSync(pathLoudDetector, aux).toString().slice(0, 1);

		/* loud_detector retorna 1 se considerou o vídeo alto, 0 se não */
		return t1 == '1' ? true : false;
	}

	else {
		return false;
	}
}

 /* Agenda uma chamada de função na hora especificada por time */
async function agendaFuncao(horas, minutos, funcaoChamada, client, path, canal) {
	/** Checando se horas e minutos são válidos */
	/** Checando se são inteiros */
	if(!Number.isInteger(horas) || !Number.isInteger(minutos)) {
		return;
	}

	/** Checando se estão no range válido */
	if(horas < 0 || horas >= 24 || minutos < 0 || minutos >= 60) {
		return;
	}

	var now = Date.now() % (24 * 60 * 60 * 1000);
	var tocar = horas * 60 * 60 * 1000 + minutos * 60 * 1000;

	var dif = tocar - now;

	while (dif < 0) {
		dif = dif + 24 * 60 * 60 * 1000;
	}

	// Quanto tempo falta até a primeira chamada de função
	const primeiraChamada = dif;

	/** Faz uma chamada inicial usando primeiraChamada, depois define que será chamada ciclicamente
	 * a cada 24 horas.
	 */
	setTimeout(function () {
		funcaoChamada(client, path, canal);
		setInterval(function () {
			funcaoChamada(client, path, canal);
		}, 24 * 60 * 60 * 1000);
	}, primeiraChamada);
}

/* Envia em "canal" um vídeo presente em "pathvid" */
async function enviaVideo(client, pathvid, canal) {

	/* TODO: e se canal for inválido? Checar possíveis erros. */
	var aux = await client.channels.fetch(canal);
	aux.send({
		files: [pathvid]
	});
}

/* Envia em "canal" um vídeo aleatório presente em "pathpastavid" */
async function enviaVideoAleatorioPasta(client, pathpastavid, canal) {
	var arquivos = fs.readdirSync(pathpastavid)
	var pathaux = arquivos[Math.floor(Math.random() * arquivos.length)]

	/* TODO: e se canal for inválido? Checar possíveis erros. */
	var aux = await client.channels.fetch(canal);
	aux.send({
		files: [pathpastavid + pathaux]
	});
}

/** Envia um log no canal dado */
async function enviaLog(client, canal, tit, msg, cor) {
	var canalpatolog = await client.channels.fetch(canal);

	const embed = new Discord.MessageEmbed()
		.setTitle(tit)
		.setDescription(msg)
		.setColor(cor);
	canalpatolog.send(embed);
}

/** Checa validade de datas. Não checa se ano é bissexto. */
function checaValidadeData(dia, mes, ano) {
	// Checando validade do dia e mes
    if (dia > 31 || dia < 1 || mes > 12 || mes < 1) {
        return false;
    }

	// Checando validade do ano
	var datahoje = new Date();

	if ((ano < 1 && ano != -1) || ano >= datahoje.getFullYear()) {
		return false;
	}

    aux = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (dia > aux[mes - 1]) {
        return false;
    }

    return true;
}

/** Exportar todas funções */
exports.owoify = owoify;
exports.checaAlto = checaAlto;
exports.agendaFuncao = agendaFuncao;
exports.enviaVideo = enviaVideo;
exports.enviaVideoAleatorioPasta = enviaVideoAleatorioPasta;
exports.enviaLog = enviaLog;
exports.checaValidadeData = checaValidadeData;