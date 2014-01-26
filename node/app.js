/* jshint laxcomma:true */

var express = require('express')
  , hbs = require('express-hbs')
  , http = require('http')
  , val = require('validator')
  , app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server, {log: false})
  , util = require('util')
  ;

server.listen(3000);
console.log("listening on port: 3000");

// Define the socket.io events
io.sockets.on('connection', function(socket) {
  socket.on('getListing', function(data) {
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
});

app.get('/new', function(req, res) {
});

app.post('/new', function(req, res) {
});

app.get('/edit/:ip', function(req, res) {
});

app.post('/edit', function(req,res) {
});

app.get('/list', function(req, res) {
});

app.get("/delete/:ip", function(req, res) {
});

app.get('/delete/:ip/confirm', function(req, res) {
});

function fixKey(ip) {
  var spip = ip.split(".") 
  var newip = []; 
  for(n in spip) {
    n = spip[n]+"";
    while (n.length < 3) n = "0" + n;
    newip.push(n); 
  }
  return newip.join("");
}
