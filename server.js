var express = require('express')
var path = require('path')
var app = express()
var ejs = require('ejs')

var session = require('express-session');
app.use(session({
  secret: "xYzUCAchitkara",
  resave: false,
  saveUninitialized: true,
}));

//Acces static files
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'Views'));
app.set('view engine', 'ejs');

//Bodyparser
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

//Connect with db
var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/project1';

mongoose.connect(mongoDB);

mongoose.connection.on('error', (err) => {
  console.log('DB connection Error');
});

mongoose.connection.on('connected', (err) => {
  console.log('DB connected');
});

var productSchema = new mongoose.Schema({
  name: String,
  email: String,
  gender: String,
  password: String,
  city: String,
  phno: Number,
  dob: String,
  role: String,
  status: String,
  visibility: Boolean,
});

var user = mongoose.model('userdetails', productSchema);

app.get('/', function (req, res) {
  res.redirect('login.html')
})
app.post('/login', function (req, res) {
  //console.log(req.body);
  user.find({
      "name": req.body.name,
      "password": req.body.password
    })

    .then(data => {
      if (data.length != 0) {
        req.session.islogin = 1;
        req.session.name = data[0].name;
        //console.log(data[0].email);
        req.session.email = data[0].email;
        res.send("1");
      } else {
        res.send("0");
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err);
      //res.send("Invalid Email/password")
    })
})

app.get('/adduser',function(req,res){
  if(req.session.islogin)
  {
    res.render('addusers');
  }
  else
  {
    res.redirect('login.html')
  }
})
app.post('/adduser', function (req, res) {
  //console.log(req.body);
  let newuser = new user({
    name: req.body.name,
    email: req.body.email,
    gender: req.body.gender,
    password: req.body.password,
    city: req.body.city,
    phno: req.body.phone,
    dob: req.body.dob,
    visibility: true,
    role: req.body.role,
    status: "pending",
  })
  newuser.save()
    .then(data => {
      console.log(data)
      res.send(data)
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
})

app.get('/home', function (req, res) {
  if(!req.session.islogin)
  {
    res.redirect('/login.html');
  }
  user.find({
      "name": req.session.name,
      "email": req.session.email
    })
    .then(data => {
      if (data.length != 0) {
        //console.log(data[0].name);
        res.render('home', {
          user: data[0]
        });
      } else {
        res.redirect('/login.html');
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

console.log("Running on port 3000");
app.listen(3000)