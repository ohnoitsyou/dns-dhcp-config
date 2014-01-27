/* jshint laxcomma:true */
/* jshint loopfunc:true */
/* jshint trailing:true */
/* jshint node:true */
"use strict";

var express = require('express')
  , hbs = require('express-hbs')
  , http = require('http')
  , val = require('validator')
  , client = require('mongodb').MongoClient
  , ObjectId = require('mongodb').ObjectID
  , app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server, {log: false})
  , util = require('util')
  ;

server.listen(3000);
console.log("listening on port: 3000");

// Setup the mongodb connection
var dbCon;
var collection;
client.connect('mongodb://localhost:27017/foo', function(err, db) {
  if(err) throw err;
  console.log("Connected to Database");
  dbCon = db;
  collection = dbCon.collection('dns-dhcp');
});

// Define the socket.io events
io.sockets.on('connection', function(socket) {
  socket.on('getListing', function(data) {
    var collection = dbCon.collection('dns-dhcp');
    collection.find().toArray(function(err, results) {
      for (var row in results) {
        app.render('row', results[row], function(err, html) {
          socket.emit('client', html);
        });
      }
    });
  });
});

// Extend Validator.js to check mac addresses
val.isMAC = function(str) {
  return val.matches(str, /([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/);
};

app.engine('hbs', hbs.express3({
  partialsDir : __dirname + '/views/partials',
  contentHelperName : 'content',
}));

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(req,res) {
  res.render('index');
});

app.get('/new', function(req, res) {
  res.render('new',{'title':'New Entry'});
});

// I am not doing any verification to see if this is a duplicate, I am trusting the user
app.post('/new', function(req, res) {
  var doc = req.body;
  if(!val.isNull(doc.nick) &&
     !val.isNull(doc.hostname) &&
      val.isIP(doc.ip) &&
      val.isMAC(doc.mac)) {
    var document = {
      'nick': val.escape(doc.nick), 
      'hostname': val.escape(doc.hostname), 
      'ip': doc.ip, 
      'mac' : doc.mac};
    collection.insert(document, function(err, records) {
      if (err) throw err;
      document.coe = "created";
      app.render('success',document, function(err, html) {
        res.send(html);
      });
    });
  } else {
    var data = {
      'failure': true,
      'nick': val.isNull(doc.nick),
      'hostname': val.isNull(doc.hostname),
      'ip': !val.isIP(doc.ip),
      'mac': !val.isMAC(doc.mac),
      'data': doc};
    res.render('new',data);
  }
});

app.get('/edit/:doc_id', function(req, res) {
  var doc = req.params;
  if(!val.isNull(doc.doc_id)) {
    collection.find({'_id': new ObjectId(doc.doc_id)}).toArray(function(err, records) {
      if(records.length > 0) {
        res.render('edit',records[0]);
      } else {
        res.redirect('/list');
      }
    });
  } else {
    res.redirect('/list');
  }
});

app.post('/edit/:doc_id', function(req,res) {
  var doc = req.body;
  if(!val.isNull(doc._id)) {
    if(!val.isNull(doc.nick) &&
       !val.isNull(doc.hostname) &&
        val.isIP(doc.ip) &&
        val.isMAC(doc.mac)) {
      var document = {'nick': val.escape(doc.nick), 'hostname': val.escape(doc.hostname), 'ip': doc.ip, 'mac' : doc.mac};
      collection.update({'_id': new ObjectId(doc._id)}, {$set: document}, {w: 0});
      document.coe = "updated";
      res.render('success',document);
    } else {
      var data = {
        'failure': true,
        'nick': val.isNull(doc.nick),
        'hostname': val.isNull(doc.hostname),
        'ip': !val.isIP(doc.ip),
        'mac': !val.isMAC(doc.mac),
        'data': doc};
      res.render('edit',data);
    }
  } else {
    res.redirect('/list');
  }
});

app.get('/list', function(req, res) {
  res.render('listing');
});

app.get("/delete/:doc_id", function(req, res) {
  var doc = req.params;
  if(!val.isNull(doc.doc_id)) {
    collection.find({'_id': new ObjectId(doc.doc_id)}).toArray(function(err, records) {
      if(records.length > 0) {
        res.render('delete', records[0]);
      } else {
        res.redirect('list');
      }
    });
  } else {
    res.redirect('list');
  }
});

app.get('/delete/:doc_id/confirm', function(req, res) {
  var doc = req.params;
  if(!val.isNull(doc.doc_id)) {
    collection.find({'_id': new ObjectId(doc.doc_id)}).toArray(function(err, records) {
      if(records.length > 0) {
        collection.remove({'_id': new ObjectId(doc.doc_id)},{w: 0});
        records[0].coe = "deleted";
        res.render('success', records[0]);
      } else {
        res.redirect('list');
      }
    });
  }
});
