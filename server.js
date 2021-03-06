var express = require('express')
var path = require('path')
var app = express()
var ejs = require('ejs')
var nodemailer = require('nodemailer');
var multer = require('multer');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    file.fieldname = file.fieldname + req.session.email + '-' + req.session.name + path.extname(file.originalname);
    console.log(file.fieldname);
    cb(null, file.fieldname);
  }
});

var upload = multer({
  storage: storage
});

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
var mongoDB = 'mongodb://localhost/projects';

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
  imagepath: String,
  intrests: String,
  aboutjourney: String,
  comExpectations: String,
});

var communitySchema = new mongoose.Schema({
  name: String,
  creator: String,
  rule: String,
  description: String,
  imagepath: String,
  status: String,
  createdate: String,
  requestspending: Array,
  memberusers: Array,
  invitesSent: Array,
  commAdmins: Array,
});

const dotenv = require('dotenv');
dotenv.config();

const community = mongoose.model('commdetails', communitySchema);
const user = mongoose.model('userdetails', productSchema);
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

passport.use(new GitHubStrategy({
    clientID: process.env.gitclientID,
    clientSecret: process.env.gitclientSecret,
    callbackURL: "https://community.nikhildeveloper.gq/auth/github/callback",
    session: true,
  },
  function (accessToken, refreshToken, profile, cb) {
    //console.log(profile);
	 // console.log(process.env.gitclientID);
	 // console.log(process.env.gitclientSecret);
    return cb(null, profile);
  }
));

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login.html'
  }),
  function (req, res) {
    //console.log("githubsignin succesful");

    user.updateOne({
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
    },function(err,data){
    	if(err){
		console.log(err)
	//console.log("Upsert didn't work");
	}
	    else
	    {
		  //  console.log("Upsert works");
	    	//console.log(data);
	    }
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
    user: process.env.UserEmail, //email
    pass: process.env.EmailPassword //password
  }
});

function sendemail(mailOptions) {
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      //res.send(error);
      return 0;
    } else {
      console.log('Email sent: ' + info.response);
      //res.send('Email sent: ' + info.response);
      return 1;
    }
  });
}

// app.post('/send/email', function (req, res) {
//   sendemail(req, res);
// })

app.get('/', function (req, res) {
  console.log("Inside root");
	res.redirect('/home')
})

app.get('/server1',function(req,res) {
	res.redirect('/login.html');
})

app.post('/login', function (req, res) {
  //console.log(req.body);
  user.find({
      "email": req.body.name,
      "password": req.body.password
    })

    .then(data => {
	    //console.log(data);
      if (data.length != 0) {
        req.session.islogin = 1;
        req.session.name = data[0].name;
        //console.log(data[0].email);
        req.session.email = data[0].email;
        if (data[0].role == "superuser" || data[0].role == "admin")
          res.send("1");
        else if (data[0].role == "user" || data[0].role == "community builder")
          res.send("2")
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
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('addusers', {
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
		 // console.log("adding new user");
          //  console.log(data);
            var content = "You have been succesfully added to My website.\n"
            content += "This email can be used to login and Password is " + data.password;
            content += "We are happy to have you !!!";
            var mailvalues = {
              "from": "nikhildhupar207@gmail.com",
              "to": data.email,
              "subject": "Added to My Website",
              "text": content,
            };
            sendemail(mailvalues);
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
	//console.log("Inside home");
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
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('userlist', {
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

app.post('/admin/userlist/data', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    var count;
    count = user.countDocuments({}, function (error, c) {
      count = c;
      //console.log( "Number of users:", count );
    });
    // console.log("data sent to server is");
    console.log(req.body);
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

app.post('/admin/userlist/email', function (req, res) {
  console.log("email sending ");
  //console.log(req.body);
  var mailvalues = {
    "from": "nikhildhupar207@gmail.com",
    "to": req.body.sendto,
    "subject": req.body.subject,
    "text": req.body.content
  };
  console.log(mailvalues);
  if (sendemail(mailvalues)) {
    res.send("1");
  } else {
    res.send("0");
  }
});

app.get('/profile', function (req, res) {
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
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          //console.log(data[0].name);
          res.render('changepassword', {
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

app.get('/editprofile', function (req, res) {
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
          res.render('editprofile', {
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

app.post('/editprofile/picupload', upload.single('user-'), function (req, res, next) {
  // req.file is the image file
  // req.body will hold the text fields, if there were any
  //console.log("inside profile upload");
  user.updateOne({
    "name": req.session.name,
    "email": req.session.email,
  }, {
    "imagepath": req.file.fieldname,
  }, function (err, success) {
    if (err) {
      console.log(error);
    } else {
      console.log("SUCCESS - Image succesfully uploaded");
      console.log(success);
    }
    if (!req.file) {
      const error = new Error('Please400 upload a file')
      error.httpStatusCode = 400
      return next(error)
    }
    res.redirect("/editprofile");
  });
});

app.post('/editprofile', function (req, res) {
	if (!req.session.islogin) {
    		res.redirect('/login.html');
	}
  user.findOneAndUpdate({
      //search query
      email: req.session.email,
    }, {
      // field:values to update
      name: req.body.fullname,
      dob: req.body.dob,
      phno: req.body.phno,
      gender: req.body.gender,
      city: req.body.city,
      intrests: req.body.intrests,
      aboutjourney: req.body.aboutjourney,
      comExpectations: req.body.comExpectations,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      console.log("response after updating profile \n "+data);
      res.redirect('/Profile');
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
});

app.get('/community/communitypanel', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communitypannel', {
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

app.get('/community/AddCommunity', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('addcommunity', {
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

app.post('/community/AddCommunity', upload.single('community-'), function (req, res) {
  console.log(req.body);
  console.log(req.file);
  community.find({
      name: req.body.communityName,
    })
    .then(data => {
      if (data.length != 0) {
        res.send("community name already taken");
      } else {
        var imgpath;
        if (req.file) {
          imgpath = req.file.fieldname;
        } else {
          imgpath = "defaultcommunitypic.jpg"
        }
        var d = new Date();
        var dat = d.toDateString();
        console.log(dat);
        let newcomm = new community({
          name: req.body.communityName,
          "imagepath": imgpath,
          creator: req.session.email,
          rule: req.body.communityMembershipRule,
          description: req.body.description,
          memberusers: [req.session.email],
          status: "deactive",
          createdate: dat,
        });
        newcomm.save()
          .then(data => {
            var content = "Hello " + req.session.name + "\n";
            content += "You new community has been sent to admin for verification."
            var mailvalues = {
              "from": "nikhildhupar207@gmail.com",
              "to": req.session.email,
              "subject": "Adding Your New Community",
              "text": content,
            };
            sendemail(mailvalues);
            res.redirect("/community/communitypanel");
          })
          .catch(err => {
            console.error(err)
            res.send(error)
          })
      }
    })
});


app.post('/community/communitypannel/mycreated', function (req, res) {
  community.find({
      creator: req.session.email,
    })
    .then(data => {
      // console.log("inside mycreated");
      // console.log(data);
      res.send(data);
    })
});

app.get('/community/communityList', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      })
      .then(data => {
        if (data.length != 0) {
          res.render('admincommunitylist', {
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

app.post('/community/communitylist/data', function (req, res) {
  var count;
  count = community.countDocuments({}, function (error, c) {
    count = c;
    //console.log( "Number of users:", count );
  });
  community.find().limit(parseInt(req.body.length)).skip(parseInt(req.body.start))
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
});

app.post('/community/communitylist/updatecommunity', function (req, res) {
  community.findOneAndUpdate({
      //search query
      creator: req.body.email,
      name: req.body.origcommname,
    }, {
      // field:values to update
      name: req.body.commname,
      status: req.body.status,
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      res.redirect('/community/communityList');
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

app.get('/community/list', function (req, res) {
  if (req.session.islogin) {
    user.find({
        "name": req.session.name,
        "email": req.session.email
      }).sort({
        "name": 1
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communitysearchlist', {
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
  } else {
    res.redirect('/login.html')
  }
});

app.post('/community/communitypannel/mysearch', function (req, res) {
  community.find({
      "creator": {
        $ne: req.session.email
      },
      "memberusers": {
        $ne: req.session.email
      },
      "requestspending": {
        $ne: req.session.email
      },
    }).sort({
      "name": 1
    })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

app.post('/community/communitypannel/iampartof', function (req, res) {
  community.find({
      "memberusers": {
        $eq: req.session.email
      },
      "requestspending": {
        $ne: req.session.email
      },
      "creator": {
        $ne: req.session.email
      },
    }).sort({
      "name": 1
    })
    .then(data => {
      // console.log("inside iampartof");
      // console.log(data);
      res.send(data);
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

app.post('/community/communitypannel/joinrequest', function (req, res) {
  //console.log(req.body);
  community.find({
      "_id": req.body.id,
    })
    .then(data => {
      console.log("data matched");
      console.log(data[0]);
      if (data[0].rule == "direct") {
        console.log("inside if");
        addmembers(data[0], req.session.email);
      } else if (data[0].rule == "permission") {
        console.log("inside request else\n");
        addrequests(data[0], req.session.email);
      }
      res.send(data);
    })
    .catch(err => {
      console.error(err)
      res.send(err);
    })
});

function addrequests(data, useremail) {
  console.log("\nAdd creators page\n");
  //console.log(data);
  community.findOneAndUpdate({
      _id: data._id,
    }, {
      $push: {
        requestspending: useremail
      }
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      console.log(data);
      var content = "Your request to join community-" + data.name + " has been received. You will be notified as soon as community owner takes action on your request";
      var mailvalues = {
        "from": "nikhildhupar207@gmail.com",
        "to": req.session.email,
        "subject": "Request received to join Community",
        "text": content,
      };
      sendemail(mailvalues);
      console.log("\n\nSuccesful\n\n");
      //res.redirect('/Profile');
    })
    .catch(err => {
      console.error(err)
      //res.send(error)
    })
}

function addmembers(data, useremail) {
  console.log("\nAdd creators page\n");
  //console.log(data);
  community.findOneAndUpdate({
      _id: data._id,
    }, {
      $push: {
        memberusers: useremail
      }
    }, {
      new: true, // return updated doc
      runValidators: true // validate before update
    })
    .then(data => {
      console.log(data);
      var content = "You have been succesfully added to community " + data.name;
      var mailvalues = {
        "from": "nikhildhupar207@gmail.com",
        "to": req.session.email,
        "subject": "Added to Community",
        "text": content,
      };
      sendemail(mailvalues);
      console.log("\n\nSuccesful\n\n");
      //res.redirect('/Profile');
    })
    .catch(err => {
      console.error(err)
      //res.send(error)
    })
}

app.get('/community/discussion/:commid', function (req, res) {
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email,
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communitydiscussions', {
            user: data[0],
            collectionid: req.params.commid,
          });
        } else {
          res.redirect('/login.html');
        }
      })
  }
});

app.post('/community/communitydetails/getcommunity', function (req, res) {
  community.find({
      "_id": req.body.commid,
    })
    .then(data => {
      if (data.length != 0) {
        res.send(data[0]);
      } else {
        res.send(404);
      }
    })
});

app.get('/community/communityprofile/:commid',function(req,res){
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email,
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communityprofile', {
            user: data[0],
            collectionid: req.params.commid,
          });
        } else {
          res.redirect('/login.html');
        }
      })
  }
});

app.get('/community/managecommunity/:commid',function(req,res){
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email,
      })
      .then(data => {
        if (data.length != 0) {
          res.render('managecommunity', {
            user: data[0],
            collectionid: req.params.commid,
          });
        } else {
          res.redirect('/login.html');
        }
      })
  }
});

app.get('/community/communitymembers/:commid',function(req,res){
  if (!req.session.islogin) {
    res.redirect('/login.html');
  } else {
    user.find({
        "name": req.session.name,
        "email": req.session.email,
      })
      .then(data => {
        if (data.length != 0) {
          res.render('communitymembers', {
            user: data[0],
            collectionid: req.params.commid,
          });
        } else {
          res.redirect('/login.html');
        }
      })
  }
});

app.post('/community/communitydetails/getPendingRequests', function (req, res) {
  community.find({
      "_id": req.body.commid,
    })
    .then(data => {
      if (data.length != 0) {
        let temp = [data[0].creator];
        temp.push(data[0].requestspending);
        res.send(temp);
      } else {
        res.send(404);
      }
    })
});

/*
app.get('/hello/:no/:jk/:no',(req,res)=>{
  console.log(req.params.no+'  ----'+req.params.jk+'  ----'+req.params.no);
  res.send('hello');
})*/
console.log("Running on port 4000");
app.listen(4000)
