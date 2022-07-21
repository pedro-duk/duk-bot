/**
 * Bibliotecas
 */

const fs = require('fs');
const {	MongoClient } = require('mongodb');
const mdbconfig = require('../config/mongoconfig.json');
const funcgerais = require('./funcgerais.js')

/**
 * Variáveis locais
 */

const strdb 		= mdbconfig.strdb;
const struserinfo 	= mdbconfig.struserinfo;
const uri 			= mdbconfig.uri;
const tempoClose 	= mdbconfig.tempoClose;
var controlaClose 	= undefined;
var dbclient 		= undefined;

/**
 * Funções Exportadas
 */

// Checa se conexão ao DB está aberta, e abre se não estiver
async function checkConnection() {
	if (controlaClose != undefined) {
		//console.log("Reiniciando tempo de acesso ao DB...");
		clearTimeout(controlaClose);
	}

	controlaClose = setTimeout(closeConnection, tempoClose);

	if (dbclient == undefined || !dbclient.isConnected()) {
		await makeConnection();
	}
}

// Criação ou atualização de usuários. Se retornar 0, criou usuário. Se retornar 1, atualizou.
// 	Se retornar -1, deu erro.
async function criaAtualizaUser(idx, tagx, dianiver, mesniver, anoniver) {
	var aux = await procuraUser(idx);
	if (aux == undefined) { // Não existe, deve ser criado!
		const result = await createListing(dbclient, struserinfo, {
			_id: idx,
			tagnome: tagx,
			dianiver: dianiver,
			mesniver: mesniver,
			anoniver: anoniver
		});

		if(result == undefined) {// Erro na inserção!
			return -1;
		}

		return 0;
	}

	else {
		const result = await updateListingById(dbclient, struserinfo, idx, { // Já existia, deve ser updatado!
			_id: idx,
			tagnome: tagx,
			dianiver: dianiver,
			mesniver: mesniver,
			anoniver: anoniver
		})

		if(result == undefined) {// Erro na inserção!
			return -1;
		}
	
		return 1;
	}
}

// Função para checar se existe um aniversário no dia, e imprimir uma mensagem caso exista.
async function checaAniversario(client, path, canal) {
	const date = new Date();
	var diaatual = date.getDate();
	var mesatual = date.getMonth() + 1;
	var anoatual = date.getFullYear();

	const cursorUsuarios = await procuraNiverUser(diaatual, mesatual);

	if (await cursorUsuarios.count() != 0) {
		// Enviando mensagem de feliz aniversário!
		var canalfelizniver = await client.channels.fetch(canal);

		//funcgerais.enviaVideoAleatorioPasta(client, path, canal);

		var mensagemEnviada = "**HOJE TEM ANIVERSARIANTEEEE!!** \n";

		await cursorUsuarios.forEach(function(usuario) {
			mensagemEnviada += '<@' + usuario._id + '>';

			if(usuario.anoniver != -1) {
				var idade = anoatual - usuario.anoniver;

				mensagemEnviada += ", comemorando " + idade.toString() + " anos!";
			}
			mensagemEnviada += "\n";
		});

		canalfelizniver.send(mensagemEnviada);
	}
}

// Procura se existe usuário com aniversário no dia dado
async function procuraNiverUser(dianiver, mesniver) {
	checkConnection();

	const result = await dbclient.db(strdb).collection(struserinfo)
		.find({
			dianiver: dianiver,
			mesniver: mesniver
		});

	return result;
}

// Procura se existe usuário com ID dado
async function procuraUser(id) {
	return findOneListingById(dbclient, struserinfo, id);
}


exports.checkConnection = checkConnection;
exports.criaAtualizaUser = criaAtualizaUser;
exports.procuraNiverUser = procuraNiverUser;
exports.procuraUser = procuraUser;
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
	checkConnection();

	const result = await client.db(strdb).collection(colecao).insertOne(newListing);

	if (result) {
		return result;
	} else {
		return undefined;
	}
}

// Procura uma lista no DB
async function findOneListingById(client, colecao, idsearch) {
	checkConnection();

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
	checkConnection();

	result = await client.db(strdb).collection(colecao)
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

