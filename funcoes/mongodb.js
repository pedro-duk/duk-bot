/**
 * Bibliotecas
 */

const { Console } = require('console');
const fs = require('fs');
const {	MongoClient } = require('mongodb');
const mdbconfig = require('../config/mongoconfig.json');
const funcgerais = require('./funcgerais.js')

/**
 * Variáveis locais
 */

const strdb 			= mdbconfig.strdb;
const strusersinfo 		= mdbconfig.strusersinfo;
const strserversinfo 	= mdbconfig.strserversinfo;
const uri 				= mdbconfig.uri;
const tempoClose 		= mdbconfig.tempoClose;
var controlaClose 		= undefined;
var dbclient 			= undefined;

/**
 * Funções Exportadas
 */

// Checa se conexão ao DB está aberta, e abre se não estiver
async function checkConnection() {
	if (controlaClose != undefined) {
		clearTimeout(controlaClose);
	}

	controlaClose = setTimeout(closeConnection, tempoClose);

	if (dbclient == undefined || !dbclient.isConnected()) {
		await makeConnection();
	}
}

// Procura se existe usuário com ID dado
async function procuraUser(id) {
	return findOneListingById(dbclient, strusersinfo, id);
}

// Procura se existe server com ID dado
async function procuraServer(id) {
	return findOneListingById(dbclient, strserversinfo, id);
}

// Procura se existe um usuário associado a um server
async function procuraUserEmServer(iduser, idserver) {
	var aux = await procuraServer(idserver);
	var aux2 = aux.users.includes(iduser);
	return aux2;
}

// Adiciona ou atualiza server no DB.
async function adicionaAtualizaServer(idserver, canal_niver) {
	// Checa se já existe canal
	const resultExiste = await procuraServer(idserver);

	if(resultExiste == undefined) { // Não existe server
		const result = await createListing(dbclient, strserversinfo, {
			_id: idserver,
			users: [],
			canal_niver: canal_niver
		});
	
		if(result == undefined) { // Erro na inserção!
			Console.log("Erro na inserção de um servidor em serversinfo.");
		}
	}

	else { // Já existia server
		const result = await updateListingById(dbclient, strserversinfo, idserver, {
			_id: idserver,
			canal_niver: canal_niver
		});

		if(result == undefined) { // Erro na atualização
			Console.log("Erro na atualização de um servidor em serversinfo.");
		}
	}
}

// Criação ou atualização de usuários.
//	Valores de retorno:
//		0: usuário não existia, foi criado e adicionado.
//		1: usuário já existia, foi atualizado.
//		-1: server não existe. Deve ser criado antes.
//		-2: erro na inserção do usuário.
async function criaAtualizaUser(idx, tagx, idserver, dianiver, mesniver, anoniver) {
	await checkConnection();
	/** 
	 * Primeiro, adicionar usuários em serverinfo
	 */

	var result = await procuraServer(idserver);

	if(result == undefined) { // Server não existe!
		return -1;
	}

	// Server existe, agora devemos inserir usuário na lista de usuários.
	await adicionaUser(idx, idserver);
	
	/** 
	 * Agora, adicionar usuários em userinfo
	 */
	aux = await procuraUser(idx);
	if (aux == undefined) { // Não existe, deve ser criado!
		const result = await createListing(dbclient, strusersinfo, {
			_id: idx,
			tagnome: tagx,
			dianiver: dianiver,
			mesniver: mesniver,
			anoniver: anoniver
		});

		if(result == undefined) { // Erro na inserção!
			return -2;
		}

		return 0;
	}

	else {
		const result = await updateListingById(dbclient, strusersinfo, idx, { // Já existia, deve ser updatado!
			_id: idx,
			tagnome: tagx,
			dianiver: dianiver,
			mesniver: mesniver,
			anoniver: anoniver
		})

		if(result == undefined) { // Erro na inserção!
			return -2;
		}
	
		return 1;
	}
}

// Adiciona usuário em um server. Presume-se que idserver existe.
async function adicionaUser(iduser, idserver) {
	await checkConnection();

	if(!(await procuraUserEmServer(iduser, idserver))) { // Usuário ainda não adicionado
		// Inserir no array users!
		await dbclient.db(strdb).collection(strserversinfo).updateOne(
			{ _id: idserver },
			{ $push: { users: iduser } }
		);
	}
}

// Função para checar se existe um aniversário no dia, e imprimir uma mensagem caso exista.
async function checaAniversario(discordclient) {
	await checkConnection();

	const date = new Date();
	var diaatual = date.getDate();
	var mesatual = date.getMonth() + 1;
	var anoatual = date.getFullYear();

	// Coleção de todos os usuários fazendo aniversário no dia atual
	const cursorUsuarios = await procuraNiverUser(diaatual, mesatual);

	if (await cursorUsuarios.count() != 0) { // Alguém faz aniversário hoje!
		// Coleção de todos os servidores
		const cursorServers = await dbclient.db(strdb).collection(strserversinfo).find();

		// Para cada servidor...
		await cursorServers.forEach(async function(server) {

			var alguemFazNiver = false;
			var mensagemEnviada = "**HOJE TEM ANIVERSARIANTEEEE!!** \n";

			// Para cada usuário que faz niver...
			await cursorUsuarios.forEach(function(usuario) {

				// Caso usuário pertença ao servidor, concatenar em mensagemEnviada!
				if(procuraUserEmServer(usuario._id, server._id)) { // Usuário pertence ao server!
					// Concatenando em mensagemEnviada
					mensagemEnviada += '<@' + usuario._id + '>';

					if(usuario.anoniver != -1) {
						var idade = anoatual - usuario.anoniver;

						mensagemEnviada += ", comemorando " + idade.toString() + " anos!";
					}
					mensagemEnviada += "\n";

					alguemFazNiver = true;
				}
			});

			// Enviar mensagemEnviada no canal de niver do servidor.
			if (alguemFazNiver) {
				var canalfelizniver = await discordclient.channels.fetch(server.canal_niver);

				canalfelizniver.send(mensagemEnviada);
			}
		});
	}
}

// Procura se existe usuário com aniversário no dia dado
async function procuraNiverUser(dianiver, mesniver) {
	await checkConnection();

	const result = await dbclient.db(strdb).collection(strusersinfo)
		.find({
			dianiver: dianiver,
			mesniver: mesniver
		});

	return result;
}


exports.checkConnection = checkConnection;
exports.adicionaAtualizaServer = adicionaAtualizaServer;
exports.criaAtualizaUser = criaAtualizaUser;
exports.checaAniversario = checaAniversario;


/**
 * Funções privadas
 */

// Tenta fazer a conexão ao DB
async function makeConnection() {
	dbclient = new MongoClient(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	});

	try {
		await dbclient.connect();
		console.log("Conexão ao DB aberta.");
		controlaClose = setTimeout(closeConnection, tempoClose);
	} catch (e) {
		console.error(e);
	}
}

// Fecha a conexão
function closeConnection() {
	console.log("Conexão ao DB fechada.");
	dbclient.close();
}


// Cria uma lista no DB
async function createListing(client, colecao, newListing) {
	await checkConnection();

	const result = await client.db(strdb).collection(colecao).insertOne(newListing);

	if (result) {
		return result;
	} else {
		return undefined;
	}
}

// Procura uma lista no DB
async function findOneListingById(client, colecao, idsearch) {
	await checkConnection();

	const result = await client.db(strdb).collection(colecao)
		.findOne({
			_id: idsearch
		});

	if (result) {
		return result;
	} else {
		return undefined;
	}
}

// Atualiza uma lista no DB
async function updateListingById(client, colecao, idOfListing, updatedListing) {
	await checkConnection();

	const result = await client.db(strdb).collection(colecao)
		.updateOne({
			_id: idOfListing
		}, {
			$set: updatedListing
		});

	if (result) {
		return result;
	} else {
		return undefined;
	}
}

