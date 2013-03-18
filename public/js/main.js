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
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
      players[myId].leftright = -1; break;
    case KEYCODE_RIGHT:
      players[myId].leftright = 1; break;
    case KEYCODE_DOWN:
      players[myId].updown = 1; break;
    case  KEYCODE_UP:
      players[myId].updown = -1; break;
  }

  socket.emit('iMove', { id: myId, leftright : players[myId].leftright, updown : players[myId].updown, x : players[myId].sprite.x, y : players[myId].sprite.y });
  return false;
}

function handleKeyUp(e){
  if (!e)
    var e = window.event;
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
    case KEYCODE_RIGHT:
      players[myId].leftright = 0; break;
    case KEYCODE_DOWN:
    case KEYCODE_UP:
      players[myId].updown = 0; break;
  }

  socket.emit('iMove', { id: myId, leftright : players[myId].leftright, updown : players[myId].updown, x : players[myId].sprite.x, y : players[myId].sprite.y });
  return false;
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");
  if (players[data.id])
  {
    players[data.id].updown = Math.round(0.8 * data.updown);
    players[data.id].leftright = Math.round(0.8 * data.leftright);
    players[data.id].sprite.x = data.x;
    players[data.id].sprite.y = data.y;
  }
}

function joinRoom(data) {
  myId = data.id;

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
  socket.emit('joinRoom', { room : "theRoom", id: myId, leftright : players[myId].leftright, updown : players[myId].updown, x : players[myId].sprite.x, y : players[myId].sprite.y  });
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
  playerIds.push(data.id);
  players[data.id] = {};
  players[data.id].id = data.id;
  players[data.id].sprite = new createjs.Bitmap(characterImg);
  console.log(players[data.id].sprite);
  players[data.id].sprite.x = data.x;
  players[data.id].sprite.y = data.y;
  players[data.id].updown = data.updown;
  players[data.id].leftright = data.leftright;
  stage.addChild(players[data.id].sprite);
  stage.update();


}