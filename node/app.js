var express = require('express')
  , hbs = require('express-hbs')
  , redis = require('redis')
  , http = require('http')
  , val = require('validator')
  , client = redis.createClient()
  , app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server, {log: false})
  , util = require('util')
  ;

server.listen(3000);
console.log("listening on port: 3000");

// redis global events
client.on('error', function(e) {
  console.log("error event - " + client.host + ":" + client.port + " - " + e);
});

// Define the socket.io events
io.sockets.on('connection', function(socket) {
  socket.on('getListing', function(data) {
    var multi = client.multi()
      .sort("clients:*")
      .keys("clients:*", function(err, replies) {
        console.log(util.inspect(replies));
      })
      .hgetall("clients:*", function(err, replies) {
        console.log(util.inspect(replies));
      })
      .exec();
    
    client.keys("*",  function(err, replies) {
      replies.forEach(function(key) {
        client.hgetall(key,function(err, replies) {
          app.render('row',replies, function(err, html) {
            socket.emit('client', html);
          });
        });
      });
    });
  });
});

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
  res.render('new');
});

app.post('/new', function(req, res) {
  var doc = req.body;
  // validate all the things!
  if( !val.isNull(doc.nick) && !val.isNull(doc.hostname) && val.isIP(doc.ip)) {
    client.hmset("clients:" + doc.ip, "nick", doc.nick, "hostname", doc.hostname, "ip", doc.ip); 
    res.render('success',{'hostname': doc.hostname, 'ip': doc.ip});
  } else {
    res.render('new', {
      'failure' : true,
      'nick' : val.isNull(doc.nick),
      'hostname': val.isNull(doc.hostname), 
      'ip': !val.isIP(doc.ip),
      'data' : {'nick': doc.nick,
                'hostname' : doc.hostname,
                'ip': doc.ip}}
    );
  }
});

app.get('/edit', function(req, res) {
  res.render('edit');
});

app.get('/listing', function(req, res) {
  res.render('listing');
});
