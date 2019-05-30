var express = require('express')
var path = require('path')
var app = express()
var ejs = require('ejs')
var nodemailer = require('nodemailer');

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

var GitHubStrategy = require('passport-github').Strategy;
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

var githubprofile, githubuser;
passport.use(new GitHubStrategy({
    clientID: "f48831d54f0b54f76618",
    clientSecret: "40d6170999720facef735adba2db4d91c3ddb556",
    callbackURL: "http://localhost:3000/auth/github/callback",
    session: true,
  },
  function (accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login.html'
  }),
  function (req, res) {
    user.update({
      "email": req.session.passport.user._json.email
    }, {
      "name": req.session.passport.user._json.name,
      "email": req.session.passport.user._json.email,
      "city": req.session.passport.user._json.location,
      "visibility": true,
      "status": "pending",
      "role": "user",
    }, {
      upsert: true
    });
    req.session.islogin = 1;
    req.session.name = req.session.passport.user._json.name;
    req.session.email = req.session.passport.user._json.email;
    res.redirect("/home");
    //res.send('Github login successful');
  });

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'nikhildhupar207@gmail.com', //email
      pass: 'nikhil@#$%'  //password
    }
  });

  var mailOptions = {
    from: 'nikhildhupar207@gmail.com',
    to: 'ndhupar@ymail.com',
    subject: 'Sending Email using Node.js',
    text: 'That was easy!'
  };

  function sendemail(){
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
        //res.send(error);
      } else {
        console.log('Email sent: ' + info.response);
        //res.send('Email sent: ' + info.response);
      }
    });
  }

  //sendemail();

app.post('/send/email',function(req,res){
  sendemail(req,res);
})

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
    res.render('userlist');
  }
});

var count;
app.post('/admin/userlist/data', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    count = user.countDocuments({}, function (error, c) {
      count = c;
      //console.log( "Number of users:", count );
    });
    // console.log("data sent to server is");
    //console.log(req.body);
    //console.log(req.body.length);
    var querystatus = req.body.querystatus;
    var queryrole = req.body.queryrole;
    if (querystatus == 0 && queryrole == 0) {
      user.find({}, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          //console.log(data);
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else if (querystatus == 0 && queryrole != 0) {
      user.find({
          "role": queryrole,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          //console.log(data);
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else if (querystatus != 0 && queryrole == 0) {
      user.find({
          "status": querystatus,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          //console.log(data);
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    } else {
      user.find({
          "status": querystatus,
          "role": queryrole,
        }, {
          "_id": 0
        }).limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
        .then(data => {
          //console.log(data);
          res.send({
            "recordsTotal": count,
            "recordsFiltered": count,
            data
          });
        })
        .catch(err => {
          console.error(err)
          res.send(err);
        })
    }
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

app.post('/logout', function (req, res) {
  req.session.islogin = 0;
  req.session.name = "";
  req.session.email = "";
  res.send("1");
})

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

app.get('/changePassword', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    res.render('changepassword');
  }
});

app.post('/changePassword/update', function (req, res) {
  user.findOneAndUpdate({
      //search query
      email: "admin@gmail.com",
      password: req.body.oldpaswd,
    }, {
      // field:values to update
      password: req.body.newpaswd,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      if (data == null) {
        res.send("0");
      } else
        res.send("1");
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

console.log("Running on port 3000");
app.listen(3000)