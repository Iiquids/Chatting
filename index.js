const express = require('express');
var cookieParser = require('cookie-parser')
const app = express();
app.use(cookieParser())
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var fs = require('fs');
const moment = require("moment");
var ip = require("ip");

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/chat.html');
});

// https://9fb98bbd-4f78-4fcd-ac77-dd382fbbf2c3-00-1mzglmi3qs5sa.riker.replit.dev/login?UserName=Edin&Id=101588279555927357126&UserFullName=Edin%20QuintanaRamos&UserEmail=quintanaramose57325%40middiepride.org

app.get('/accountCreate', (req, res) => {
  const username = req.query.UserName;
  const firstName = req.cookies.userName;
  const token = req.cookies.token;
  const fullName = req.cookies.fulllName;
  const email = req.cookies.email;

  if (!isUserNameValid(username)) {
    res.send(JSON.stringify({status: "error", message: "    Usernames can only have:\n - Lowercase Letters (a-z)\n - Numbers (0-9)\n - Dots (.)\n - Underscores (_)"}))
    return;
  }
  
  var auth = JSON.parse(fs.readFileSync("Authentication.json", 'utf8'));
  if (auth[token] == null) {
    for (var i = 0; i < auth.length; i++) {
      if (auth[i].username == username) {
        res.send(JSON.stringify({status: "error", message: "Username Taken!"}))
        return;
      }
    }
    auth[token] = {
      username: username,
      firstName: firstName,
      fullName: fullName,
      email: email,
      accountCreated: moment().format("MM/DD/YYYY HH:mm:ss"),
    }
    fs.writeFile('Authentication.json', JSON.stringify(auth), { flag: 'r+' }, err => {});
    res.cookie('username', username, { maxAge: 900000, httpOnly: false });
    res.send(JSON.stringify({status: "success", message: "Account Created!"}))
  } else {
    res.send(JSON.stringify({status: "error", message: "Account Already Created!"}))
    res.cookie('username', auth[token].username, { maxAge: 900000, httpOnly: false });
  }
});

function isUserNameValid(username) {
  /* 
    Usernames can only have: 
    - Lowercase Letters (a-z) 
    - Numbers (0-9)
    - Dots (.)
    - Underscores (_)
  */
  const res = /^[a-z0-9_\.]+$/.exec(username);
  const valid = !!res;
  return valid;
}

app.get('/login', (req, res) => {
  const username = req.query.UserName;
  const token = req.query.Id;
  const fullName = req.query.UserFullName;
  const email = req.query.UserEmail;
  const hasInfo = req.query.makeAccount;

  if (req.cookies.username != null) {
    res.sendFile(__dirname + '/RedirectToLogin.html');
    return;
  }
  
  if (hasInfo == "true") {
    res.sendFile(__dirname + '/login.html');
  } else {
    if (username == null || token == null) {
      res.sendFile(__dirname + '/RedirectToLogin.html');
      return;
    }
    res.cookie('userName', username, { maxAge: 900000, httpOnly: false });
    res.cookie('token', token, { maxAge: 900000, httpOnly: false });
    res.cookie('fulllName', fullName, { maxAge: 900000, httpOnly: false });
    res.cookie('email', email, { maxAge: 900000, httpOnly: false });
    var auth = JSON.parse(fs.readFileSync("Authentication.json", 'utf8'));
    if (auth[token] != null) {
      res.cookie('username', auth[token].username, { maxAge: 900000, httpOnly: false });
      res.sendFile(__dirname + '/RedirectToLogin.html');
      return;
    }
    res.sendFile(__dirname + '/loggingIn.html');
  }
});

app.get('/chatstyle', (req, res) => {
  res.sendFile(__dirname + '/chatstyle.css');
});

app.get('/loginstyle', (req, res) => {
  res.sendFile(__dirname + '/loginstyle.css');
});

app.get('/bg', (req, res) => {
  res.sendFile(__dirname + '/bg.jpg');
});

io.on('connection', (socket) => {
  let username = "";
  
  socket.on('disconnect', () => {
    io.emit('joined', username + " left");
  });

  socket.on('entered', (msg) => {
    username = msg;
    io.emit('joined', username + " joined");
  })
  
  socket.on('chat message', (msg) => {
    var json = JSON.parse(msg);
    var auth = JSON.parse(fs.readFileSync("Authentication.json", 'utf8'));
    if (auth[json.token] == null) {
      return;
    }
    
    if (json.message.length > 0 && json.message.length < 500) {
      if (auth[json.token].username == json.username) {
        io.emit('chat message', JSON.stringify({username: json.username, message: json.message, date: json.date}));
      }
    }
  });

  socket.on('startedTyping', (msg) => {
    var json = JSON.parse(msg);
    var auth = JSON.parse(fs.readFileSync("Authentication.json", 'utf8'));
    if (auth[json.token] && auth[json.token].username == json.username) {
      io.emit('typing', json.username);
    }
  })
  
  socket.on('unTyping', (msg) => {
    var json = JSON.parse(msg);
    var auth = JSON.parse(fs.readFileSync("Authentication.json", 'utf8'));
    if (auth[json.token] && auth[json.token].username == json.username) {
      io.emit('stopTyping', json.username);
    }
  })
    
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

// https://socket.io/get-started/chat