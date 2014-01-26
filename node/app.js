/* jshint laxcomma:true */

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
    client.sort("clients:*");
    client.keys("clients:*",  function(err, replies) {
      if(replies.length > 0) {
        replies.forEach(function(key) {
          client.hgetall(key,function(err, replies) {
            if(replies.mac !== "00:00:00:00:00:00") {
              console.log(replies.ip);
              app.render('row',replies, function(err, html) {
                socket.emit('client', html);
              });
            }
          });
        });
      } else {
        app.render('no_results');
        socket.emit('client', html);
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
  res.render('new');
});

app.post('/new', function(req, res) {
  var doc = req.body;
  // validate all the things!
  if( !val.isNull(doc.nick) && !val.isNull(doc.hostname) && val.isIP(doc.ip) && val.isMAC(doc.mac)) {
    var data = {"nick": doc.nick, "hostname":doc.hostname, "ip": doc.ip, "mac": doc.mac};
    client.zadd("clients", fixKey(doc.ip), data);
    //client.zadd("clients", fixKey(doc.ip), "nick", doc.nick, "hostname", doc.hostname, "ip", doc.ip, "mac", doc.mac); 
    res.render('success',{'hostname': doc.hostname, 'ip': doc.ip, 'coe': "created"});
  } else {
    res.render('new', {
      'failure' : true,
      'nick' : val.isNull(doc.nick),
      'hostname': val.isNull(doc.hostname), 
      'ip': !val.isIP(doc.ip),
      'mac': !va.lisMAC(doc.ip),
      'data' : {'nick': doc.nick,
                'hostname' : doc.hostname,
                'ip': doc.ip,
                'mac': doc.mac }}
    );
  }
});

app.get('/edit/:ip', function(req, res) {
  var doc = req.params;
  if(doc.ip !== null) {
    client.hgetall("clients:" + fixKey(doc.ip), function(err, reply) {
      app.render('edit', {'data': reply}, function(err, html) {
        res.send(html);
      });
    });
  } else {
    res.redirect('/new');
  }
});

app.post('/edit', function(req,res) {
  var doc = req.body;
  if( !val.isNull(doc.nick) && !val.isNull(doc.hostname) && val.isIP(doc.ip) && val.isMAC(doc.mac)) {
    client.hmset("clients:" + fixKey(doc.ip), "nick", doc.nick, "hostname", doc.hostname, "ip", doc.ip, "mac", doc.mac);
    res.render('success',{'hostname': doc.hostname, 'ip': doc.ip, 'coe': "edited"});
  } else {
    // need to make sure no one tampered with the url
    if(val.isIP(req.params.ip)) {
      res.redirect('/edit/'+req.params.ip);
    } else {
      res.redirect('/list');
    }
    /*
    res.render('edit', {
      'failure' : true,
      'nick' : val.isNull(doc.nick),
      'hostname': val.isNull(doc.hostname),
      'ip': !val.isIP(doc.ip),
      'data' : {'nick': doc.nick,
                'hostname' : doc.hostname,
                'ip': doc.ip}}
    );
    */
  }
});

app.get('/list', function(req, res) {
  res.render('listing');
});

app.get("/delete/:ip", function(req, res) {
  var doc = req.params;
  if(val.isIP(doc.ip)) {
    client.hgetall("clients:" + fixKey(doc.ip), function(err, reply) {
      app.render('delete', reply, function(err, html) {
        res.send(html);
      });
    });
  } else {
    res.redirect('/list');
  }
});

app.get('/delete/:ip/confirm', function(req, res) {
  var doc = req.params;
  if(val.isIP(doc.ip)) {
    client.hgetall("clients:" + fixKey(doc.ip), function(err, reply) {
      var data = {'hostname': doc.hostname, 'ip': doc.ip, 'coe': 'deleted'};
      app.render('success', data, function(err, html) {
        res.send(html);
      });
    });
    client.del("clients:" + fixKey(doc.ip));
  } else {
    // for now redirect back to the listing.
    res.redirect('/list');
  }
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
