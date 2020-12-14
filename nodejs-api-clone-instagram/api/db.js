var mongodb = require('mongodb');
var objectId = require('mongodb').ObjectId;

var MONGO_DB = process.env.MONGO_DB || "db_instagram";
var MONGO_HOSTNAME = process.env.MONGO_HOSTNAME || "192.168.0.18";
var MONGO_PORT = process.env.MONGO_PORT || "27017";
var MONGO_USERNAME = process.env.MONGO_USERNAME || "root";
var MONGO_PASSWORD = process.env.MONGO_PASSWORD || "root123456";

var options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000,
    user: MONGO_USERNAME,
    password: MONGO_PASSWORD
};

const mongoClient = mongodb.MongoClient;
const urlConnectMongo = 'mongodb://'+MONGO_HOSTNAME+':'+MONGO_PORT+'/'+MONGO_DB+'?authSource=admin';
mongoClient.connect(urlConnectMongo, options)
    .then(conn => global.conn = conn.db(MONGO_DB))
    .catch(err => console.log(err))

/**
 * Lista todos as postagens.
 * @param callback
 */
function listarTodasPostagens(callback) {
    try {
        global.conn.collection("postagens").find({}).toArray(callback);
    } catch (err) {
        callback(err, {});
    }
}

/**
 * Recupera uma postagem pelo Identificador (ObjectID);
 * @param id - Identificador único da postagem.
 * @param callback
 */
function obterPostagemPorId(id, callback) {
    try {
        global.conn.collection("postagens").find(objectId(id)).toArray(callback);
    } catch (err) {
        callback(err, {});
    }
}

/**
 * Regista a postagem do usuário.
 * @param postagem - objeto com as informações da postagem.
 * @param callback
 */
function registrarPostagem(postagem, callback) {
    try {
        global.conn.collection("postagens").insertOne(postagem, {}, callback);
    } catch (err) {
        callback(err, {});
    }
}

/**
 * Atualiza as informações de uma postagem recuperada pelo ID.
 * @param id - identificador único da postagem.
 * @param comentario - comentario da postagem.
 * @param callback
 */
function atualizarPostagemPorId(id, comentario, callback) {
    try {
        global.conn.collection("postagens").updateOne(
            {_id: objectId(id)},
            {$push : {
                comentarios: {
                    id_comentario : new objectId(),
                    comentario : comentario,
                    datahora_comentario: new Date()
                }
            }}, {}, callback);
    } catch (err) {
        callback(err, {});
    }
}

/**
 * Remover um comentário de uma postagem pelo ID.
 * @param id - identificador único do comentário da postagem.
 * @param callback
 */
function removerComentarioPostagemPorId(id, callback) {
    try {
        global.conn.collection("postagens").updateOne(
            {},
            {$pull :
                {
                    comentarios: { id_comentario : objectId(id) }
                }
            }, {multi: true}, callback);
    } catch (err) {
        callback(err, {});
    }
}


module.exports = { obterPostagemPorId, listarTodasPostagens, registrarPostagem, atualizarPostagemPorId, removerComentarioPostagemPorId }