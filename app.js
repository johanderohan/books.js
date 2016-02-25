var fs = require('fs'),
  	path = require('path'),
  	EPub = require('epub'),
    _ = require('lodash'),
    http = require('http'),
    compression = require('compression'),
	  express = require('express'),
    crypto = require('crypto'),
    lwip = require('lwip'),
    striptags = require('striptags'),
    async = require('async'),
	  bodyParser = require('body-parser'),
  	Datastore = require('nedb'),
    db = new Datastore({ filename: path.join(__dirname+'/data/data.db'), autoload: true }),
    config = require('./config.js');

var _ROOT = config.library;
var scanning = false;

var app = module.exports.app = express();
	app.set('views', path.join(__dirname+'/views'));
	app.set('view engine', 'ejs');
	app.use(bodyParser.json());
  app.use(compression());
	app.use(bodyParser.urlencoded({  extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/covers', express.static(__dirname + '/covers'));

  //ROUTES
	app.get('/', function (req, res) {
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
      res.render('index', { title: 'Books', server: add });
    });
	});

  app.get('/books/:id', function (req, res) {
    db.findOne({ _id: req.params.id }, function (err, doc) {
      res.send(doc);
    });
	});

  app.get('/download/:id', function (req, res) {
    db.findOne({ _id: req.params.id }, function (err, doc) {
      res.sendFile(doc.realpath);
    });
	});

  //API
  app.post('/scan', function(req, res){
    if(!scanning) {
      scanning = true;
      scan(function(){
        io.emit('stops');
        db.find().sort({ 'metadata.creator': 1, 'metadata.date': 1 }).skip(0).limit(12).exec(function (err, docs) {
          scanning = false;
          res.send(docs);
        });
      });
    }
  });

  app.post('/search', function(req, res){
      var search = new RegExp(req.body.search,'g');
      db.find({$or: [{ 'metadata.creator': search }, { 'metadata.title': search }]}).sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
        res.send(docs);
      });
  });

  app.get('/api/books', function (req, res) {
      db.find().sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
        res.send(docs);
      });
	});

  app.post('/api/books', function (req, res) {
    if(req.body.filter === 'all') {
      if(req.body.order === 'title') {
        db.find().sort({ 'metadata.title': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'autor') {
        db.find().sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'added') {
        db.find().sort({ 'added': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      }
    } else if(req.body.filter === 'readed') {
      if(req.body.order === 'title') {
        db.find({read: 1}).sort({ 'metadata.title': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'autor') {
        db.find({read: 1}).sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'added') {
        db.find({read: 1}).sort({ 'added': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      }
    } else if(req.body.filter === 'reading') {
      if(req.body.order === 'title') {
        db.find({read: 2}).sort({ 'metadata.title': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'autor') {
        db.find({read: 2}).sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'added') {
        db.find({read: 2}).sort({ 'added': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      }
    } else if(req.body.filter === 'fav') {
      if(req.body.order === 'title') {
        db.find({like: true}).sort({ 'metadata.title': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'autor') {
        db.find({like: true}).sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      } else if(req.body.order === 'added') {
        db.find({like: true}).sort({ 'added': 1, 'metadata.date': 1 }).exec(function (err, docs) {
          res.send(docs);
        });
      }
    }
	});

  //Reading will be another state {read:2}
  app.post('/api/readed/:id', function (req, res) {
    db.update({ _id: req.params.id }, { $set: { read: req.body.status } }, function (err) {
      if (err) res.sendStatus(400);
      else res.sendStatus(200);
    });
	});

  app.delete('/api/readed/:id', function (req, res) {
    db.update({ _id: req.params.id }, { $set: { read: 0 } }, function (err) {
      if (err) res.sendStatus(400);
      else res.sendStatus(200);
    });
	});

  app.delete('/api/trash', function (req, res) {
      db.find({ deleted: true }, function (err, docs) {
        async.each(docs, function(file, callback) {
            db.remove({ _id: file._id }, {}, function (err, numRemoved) {
              callback();
            });
        }, function(err){
          db.find().sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
            res.send(docs);
          });
        });
      });
	});

  app.post('/api/liked/:id', function (req, res) {
    db.update({ _id: req.params.id }, { $set: { like: true } }, function (err) {
      if (err) res.sendStatus(400);
      else res.sendStatus(200);
    });
  });

  app.delete('/api/liked/:id', function (req, res) {
    db.update({ _id: req.params.id }, { $set: { like: false } }, function (err) {
      if (err) res.sendStatus(400);
      else res.sendStatus(200);
    });
  });

var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000);
console.log('Books listening at port %s', server.address().port);

//Creating directories
try{ fs.mkdirSync(__dirname+'/covers'); } catch(e) {/*console.log('/covers alrdey exists');*/}
try{ fs.mkdirSync(__dirname+'/covers/original'); } catch(e) {/*console.log('/covers alrdey exists');*/}
try{ fs.mkdirSync(__dirname+'/covers/small'); } catch(e) {/*console.log('/covers alrdey exists');*/}
try{ fs.mkdirSync(__dirname+'/data'); } catch(e) {/*console.log('/data alredy exists');*/}

var searchEPUB = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(searchEPUB(file));
        else if(path.extname(file) == '.epub') results.push(file);
    });
    return results;
};

var loadBooks = function(books,next){
	if(!books.length) { io.emit('stops', ''); checkBooks(next); return; }
	var	epub = new EPub(books[books.length-1]);
	epub.on("end", function(){
      var hash = crypto.createHash('md5'),
      stream = fs.createReadStream(books[books.length-1]);

      //Debug
      console.log(books[books.length-1]);

      stream.on('data', function (data) {
        hash.update(data, 'utf8');
      });

      stream.on('end', function () {

        var book = {
    			extension: path.extname(books[books.length-1]),
    			realpath: books[books.length-1],
    			metadata: epub.metadata,
          added: new Date(),
          md5: hash.digest('hex'),
          read: 0
    		};

        io.emit('scan', 'Reading '+book.metadata.title);
        db.find({ md5: book.md5 }, function (err, doc) {
          if(!doc.length) {
          async.series([
              function(callback){
                var wordCount = 0;
                var charCount = 0;
                var i = 0;
                epub.flow.forEach(function(chapter){
                    epub.getChapter(chapter.id, function(error, text){
                      i++;
                      var chapter = '';
                      if(text) {
                        chapter = striptags(text);
                      }

                      chapter_string = chapter.replace(/ /g,'');
                      chapter_string = chapter_string.replace(/\n/g,'');
                      charCount += chapter_string.length;

                      chapter = chapter.replace(/[.,?¿¡!;()"'-]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .toLowerCase()
                      .split(' ');

                      wordCount += chapter.length;
                      if(epub.flow.length === i) {
                        callback(null, {chars:charCount,words:wordCount});
                      }
                    });
                });
              }
          ],
          function(err, results){
              book.charCount = results[0].chars;
              book.wordCount = results[0].words;
              if(book.metadata.description)
                book.metadata.description = striptags(book.metadata.description);

                db.insert(book, function (err, newDoc) {
            			if(epub.metadata.cover){
            				epub.getImage(epub.metadata.cover, function(err, data, mimeType){
                          if(err){
                            //Copy a default image
                            lwip.open(__dirname+'/public/images/default.jpg', function(err, image){
                              image.toBuffer('jpg', function(err, buffer){
                                  fs.writeFile(path.join(__dirname+'/covers/original/'+newDoc._id+'.jpg'), buffer, function(err) {
                                    image.scale(0.5, function(err, image){
                                      image.toBuffer('jpg', function(err, buffer){
                                          fs.writeFile(path.join(__dirname+'/covers/small/'+newDoc._id+'.jpg'), buffer, function(err) {
                                            //next
                                            books.pop();
                                            loadBooks(books,next);
                                          });
                                      });
                                    });
                                  });
                              });
                            });
                          } else {
              			        if(mimeType == 'image/jpeg') {
              			        	fs.writeFile(path.join(__dirname+'/covers/original/'+newDoc._id+'.jpg'), data, function(err) {
                                lwip.open(__dirname+'/covers/original/'+newDoc._id+'.jpg', function(err, image){
                                  image.scale(0.5, function(err, image){
                                    image.toBuffer('jpg', function(err, buffer){
                                        fs.writeFile(path.join(__dirname+'/covers/small/'+newDoc._id+'.jpg'), buffer, function(err) {
                                          //next
                                          books.pop();
                                          loadBooks(books,next);
                                        });
                                    });
                                  });
                                });
                              });
                            }
                          }
            			    });
            			} else {
                    //Copy a default image
                    lwip.open(__dirname+'/public/images/default.jpg', function(err, image){
                      image.toBuffer('jpg', function(err, buffer){
                          fs.writeFile(path.join(__dirname+'/covers/original/'+newDoc._id+'.jpg'), buffer, function(err) {
                            image.scale(0.5, function(err, image){
                              image.toBuffer('jpg', function(err, buffer){
                                  fs.writeFile(path.join(__dirname+'/covers/small/'+newDoc._id+'.jpg'), buffer, function(err) {
                                    //next
                                    books.pop();
                                    loadBooks(books,next);
                                  });
                              });
                            });
                          });
                      });
                    });
                  }

            		});
            });
        } else {
                //next
                books.pop();
                loadBooks(books,next);
            }
      });
    });
	});
	epub.parse();
};

var checkBooks = function (next) {
  console.log('DELETED BOOKS');
  db.find({ }, function (err, docs) {
    for (var i = 0; i < docs.length; i++) {
      try {
          fs.accessSync(docs[i].realpath, fs.F_OK);
          db.update({ _id: docs[i]._id }, { $set: { deleted: false } }, function (err) { });
          // Do something
      } catch (e) {
          // It isn't accessible
          console.log(docs[i].realpath);
          db.update({ _id: docs[i]._id }, { $set: { deleted: true } }, function (err) { });
      }
    }
    next();
  });
};

var scan = function (next) {
	var books = searchEPUB(_ROOT);
	loadBooks(books,function(){
		next();
	});
};
