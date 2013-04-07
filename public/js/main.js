var KEYCODE_ENTER = 13;
var KEYCODE_SPACE = 32;
var KEYCODE_UP = 38;
var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_DOWN = 40;
var KEYCODE_W = 87;
var KEYCODE_A = 65;
var KEYCODE_D = 68;

var canvas;
var stage;
var characterImg;
var players;
var playerIds;
var socket;
var myId;
var lastTime;
var playerVelocityFactor;

function Player(options) {
  this.self = this;
  this.id = options.id;
  this.sprite = new createjs.Bitmap(characterImg);
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.updown = options.updown;
  this.leftright = options.leftright;

  stage.addChild(this.sprite);
  stage.update();
}

Player.prototype.updatePositionAndVelocity = function(options) {
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.updown = 0.8 * options.updown;
  this.leftright = 0.8 * options.leftright;
}

Player.prototype.appendPlayerDataToMessage = function(data) {
  data.player = {};
  data.player.id = this.id;
  data.player.leftright = this.leftright;
  data.player.updown = this.updown;
  data.player.spritex = this.sprite.x;
  data.player.spritey = this.sprite.y;
}

function init() {
  console.log("starting init");

  lastTime = 0;
  playerVelocityFactor = 50;

  players = [];
  playerIds = [];
  canvas = document.getElementById("gameCanvas");
  console.log(canvas);
  stage = new createjs.Stage(canvas);

  characterImg = new Image();
  characterImg.onload = handleImageLoad;
  characterImg.src = "/images/rocket.png";
  console.log("init complete");
}

function handleImageLoad() {
  console.log("image loaded");

  socket = io.connect();
  socket.on('setId', joinRoom)
  socket.emit('getId');
}

function tick() {
  var now = Date.now();
  var diffTime = (now - lastTime) / 1000;
  for (var id = 0; id < playerIds.length; id++)
  {
      players[playerIds[id]].sprite.x += Math.round(players[playerIds[id]].leftright * diffTime * playerVelocityFactor);
      players[playerIds[id]].sprite.y += Math.round(players[playerIds[id]].updown * diffTime * playerVelocityFactor);
  }

  //add heartbeat based on modulus of diffTime...

  stage.update();
  lastTime = now;
}

function handleKeyDown(e){
  if (!e)
    var e = window.event;
  var nonGameKeyPressed = true;
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
      players[myId].leftright = -1; nonGameKeyPressed = false; break;
    case KEYCODE_RIGHT:
      players[myId].leftright = 1; nonGameKeyPressed = false; break;
    case KEYCODE_DOWN:
      players[myId].updown = 1; nonGameKeyPressed = false; break;
    case  KEYCODE_UP:
      players[myId].updown = -1; nonGameKeyPressed = false; break;
  }

  if (!nonGameKeyPressed)
    sendPlayerDataOnRealtimeRoute('iMove');
  return nonGameKeyPressed;
}

function handleKeyUp(e){
  if (!e)
    var e = window.event;
  var nonGameKeyPressed = true;
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
    case KEYCODE_RIGHT:
      players[myId].leftright = 0; nonGameKeyPressed = false; break;
    case KEYCODE_DOWN:
    case KEYCODE_UP:
      players[myId].updown = 0; nonGameKeyPressed = false; break;
  }

  if (!nonGameKeyPressed)
    sendPlayerDataOnRealtimeRoute('iMove');
  return nonGameKeyPressed;
}

function sendPlayerDataOnRealtimeRoute(messsageRoute) {
  var data = {};
  data.room = "theRoom";

  players[myId].appendPlayerDataToMessage(data);
  
  socket.emit(messsageRoute, data);
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");

  if (players[data.player.id])
  {
    players[data.player.id].updatePositionAndVelocity({
      x: data.player.spritex,
      y: data.player.spritey,
      updown: data.player.updown,
      leftright: data.player.leftright
    })
  }
  else
  {
    addNewPlayer(data);
  }
}

function joinRoom(data) {
  myId = data.player.id;

  playerIds.push(myId);

  players[myId] = new Player({
    id: myId,
    x: canvas.width / 2,
    y: canvas.height / 2,
    updown: 0,
    leftright: 0
  });

  console.log(players[myId].sprite);
  console.log(myId);

  sendPlayerDataOnRealtimeRoute('joinRoom');
  socket.on('youMove', setCharacterMovementFromSocket);
  socket.on('hasJoinedRoom', addNewPlayer);

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  createjs.Ticker.useRAF = true;
  createjs.Ticker.setFPS(60);
  if (!createjs.Ticker.hasEventListener("tick")) {
    createjs.Ticker.addEventListener("tick", tick);
  }
}

function addNewPlayer(data) {
  playerIds.push(data.player.id);

  players[data.player.id] = new Player({
    id: data.player.id,
    x: data.player.spritex,
    y: data.player.spritey,
    updown: data.player.updown,
    leftright: data.player.leftright
  });
  console.log(players[data.player.id].sprite);
}