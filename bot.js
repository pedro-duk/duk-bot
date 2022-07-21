
/**
 * Imports
 */

// Bibliotecas padrão
const Discord = require('discord.js');
const fs = require('fs');

// Bibliotecas locais
const funcgerais = require('./funcoes/funcgerais.js')
const mdb = require('./funcoes/mongodb.js');

// JSONs de configuração
const botconfig = require('./config/botconfig.json');
const canais = require('./config/canais.json');

/**
 * Definições
 */

// Variáveis
var corazul = '#3366ff';
var corvermelha = '#ff3300';
var corbranca = '#ffffff';

// Opções para detecção de mídia alta
var peakmidia = '-3';
var average = '-7';
var windowmidia = '50';

opcoesmidiaalta = [];
opcoesmidiaalta.push('-average', average, '-peak', peakmidia, '-window', windowmidia, '--boolean-output', '--disable-sudden', '--disable-average');

// Mídia
const pathmimir = "./imagens/mimir/";
const path3manha = './imagens/outros/3damanha.mp4';
const pathGifsNiver = "./imagens/felizniver/";

// Prefixo
let prefix = botconfig.prefix;

// Dicionários
/** Comandos do chat geral */
const comandos = {
	'owo': ": Owoifa uma mensagem.",
	'niver': ": Registra o seu aniversário. O ano de nascimento é opcional. Exemplo: d.niver 15/09/1997 ou d.niver 15/09"
};

/** Comandos do chat privado */
const comandosprivado = {
	'conf': ": Use para confessar algo anonimamente no servidor. Por exemplo: conf Eu sou um pato na vida real.",
};

/** Declaração Cliente */ 
const client = new Discord.Client();

/**
 * Eventos
 */

// Cliente se conectou ao servidor
client.on('ready', async () => {
	console.log(`Logado como ${client.user.tag}!`);

	await mdb.checkConnection();

	client.user.setPresence({
		activity: {
			name: prefix + "help para comandos"
		},
		status: 'available'
	})
		.catch(console.error);

	/* Agendando o vídeo de 3 da manhã. Hora deve ser dada em GMT. */
	funcgerais.agendaFuncao(6, 0, funcgerais.enviaVideo, client, path3manha, canais.geral);

	/** Agendando para pesquisar aniversários às 9 da manhã. */
	funcgerais.agendaFuncao(12, 0, mdb.checaAniversario, client, pathGifsNiver, canais.geral);

	/** Log enviado no canal de logs, indicando que o bot foi inicializado corretamente. */
	funcgerais.enviaLog(client, canais.logs, "Bot inicializado!", "", corazul);
});

// Usuário enviou uma mensagem
client.on('message', async message => {
	// Não checa mensagens de outros bots
	if (message.author.bot) return;

	// Tratamento de Attachments
	if (message.attachments.size > 0) {
		message.attachments.forEach((v, k) => {
			if (funcgerais.checaAlto(v.url)) {
				message.channel.send("**Alerta de mídia alta: **" + v.url.substring(v.url.lastIndexOf('/') + 1, v.url.length));
			}
		})
	}

	// Tratamento de links
	var re = /\bhttps?:\/\/\S+/gi;
	var lista = message.content.match(re);
	if (lista != null) {
		lista.forEach(v => {
			if (funcgerais.checaAlto(v)) {
				message.channel.send("**Alerta de mídia alta: **" + v.substring(v.lastIndexOf('/') + 1, v.length));
			}
		})
	}

	// Arruma mensagem
	let messageArray = message.content.toLowerCase().trim();
	messageArray = messageArray.replace(/  +/g, ' ');
	messageArray = messageArray.split(" ");
	let cmd = messageArray[0];

	messageArray.shift(); // Remove primeiro elemento		

	var idautor = message.author.id;
	var strmention = '<@' + idautor + '>';

	//Mensagens DM
	if (message.channel.type == 'dm') {
		// Help
		if (cmd === 'help') {
			var strnova = ", estes são meus comandos.\n"

			for (var key in comandosprivado) {
				var value = comandosprivado[key];
				strnova = strnova.concat('> ', key, value, '\n');
			}

			strnova = strmention + strnova;

			return message.channel.send(strnova);
		}

		// Confessar: Envia uma mensagem anônima no canal confessionário.
		else if (cmd === 'conf') {
			if (messageArray.length == 0) {
				return message.channel.send('Argumentos inválidos, digite conf junto com sua confissão. Por exemplo: conf Eu sou um cachorro na vida real');
			}

			else {
				strconfessar = message.content.substring(message.content.indexOf(' '), message.content.length);

				var canalconfissoes = await client.channels.fetch(canais.confessionario);

				const embed = new Discord.MessageEmbed()
					.setColor(corbranca)
					.setDescription(strconfessar);

				canalconfissoes.send(embed);

				return message.channel.send('Confissão enviada no canal de confissões.');
			}
		}

		// Mensagem padrão
		else {
			return message.channel.send("Não entendi, fale help para obter uma lista de comandos.");
		}
	};

	/**
	 * COMANDOS COM PREFIXO
	 */

	// HELP
	if (cmd === `${prefix}help`) {
		var strnova = ", estes são meus comandos.\n"

		for (var key in comandos) {
			var value = comandos[key];
			strnova = strnova.concat('> ', prefix, key, value, '\n');
		}

		strnova = strmention + strnova;

		return message.channel.send(strnova);
	}

	// owoifyier
	if (cmd === `${prefix}owo`) {
		var strnova = '';

		if (messageArray.length == 0) {
			await message.channel.messages.fetch({ limit: 2 }).then(messages => {
				strnova = messages.last().content;

			})
				.catch(console.error);
		}

		else {
			strnova = message.content.substring(prefix.length + 4, message.content.length);
		}

		strnova = strnova + " !";
		return message.channel.send(funcgerais.owoify(strnova, 'uwu'));
	}

	// NIVER
	if (cmd === `${prefix}niver`) {
		msgerro = 'Argumentos inválidos. Digite ' + prefix + 'niver DD/MM/AAAA. Ex.: ' + prefix + 'niver 15/09/1997';

		if (messageArray.length != 1) {
			return message.channel.send(msgerro);
		}

		dataarray = messageArray[0].split('/');
		if (dataarray.length != 2 && dataarray.length != 3) {
			return message.channel.send(msgerro);
		}

		dia = parseInt(dataarray[0]);
		mes = parseInt(dataarray[1]);

		if (dataarray.length == 3) {
			ano = parseInt(dataarray[2]);
		}

		else {
			ano = -1;
		}

		if (!funcgerais.checaValidadeData(dia, mes, ano)) {
			return message.channel.send('Data inválida.');
		}

		await mdb.checkConnection();

		var aux = await mdb.criaAtualizaUser(idautor, message.member.user.tag.toString(), dia, mes, ano);
		
		if(aux == 0) { // Não existia usuário antes
			var msg = 'Aniversário definido para ' + dia + "/" + mes;
			if (ano != -1) {
				msg += "/" + ano;
			}
			msg += "!";

			return message.channel.send(msg);
		}

		else if (aux == 1) { // Já existia usuário antes
			var msg = 'Aniversário atualizado para ' + dia + "/" + mes;
			if (ano != -1) {
				msg += "/" + ano;
			}
			msg += "!";

			return message.channel.send(msg);
		}

		else { // Deu erro na inserção
			return message.channel.send('Erro na inserção! Por favor contate o duk.');
		}
	}

	/**
	 * COMANDOS DE FALA
	 */

	// MIMIR 
	else if (cmd == 'mimir' && messageArray.length == 0) {
		funcgerais.enviaVideoAleatorioPasta(client, pathmimir, message.channel.id);
	}
});

// Inicializar bot
client.login(botconfig.token);