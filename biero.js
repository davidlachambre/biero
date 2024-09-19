//Initialisation des modules requis :
//----------------------------------------------
var express = require('express');
var mongoClient = require('mongodb').MongoClient;
var auth = require('basic-auth');
var ObjectId = require('mongodb').ObjectID;
var dataRequete = require('body-parser');
//----------------------------------------------

var app = express();//Initialisation du framework ExpressJS pour NodeJS.

var urlMongoDB = "mongodb://localhost:27017/biero";//Utilisation de la BD biero pour les requêtes.



//-----------------------------------------------------------------------------
//CODE POUR INSÉRER DES BIÈRES TESTS DANS LA BD :
//-----------------------------------------------------------------------------
/*
var incrementTest = 1;

app.route('/bd')
    .put(function (requete, reponse) {

        mongoClient.connect(urlMongoDB, function (err, db) {
            
            if (err) {
                reponse.status(500).send();
                throw err;
            }
            var date = new Date();
            db.collection('collectionBiere').insertOne({
                "description": "description test-" + incrementTest,
                "nom": "nom test-" + incrementTest,
                "brasserie": "brasserie test-" + incrementTest,
                "image": "image test-" + incrementTest,
                "date_ajout": date,
                "date_modif": date,
                "notes": [
                    {
                        "courriel": "test1@test-" + incrementTest + ".com",
                        "note": Math.floor((Math.random()*9)+1),
                        "date_ajout": date
                    },
                    {
                        "courriel": "test2@test-" + incrementTest + ".com",
                        "note": Math.floor((Math.random()*9)+1),
                        "date_ajout": date
                    },
                    {
                        "courriel": "test3@test-" + incrementTest + ".com",
                        "note": Math.floor((Math.random()*9)+1),
                        "date_ajout": date
                    }
                ],
                "commentaires": [
                    {
                        "courriel": "test1@test-" + incrementTest + ".com",
                        "commentaire": "Commentaire 1 test-" + incrementTest,
                        "date_ajout": date
                    },
                    {
                        "courriel": "test2@test-" + incrementTest + ".com",
                        "commentaire": "Commentaire 2 test-" + incrementTest,
                        "date_ajout": date
                    },
                    {
                        "courriel": "test3@test-" + incrementTest + ".com",
                        "commentaire": "Commentaire 3 test-" + incrementTest,
                        "date_ajout": date
                    }
                ]
            },
            function (err) {

                if (err) {
                    reponse.status(500).send();
                    throw err;
                }
                reponse.send("bière test-" + incrementTest + " insérée dans la bd !");
                console.log("bière test-" + incrementTest + " insérée dans la bd !");
                incrementTest++; 
            });
        });
    });
*/
//-----------------------------------------------------------------------------



app.use(dataRequete.json());//Décode le data reçu comme du JSON.

//Authentification pour les requêtes PUT / POST / DELETE.
var authBasic = function (requete, reponse, suivant) {
    var usager = auth(requete);
    var valide = false;
    if (usager && usager.name && usager.pass) {
        if (usager.name == 'biero' && usager.pass == 'biero') {
            valide = true;
        }
    } 
    if (valide) {
        suivant();//Passe au middleware suivant si authorisé.
    } else {
        reponse.status(401).send();//Erreur non-authorisé.
    }
};

//Si un ID de bière est donné, validation que cet ID est en string hex 24 avant de poursuivre.
app.use('/biere/:id' + "*", function (requete, reponse, suivant) {
    var id = requete.params.id;
    
    var regExpIdBiere = new RegExp("^[0-9a-fA-F]{24}$");//Reg ex string hex 24 valide.
    var validation = regExpIdBiere.exec(id);
    
    if (validation) {
        suivant();//Va pouvoir aller chercher si la route est trouvée.
    }
    else {
        reponse.status(400).send();//Erreur Bad Request.
    }
});


//Route /biere
app.route('/biere')
    //Requête GET
    .get(function (requete, reponse) {
    
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            db.collection('collectionBiere').find().toArray(function (err, data) {
                if (err) {
                    reponse.status(500).send();//Erreur interne.
                    throw err;
                }
                var dataFormate = [];//Tableau de données qui seront retournées par l'api.
                
                if (data) {//Si des bières sont dans la BD...
                    data.forEach(function(biereBD){//Formattage des données à renvoyer.

                        var biere = {
                            "id_biere": biereBD._id,
                            "nom": biereBD.nom,
                            "description": biereBD.description,
                            "brasserie": biereBD.brasserie
                        }
                        if (biereBD.image) {
                            biere.image = biereBD.image;
                        }
                        biere.date_ajout = biereBD.date_ajout;
                        biere.date_modif = biereBD.date_modif;

                        var nbNotes = 0;
                        var totalNotes = 0;

                        if (biereBD.notes) {
                            biereBD.notes.forEach(function(element) {
                                nbNotes++;
                                totalNotes += element.note;
                            });
                        }
                        if (nbNotes > 0) {
                            biere.moyenne = Math.round((totalNotes / nbNotes) * 10) / 10;
                        }
                        biere.nombre_note = nbNotes;

                        dataFormate.push(biere);//Le tableau est rempli avec des objets biere.
                    });
                }
                reponse.json(dataFormate);
            });
        });
    })
    //Requête PUT
    .put(authBasic, function (requete, reponse) {

        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var dataSoumis = requete.body;//Récupérer les données du client.
            if (dataSoumis.nom && dataSoumis.description && dataSoumis.brasserie) {//Si toutes les clés obligatoires sont présentes...
                
                var nom = dataSoumis.nom.trim();
                var description = dataSoumis.description.trim();
                var brasserie = dataSoumis.brasserie.trim();
                
                if (nom != "" && description != "" && brasserie != "") {//Si les champs n'ont pas de valeurs vides...
                    
                    var date = new Date();//Date-heure actuelle.
                    
                    db.collection('collectionBiere').insertOne({//Insertion de la bière.
                        "description": description,
                        "nom": nom,
                        "brasserie": brasserie,
                        "date_ajout": date,
                        "date_modif": date
                    },
                    function (err, documentInsere) {
                        
                        if (err) {
                            reponse.status(500).send();//Erreur interne.
                            throw err;
                        }
                        if (dataSoumis.image && dataSoumis.image.trim() != "") {//Si une image a été soumise...
                            
                            var image = dataSoumis.image.trim();
                            
                            db.collection('collectionBiere').updateOne({//Mise à jour de la bière insérée pour y ajouter l'image.
                                "_id": ObjectId(documentInsere.insertedId)//Récupère l'ID de la dernière insertion.
                            }, {
                                $set: {
                                    "image": image
                                }
                            },
                            function (err) {
                                if (err) {
                                    reponse.status(500).send();//Erreur interne.
                                    throw err;
                                }
                            });
                        }
                        reponse.send();
                    });
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            }
            else {
                reponse.status(400).send();//Erreur Bad Request.
            }
        });
    });

//Route /biere/id
app.route('/biere/:id/')
    //Requête GET
    .get(function (requete, reponse) {

        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var idBiere = requete.params.id;//ID de la bière demandée par le client.

            db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, data) {
                
                if (err) {
                    reponse.status(500).send();//Erreur interne.
                    throw err;
                }
                
                if (data) {//Si la bière existe...
                    
                    var biere = {};

                    //Formattage des données...
                    biere = {
                        "id_biere": data._id,
                        "nom": data.nom,
                        "description": data.description,
                        "brasserie": data.brasserie
                    }
                    if (data.image) {
                        biere.image = data.image;
                    }
                    biere.date_ajout = data.date_ajout;
                    biere.date_modif = data.date_modif;

                    var nbNotes = 0;
                    var totalNotes = 0;

                    if (data.notes) {
                        data.notes.forEach(function(element) {
                            nbNotes++;
                            totalNotes += element.note;
                        });
                    }
                    if (nbNotes > 0) {
                        biere.moyenne = Math.round((totalNotes / nbNotes) * 10) / 10;
                    }
                    biere.nombre_note = nbNotes;
                    
                    reponse.json(biere);//Renvoi les données sur la bière.
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            });
        });
    })
    //Requête DELETE
    .delete(authBasic, function (requete, reponse) {
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var idBiere = requete.params.id;
            db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {

                if (err) {
                    reponse.status(500).send();//Erreur interne.
                    throw err;
                }
                if (biere) {//Si la bière existe...
                    db.collection('collectionBiere').deleteOne({//Suppression de la bière.
                        "_id": ObjectId(idBiere)
                    },
                    function (err) {
                        if (err) {
                            reponse.status(500).send();//Erreur interne.
                            throw err;
                        }
                        reponse.send();
                    });
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            });
        });
    })
    //Requête POST
    .post(authBasic, function (requete, reponse) {
        
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var dataSoumis = requete.body;//Data soumis par le client.
            var oModifs = {};//Objet qui contient les valeurs à modifier.
            
            if (dataSoumis.nom && dataSoumis.nom.trim() != "") {//Nom
                oModifs.nom = dataSoumis.nom.trim();
            }
            if (dataSoumis.description && dataSoumis.description.trim() != "") {//Description
                oModifs.description = dataSoumis.description.trim();
            }
            if (dataSoumis.brasserie && dataSoumis.brasserie.trim() != "") {//Brasserie
                oModifs.brasserie = dataSoumis.brasserie.trim();
            }
            if (dataSoumis.image && dataSoumis.image.trim() != "") {//Image
                oModifs.image = dataSoumis.image.trim();
            }
            
            if (Object.keys(oModifs).length > 0) {//Si au moins un champs de modif est rempli et valide...
                
                var idBiere = requete.params.id;
                var compteur = 0;//Pour vérifier lors du passage dans la boucle si on est rendu à la dernière propriété de l'objet.
                oModifs.date_modif = new Date();//Rajout de la date de modif aux valeurs à modifier dans la BD.
                
                db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {

                    if (err) {
                        reponse.status(500).send();//Erreur interne.
                        throw err;
                    }
                    if (biere) {//Si la bière a été trouvée...

                        db.collection('collectionBiere').update({
                            _id: ObjectId(idBiere)
                        }, {
                            $set: oModifs//Objet contenant les valeurs à modifier dans la BD.
                        }, 
                        function (err, data) {
                            if (err) {
                                reponse.status(500).send();//Erreur interne.
                                throw err;
                            }
                            reponse.send();
                        });
                    }
                    else {
                        reponse.status(400).send();//Erreur Bad Request.
                    }
                });
            }
            else {
                reponse.status(400).send();//Erreur Bad Request.
            }
        });
    })

//Route biere/id/commentaire
app.route('/biere/:id/commentaire')
    //Requête GET
    .get(function (requete, reponse) {
    
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var idBiere = requete.params.id;
            db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {
                
                if (err) {
                    reponse.status(500).send();//Erreur interne.
                    throw err;
                }
                
                if (biere) {//Si la bière existe...
                    
                    var dataFormate = [];//Tableau de données à renvoyer au client.
                    
                    if (biere.commentaires) {//Si des commentaires sur cette bière sont présents...
                        biere.commentaires.forEach(function(commentaireBD){//Formattage des données.

                            var commentaire = {
                                "id_biere": biere._id,
                                "courriel": commentaireBD.courriel,
                                "date_ajout": commentaireBD.date_ajout,
                                "commentaire": commentaireBD.commentaire
                            }
                            dataFormate.push(commentaire);
                        });
                    }
                    reponse.json(dataFormate);//Envoi des commentaires.
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            });
        });
    })
    //Requête PUT
    .put(authBasic, function (requete, reponse) {
    
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var dataSoumis = requete.body;//Data soumis par le client.
            
            if (dataSoumis.courriel && dataSoumis.commentaire) {//Si les clés courriel et commentaire existent...
                
                var courriel = dataSoumis.courriel.trim();
                var commentaire = dataSoumis.commentaire.trim();
                
                if (courriel != "" && commentaire != "") {//Si les valeurs ne sont pas des chaînes vides...
                    
                    var idBiere = requete.params.id;//ID de la bière demandée.
                    var date = new Date();
                    
                    db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {

                        if (err) {
                            reponse.status(500).send();//Erreur interne.
                            throw err;
                        }
                        if (biere) {
                            db.collection('collectionBiere').findOneAndUpdate({//Trouve la bière et ajoute les champs.
                                "_id": ObjectId(idBiere)
                            }, {
                                $push: {//Nouvel objet commentaire ajouté au tableau de commentiares.
                                    "commentaires": {
                                        "courriel": courriel,
                                        "commentaire": commentaire,
                                        "date_ajout": date
                                    }
                                },
                                $set: {//Change la date de modif.
                                    "date_modif": date
                                }
                            },
                            function (err) {
                                if (err) {
                                    reponse.status(500).send();//Erreur interne.
                                    throw err;
                                }
                                reponse.send();
                            });
                        }
                        else {
                            reponse.status(400).send();//Erreur Bad Request.
                        }
                    });
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            }
            else {
                reponse.status(400).send();//Erreur Bad Request.
            }
        });
    });

//Route biere/id/note
app.route('/biere/:id/note')
    //Requête GET
    .get(function (requete, reponse) {
    
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var idBiere = requete.params.id;
            db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {
                
                if (err) {
                    reponse.status(500).send();//Erreur interne.
                    throw err;
                }
                
                if (biere) {//Si la bière existe...
                    
                    var note = {};//Objet note à renvoyer au client.
                    
                    if (biere.notes) {//Si des notes sur cette bière sont présentes...
                        
                        //Formattage des données.
                        var nbNotes = 0;
                        var totalNotes = 0;
                        
                        biere.notes.forEach(function(noteBD){

                            nbNotes++;
                            totalNotes += noteBD.note;
                        });
                        note.id_biere = biere._id;
                        note.note = Math.round((totalNotes / nbNotes) * 10) / 10;
                        note.nombre = nbNotes;
                    }
                    reponse.json(note);
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            });
        });
    })
    //Requête PUT
    .put(authBasic, function (requete, reponse) {
    
        mongoClient.connect(urlMongoDB, function (err, db) {
            if (err) {
                reponse.status(500).send();//Erreur interne.
                throw err;
            }
            var dataSoumis = requete.body;//Data soumis par le client.
            
            if (dataSoumis.courriel && dataSoumis.note) {//Si les clés courriel et note existent...
                
                var courriel = dataSoumis.courriel.trim();
                var note = parseInt(dataSoumis.note);
                
                if (courriel != "" && !isNaN(note) && note >= 0 && note <= 10) {//Si le courriel n'est pas vide et que la note est un nombre entre 0 et 10...
                    
                    var idBiere = requete.params.id;
                    var date = new Date();
                    
                    db.collection('collectionBiere').findOne({"_id": ObjectId(idBiere)}, function (err, biere) {

                        if (err) {
                            reponse.status(500).send();//Erreur interne.
                            throw err;
                        }
                        if (biere) {//Si la bière existe...
                            
                            db.collection('collectionBiere').update({//Tentative de mise à jour de la note.
                                _id: ObjectId(idBiere),
                                "notes.courriel": courriel
                            }, {
                                $set: {
                                    "notes.$.note" : note,
                                    "date_modif": date
                                },
                            }, 
                            function (err, data) {
                                if (err) {
                                    reponse.status(500).send();//Erreur interne.
                                    throw err;
                                }
                                if (data.toJSON().n == 0) {//Si la tentative à échouée, donc aucun match dans la BD...
                                    
                                    db.collection('collectionBiere').findOneAndUpdate({//Trouve la bière et ajoute les nouveaux champs.
                                        "_id": ObjectId(idBiere)
                                    }, {
                                        $push: {//Nouvel objet note dans le tableau de notes.
                                            "notes": {
                                                "courriel": courriel,
                                                "note": note,
                                                "date_ajout": date
                                            }
                                        },
                                        $set: {
                                            "date_modif": date//Changement de la date de modif.
                                        }
                                    },
                                    function (err) {
                                        if (err) {
                                            reponse.status(500).send();//Erreur interne.
                                            throw err;
                                        }
                                    });
                                }
                                reponse.send();
                            });
                        }
                        else {
                            reponse.status(400).send();//Erreur Bad Request.
                        }
                    });
                }
                else {
                    reponse.status(400).send();//Erreur Bad Request.
                }
            }
            else {
                reponse.status(400).send();//Erreur Bad Request.
            }
        });
    });

//Si aucune route trouvée...
app.use("*", function (requete, reponse) {
    reponse.status(400).send();//Erreur Bad Request.
});

//Écoute le port 8080.
app.listen(8080, function () {
    console.log('Biero api écoute le port 8080!');
});