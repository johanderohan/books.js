var fs = require('fs'),
  	path = require('path'),
  	EPub = require('epub'),
    _ = require('lodash'),
	  express = require('express'),
    crypto = require('crypto'),
	  bodyParser = require('body-parser'),
  	Datastore = require('nedb'),
    db = new Datastore({ filename: path.join(__dirname+'/data/data.db'), autoload: true });

var _ROOT = '/Users/johan/Documents/Leidos';

var app = express();
	app.set('views', path.join(__dirname+'/views'));
	app.set('view engine', 'jade');
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({  extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/covers', express.static(__dirname + '/covers'));

	app.get('/', function (req, res) {
    db.find().sort({ 'metadata.creator': 1, 'metadata.date': 1 }).exec(function (err, docs) {
      res.render('index', { title: 'Books', booksData: docs });
    });
	});

var server = app.listen(3000, function () {
  var port = server.address().port;
  console.log('Books listening at port %s', server.address().port);
  firstRun();
});


var firstRun = function () {
	try{ fs.mkdirSync(__dirname+'/covers'); } catch(e) {/*console.log('/covers alrdey exists');*/}
	try{ fs.mkdirSync(__dirname+'/data'); } catch(e) {/*console.log('/data alredy exists');*/}
	main();
};

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
	if(!books.length) { next(); return; }
	var	epub = new EPub(books[books.length-1]);
	epub.on("end", function(){
      var hash = crypto.createHash('md5'), 
      stream = fs.createReadStream(books[books.length-1]);

      stream.on('data', function (data) {
        hash.update(data, 'utf8');
      });

      stream.on('end', function () {
        
        var book = {
    			extension: path.extname(books[books.length-1]),
    			realpath: books[books.length-1],
    			metadata: epub.metadata,
          added: new Date(),
          md5: hash.digest('hex')
    		};
        
        db.find({ md5: book.md5 }, function (err, doc) {
          if(!doc.length) {
            db.insert(book, function (err, newDoc) {
        			if(epub.metadata.cover){
        				epub.getImage(epub.metadata.cover, function(err, data, mimeType){
        			        if(mimeType == 'image/jpeg')
        			        	fs.writeFile(path.join(__dirname+'/covers/'+newDoc._id+'.jpg'), data, function(err) {  });
        			    });
        			}
              
              //next
              books.pop();
              loadBooks(books,next);
              
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

var main = function () {
	var books = searchEPUB(_ROOT);
	loadBooks(books,function(){
		console.log('END');
	});
};
