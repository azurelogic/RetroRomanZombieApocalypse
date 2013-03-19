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

function init() {
  console.log("starting init");

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
  for (var id = 0; id < playerIds.length; id++)
  {
      players[playerIds[id]].sprite.x += players[playerIds[id]].leftright;
      players[playerIds[id]].sprite.y += players[playerIds[id]].updown;
  }

  stage.update();
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

  data.player = {};
  data.player.id = myId;
  data.player.leftright = players[myId].leftright;
  data.player.updown = players[myId].updown;
  data.player.spritex = players[myId].sprite.x;
  data.player.spritey = players[myId].sprite.y;
  
  socket.emit(messsageRoute, data);
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");

  if (players[data.player.id])
  {
    players[data.player.id].updown = Math.round(0.8 * data.player.updown);
    players[data.player.id].leftright = Math.round(0.8 * data.player.leftright);
    players[data.player.id].sprite.x = data.player.spritex;
    players[data.player.id].sprite.y = data.player.spritey;
  }
  else
  {
    addNewPlayer(data);
  }
}

function joinRoom(data) {
  myId = data.player.id;

  playerIds.push(myId);

  players[myId] = {};
  players[myId].id = myId;

  players[myId].sprite = new createjs.Bitmap(characterImg);
  console.log(players[myId].sprite);
  players[myId].sprite.x = canvas.width / 2;
  players[myId].sprite.y = canvas.height / 2;
  players[myId].updown = 0;
  players[myId].leftright = 0;

  stage.addChild(players[myId].sprite);
  stage.update();

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

  players[data.player.id] = {};
  players[data.player.id].id = data.player.id;

  players[data.player.id].sprite = new createjs.Bitmap(characterImg);
  console.log(players[data.player.id].sprite);
  players[data.player.id].sprite.x = data.player.spritex;
  players[data.player.id].sprite.y = data.player.spritey;
  players[data.player.id].updown = data.player.updown;
  players[data.player.id].leftright = data.player.leftright;

  stage.addChild(players[data.player.id].sprite);
  stage.update();
}