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

mongoose.connect(mongoDB, {
  useNewUrlParser: true
});

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
mongoose.set('useFindAndModify', false);

app.get('/', function (req, res) {
  res.redirect('/home')
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

app.get('/admin/adduser', function (req, res) {
  if (req.session.islogin) {
    res.render('addusers');
  } else {
    res.redirect('/login.html')
  }
})
app.post('/adduser', function (req, res) {
  //console.log(req.body);
  //checking if email is already registered or not
  user.find({
      "email": req.body.email
    })
    .then(data => {
      if (data.length != 0) {
        //console.log(data[0].name);
        res.send("Email already exists");
      } else {
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
            //console.log(data)
            req.session.islogin = 1;
            req.session.name = req.body.name;
            req.session.email = req.body.email;
            res.redirect("/home");
          })
          .catch(err => {
            console.error(err)
            res.send(error)
          })
      }
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
})

app.get('/home', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
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
  }
});

app.get('/admin/userlist', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({}, {
        "name": 1,
        "email": 1,
        "phno": 1,
        "status": 1,
        "role": 1,
        "city": 1,
        "visibility": 1,
        "_id": 0
      })
      .then(data => {
        res.render('userlist', {
          user: data
        });
      })
      .catch(err => {
        console.error(err)
        res.send(err);
      })
  }
});

app.post('/admin/userlist/updateuser', function (req, res) {
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      name: req.body.username,
      email: req.body.email,
      phno: req.body.phno,
      role: req.body.role,
      city: req.body.city,
      status: req.body.status,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.redirect('/admin/userlist')
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.post('/admin/userlist/disableuser', function (req, res) {
  //console.log(req.body);
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      visibility: false
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.post('/admin/userlist/enableuser', function (req, res) {
  //console.log(req.body);
  user.findOneAndUpdate({
      //search query
      email: req.body.email
    }, {
      // field:values to update
      visibility: true
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

console.log("Running on port 3000");
app.listen(3000)