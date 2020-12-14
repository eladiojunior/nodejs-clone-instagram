var express = require('express');
var bodyparser = require('body-parser');
var multiparty = require('connect-multiparty');
var expressvalidator = require('express-validator');
var fs = require("fs");

var app = express();

//Configurar o body parser
app.use(bodyparser.urlencoded({ extended:true }));
app.use(bodyparser.json());
app.use(expressvalidator());
app.use(multiparty());

//Middeware para o preflight (segurança) da requisição (PUT e DELETE).
app.use(function (req, res, next){
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8081");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

var port = process.env.PORT || 8082;
app.listen(port, function () {
    console.log("Servidor API - Porta " + port + ".");
});

//Carregar MongoSB;
global.db = require('./db');

//Criar um rota para API
//URI + VERBO HTTP

function retornoErroApi(msgErro) {
    return { result: false, erro: msgErro };
}
function retornoSucessoApi(dataResult) {
    return { result: true, data: dataResult };
}

//GET: Recuperar todos os registros.
app.get('/api', function (req, res) {
    global.db.listarTodasPostagens(function (err, result) {
        if(err)
            return res.status(500).json(retornoErroApi("Erro ao listar todas as postagens."));
        res.status(200).json(retornoSucessoApi(result));
    });
});

//GET: Recuperar imagem da postagem.
app.get('/imagens/:id', function (req, res) {
    var id_postagem = req.params.id;
    if (id_postagem===undefined || id_postagem === "") {
        return res.status(404).json("Identificador da postagem não informado.");
    }
    global.db.obterPostagemPorId(id_postagem, function (err, result) {
        if(err) {
            return res.status(404).json("Identificador da postagem não informado.");
        }
        var path_imagem = result[0].url_imagem;
        res.writeHead(200, {'content-type':'image/jpg'});
        if (path_imagem === undefined || path_imagem === "") {
            //Recuperar imagem padrão... de não encontrada.
            fs.readFile('./api/imagens/not-found.png', function (err, content) {
                if (err) {
                    return res.status(400).json(err);
                }
                res.end(content);
            });
        } else {
            fs.access(path_imagem, function (err) {
                if (err) {
                    fs.readFile('./api/imagens/not-found.png', function (err, content) {
                        if (err) {
                            return res.status(400).json(err);
                        }
                        res.end(content);
                    });
                } else {
                    fs.readFile(path_imagem, function (err, content) {
                        if (err) {
                            return res.status(400).json(err);
                        }
                        res.end(content);
                    });
                }
            });
        }
    });

});

//GET: Recuperar uma postagem pelo ID.
app.get('/api/:id', function (req, res) {
    var id = req.params.id;
    global.db.obterPostagemPorId(id, function (err, result) {
        if(err)
            return res.status(500).json(retornoErroApi("Erro ao obter uma postagem."));
        var statusCode = 200;
        if (result.length == 0) statusCode = 404;
        res.status(statusCode).json(retornoSucessoApi(result));
    });
});

//POST: Inclusão uma nova postagem.
app.post('/api', function (req, res) {
    //Verificar erros no Body...
    req.assert('titulo', 'Título da postagem não pode ser vazio.').notEmpty();
    var erros = req.validationErrors();
    if (erros) {
        return res.status(400).json(retornoErroApi(erros));
    }
    //Verificar se tem arquivo (files) ou atributo URL_IMAGEM na request.
    if ((req.files===undefined || req.files.arquivo===undefined) && (req.body.url_imagem===undefined || req.body.url_imagem=="")) {
        return res.status(400).json(retornoErroApi("Obrigatório informar um arquivo para upload ou uma URL da imagem para postagem."));
    }
    if (req.body.url_imagem!==undefined && req.body.url_imagem!="") {
        var dados = req.body;
        global.db.registrarPostagem(dados, function (err, result) {
            if(err)
                return res.status(500).json(retornoErroApi("Erro ao registrar postagem."));
            var id = result.ops[0]._id;
            res.status(200).json(retornoSucessoApi("Postagem [" + id + "] registrada com sucesso."));
        });
        return;
    }

    upload_fileserver(req.files, function (err, url_file) {
        if (err) {
            res.status(500).json(retornoErroApi("Erro ao realizar upload do arquivo da postagem."))
            return;
        }
        //Carregar o caminho do arquivo no file server;
        req.body.url_imagem = url_file;
        var dados = req.body;
        global.db.registrarPostagem(dados, function (err, result) {
            if(err)
                return res.status(500).json(retornoErroApi("Erro ao registrar postagem."));
            var id = result.ops[0]._id;
            res.status(200).json(retornoSucessoApi("Postagem [" + id + "] registrada com sucesso."));
        });
    });

});

//PUT: Atualizar postagem pelo ID e informando um comentário no BODY.
app.put('/api/:id', function (req, res) {
    var id = req.params.id;

    if (Object.keys(req.body).length === 0) {
        return res.status(400).json(retornoErroApi("Nenhuma informação para ser atualizada."));
    }

    var comentario = req.body.comentario;
    if (comentario === undefined || comentario == "") {
        return res.status(400).json(retornoErroApi("Nenhuma comentário informado para atualizar a postagem."));
    }

    global.db.atualizarPostagemPorId(id, comentario, function (err, result) {
        if(err) {
            return res.status(500).json(retornoErroApi("Erro ao comentar postagem ID [" + id + "]."));
        }
        var count = result.matchedCount;
        if (count == 0) {
            res.status(404).json(retornoSucessoApi("Nenhuma alteração foi realizada, identificador [" + id + "] não encontrado."));
        } else {
            res.status(200).json(retornoSucessoApi("Comentário postado com sucesso."));
        }
    });
});

//DELETE: Remover comentário de postagem pelo ID.
app.delete('/api/:id', function (req, res) {
    var id = req.params.id;
    global.db.removerComentarioPostagemPorId(id, function (err, result) {
        if(err) {
            return res.status(500).json(retornoErroApi("Erro ao remover comentário ID [" + id + "] da postagem."));
        }
        var count = result.deletedCount;
        if (count == 0) {
            res.status(404).json(retornoSucessoApi("Não foi possível remover, identificador [" + id + "] não encontrado."));
        } else {
            res.status(200).json(retornoSucessoApi("Comentário [" + id + "] removido com sucesso."));
        }
    });
});

/**
 * Realiza a verificação do arquivo enviado e move para o file server.
 * @param files
 */
function upload_fileserver(files, callback) {
    var date = new Date();
    var id_file = date.getTime();
    var path_origem = files.arquivo.path;
    var path_destino = './api/fileserver/' + id_file + "_" + files.arquivo.originalFilename;
    fs.copyFile(path_origem, path_destino, function (err) {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, path_destino);
    });
}