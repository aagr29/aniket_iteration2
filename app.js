const express=require('express')
const app = express()
const bodyParser=require('body-parser')
const bcrypt= require('bcrypt')
const pgp = require('pg-promise')()
const session = require('express-session') // for cookies we are using express-session
const path=require('path')

const PORT = 3000 // local port

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/views')); // for css files and media files to be attached to ejs page

const CONNECTION_STRING = "postgres://postgres:9525@localhost:5432/aniket_it2"

const SALT_ROUND=10 //  for bycrpt


app.use(session({
  secret: 'aniket29894',//can be anything
  resave : false,
  saveUninitialized: false
}))//cookie for session 

//body-parser
app.use(bodyParser.urlencoded({extended: false}))

//checking db
const db = pgp(CONNECTION_STRING)
console.log(db)//if database is connected display syantaxs in terminal

//listening on port 3000
app.listen(PORT,() => {
    console.log(`Server has started on ${PORT}`)
  })


//display index page  
app.get('/', function(req, res) {
    res.render('index');
});



//display registration page
app.get('/registration', (req, res) =>{
    res.render('registration',{message:NaN});
  });//if message exists then ejs displays a message

//display login page
app.get('/login', (req, res) =>{
    res.render('login',{message:NaN});
  });//if message exists then ejs displays a message

  app.get('/weight', (req, res) =>{
    res.render('weight');
  });
  app.get('/mood', (req, res) =>{
    res.render('mood');
  });


// dummy page just to display session value
  app.get('/display', (req, res) =>{
    var val = req.session.user;
    res.render('display',{user:val});
});//displays sesssion values

app.get('/home', (req, res) =>{
  res.render('home');
});
// log out get request

app.get('/logout',(req,res,next)=>{
  if(req.session){
    req.session.destroy((error)=>{
      if(error){
        next(error)
      }else{
        res.redirect('/')
      }
    })
  }
})
// post for registration page
app.post('/registration',(req,res) => {

    //vaules in form
    let username = req.body.username
    let password = req.body.password
    let height= req.body.height
    let age= req.body.age
    let gender= req.body.gender


    db.oneOrNone('SELECT userid FROM users WHERE username = $1',[username])//checking usename exits
    .then((user) => {
      console.log(user)
      if(user) {
        res.render('registration',{message:"Username already exsist"});//if yes display message
      } else {
        // insert user into the users table
       bcrypt.hash(password,SALT_ROUND,function(error,hash){
         if(error == null){
          db.none('INSERT INTO users(username,password,age,height,gender) VALUES($1,$2,$3,$4,$5)',[username,hash,age,height,gender])
          .then(() => {
            res.redirect('/')
          })
         }
       })
      }
    })
    .catch(error => {
      console.log(error);
    })
  })

  app.post('/login',(req,res)=>{
  
    let username = req.body.username
    let password = req.body.password
  
    db.oneOrNone('SELECT userid,username,password,age,height,gender FROM users WHERE username = $1',[username])
    .then((user) => {
      if(user){//check for users password
  
        bcrypt.compare(password,user.password,function(error,result){
        if(result){
  
          if(req.session){
            req.session.user={userId:user.userid, username:user.username, age:user.age ,height:user.height,gender:user.gender}
          }
          res.redirect('/weight')
        
        }else{
          res.render('login',{message:'invalid username or password'})
        }
      })
  
    }else{
      res.render('login',{message:'invalid username or password'})
    }
  }).catch(error => {
    console.log(error);
  })
  })


 //mood post api

 app.post('/set_mood', function(req, res){
  let mood_score=req.body.mood_score
  let userId=req.session.user.userId
  console.log(mood_score);

  db.none('INSERT INTO mood (mood_score,userid) VALUES($1,$2)',[mood_score,userId])
  .then(()=>{
    res.render("mood")//takes to mood pagenode

  }).catch(error => {
    console.log(error);
  })
})


app.get('/get_bmi', function(req, res) {
  let userId=req.session.user.userId

  db.any('SELECT userid,AVG(height) AS AVG_HGT,AVG(weight) AS AVG_WGT,date(date_time) FROM weight_records WHERE userid = $1 GROUP BY date(date_time), userid',[userId])
    .then((result) => {
      let heights = [];
      let weights = [];
      let dates = [];

      let data = result;

      for(i=0; i< data.length; i++) {
        obj = data[i];
        heights.push(Math.round(parseFloat(obj["avg_hgt"]), 2));
        weights.push(Math.round(parseFloat(obj["avg_wgt"]), 2));
        dates.push(obj["date"]);
      }

      res.status(200).json({'heights': heights, "weights": weights, "dates": dates})
  }).catch(error => {
    console.log(error);
  })
})

app.get('/get_latest_bmi', function(req, res) {
  let userId=req.session.user.userId

  db.any('SELECT userid,height,weight,date_time FROM weight_records WHERE userid = $1 ORDER BY date_time DESC LIMIT 1',[userId])
    .then((result) => {
      res.status(200).json({'result': result[0]})
  }).catch(error => {
    console.log(error);
  })
})

app.get('/bmi', (req, res) =>{
  res.render('bmi',{message:NaN});
});//if message exists then ejs displays a message



  //weight post

  app.post('/weight', function(req, res){
    let weight=req.body.weight
    let age=req.session.user.age
    let height=req.session.user.height
    let gender=req.session.user.gender
    let userId=req.session.user.userId
    
  
    db.none('INSERT INTO weight_records (weight,age,height,gender,userid) VALUES($1,$2,$3,$4,$5)',[weight,age,height,gender,userId])
    .then(()=>{
    res.render("mood")//takes to mood page
    }).catch(error => {
      console.log(error);
    })
  })

  
  //game code starts here


  app.get('/game', function(req, res){
     res.render('game');
});

app.post('/set_game_score', function(req, res){
  let game_score=req.body.game_score
  let userId=req.session.user.userId
  console.log(game_score);

  db.none('INSERT INTO game_records (game_score,userid) VALUES($1,$2)',[game_score,userId])
  .then(()=>{
    res.render("home")//takes to home pagenode

  }).catch(error => {
    console.log(error);
  })
})










  
  
