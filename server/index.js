const express = require('express')
const parser = require('body-parser')
const axios = require('axios')
const bcrypt = require('bcrypt')
const path = require('path')
const db = require('../database/index.js')

const app = express()

app.use(express.static(__dirname + '/../client/dist'))
app.use(parser.json())

var session = require('express-session')({
  secret: 'i can haz workout',
})

app.use(session)

app.get('/isloggedin', (req, res) => {
  res.send(!!req.session && !!req.session.user)
})

app.post('/signup', (req, res) => {
  let firstName = req.body.firstName
  let lastName = req.body.lastName
  let username = req.body.username
  let password = req.body.password
  let email = req.body.email
  // console.log('this mah body', req.body)
  if (firstName === null || lastName === null || username === null || password === null || email === null) {
    res.send('Sorry can\'t leave this field blank')
  }
  let salt
  db.findUser(username)
    .then((dbres) => {
      console.log('response from database on find user', dbres)
      if (dbres.length > 0) {
        throw('Sorry username aleady exists')
      }
      return bcrypt.genSalt(10)
    })
    .then((saltResult) => {
      salt = saltResult
      return bcrypt.hash(password, salt)
    })
    .then((hash) => {
      return db.createUser(firstName, lastName, username, hash, salt, email)
    })
    .then((dbres) => {
      console.log('after successfully storing using', dbres)
      let userId = dbres[0]
      return req.session.regenerate((err) => {
        if (err) {
          console.log('Error regenerating the session')
        }
        req.session.user = username
        console.log('the new session user is', req.session.user)
        console.log('User was successfully signed up', username)
        res.status(200).send(JSON.stringify(userId))
      });
    })
    .catch((err) => {
      console.error('Error in signing user up', err)
      res.send('Error signing up new user')
    })
})

app.post('/login', (req, res) => {
  let username = req.body.username
  let password = req.body.password

  let hashedPassword
  let id
  db.findUser(username)
    .then((dbRes) => {
      console.log('response from log in check', dbRes )
      if (dbRes.length === 0) {
        throw('Username does not exist')
      }
      hashedPassword = dbRes[0].password
      id = dbRes[0].user_id
      console.log('password being compared:', password)
      return bcrypt.compare(password, hashedPassword)
    })
    .then((hashResult) => {
      console.log('my hash result', hashResult)
      if (hashResult === true) {
        req.session.regenerate(function(){
          req.session.user = username
          res.status(200).send(JSON.stringify(id))
        })
      }
    })
    .catch((err) => {
      console.error('There was an errror logging in', err)
      res.send('Sorry there was an error logging in')
    })
})

app.post('/logout', (req, res) => {
  if (req.session === undefined || req.session.user === undefined) {
    res.send('Cannot logout without an active session')
    return;
  }
  req.session.destroy()
  res.send('Bye! You were logged out')
})



/*
==================================================================================================
*/

//get all exercises from static db
app.get('/exercises', function(req, res) {
  db.getExercises()
    .then((response)=> {
      // console.log('my response from getting workouts', response)
      res.send(response)
    })
    .catch((err) =>{
      console.log('Error in getting exercises in server')
      res.send('failed')
    })
})

//adds a workout
app.post('/workout', function(req, res) {
  var workoutName = req.body.workoutName
  var username = req.session.user
  console.log('in server my username is', req.session.user)
  db.addWorkout(username, workoutName)
    .then((response)=> {
      console.log('my response from making a workout', response)
      res.send(JSON.stringify({userId: response[0], workoutName: workoutName}))
    })
    .catch((err)=> {
      console.log('Error getting workout from database')
    })
})

//retrieves all the workouts saved by a user
app.get('/getWorkouts', function(req, res) {
  var username = req.session.user
  db.getWorkouts(username)
    .then((response)=> {
      console.log('RESPONSE FROM GETTING THE SAVED WORKOUTS', response)
      res.send(response)
    })
    .catch((err)=> {
      console.log('could not get workouts from db', err)
    })
})

app.post('/exerciseToWorkout', function(req, res){
  var exercise = req.body.exercise
  var sets = req.body.sets
  var reps = req.body.reps
  var workoutId = req.body.workoutId
  db.addExerciseToWorkout(exercise, sets, reps, workoutId)
    .then((response)=> {
      console.log('response in serving from adding exercise', response)
      res.send(response)
    })
})



/*==========================================================================================*/

/*Filters*/

//filters the exercises by selected muscle
app.post('/muscle', function(req, res) {
  var muscle = req.body.muscle
  db.filterByMuscle(muscle)
    .then((response) => {
      res.send(response)
    })
    .catch((err) => {
      console.log('Error filtering by muscle in server', err)
    })
})

//filters the exercises by selected muscle type
app.post('/type', function(req, res) {
  var type = req.body.type
  db.filterByType(type)
    .then((response) => {
      res.send(response)
    })
    .catch((err) => {
      console.log('Error filtering by type in server', err)
    })
})

app.get('/*', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../client/dist/index.html'))
})

const port = 3000

app.listen(3000, function() {
  console.log('Listening in on port', `${port}`)
})
