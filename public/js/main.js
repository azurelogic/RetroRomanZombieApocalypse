var KEYCODE_ENTER = 13;
var KEYCODE_SPACE = 32;
var KEYCODE_UP = 38;
var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_DOWN = 40;
var KEYCODE_W = 87;
var KEYCODE_A = 65;
var KEYCODE_D = 68;
var IDLE = 0;
var MOVE_LEFT = 1;
var MOVE_UP = 2;
var MOVE_RIGHT = 3;
var MOVE_DOWN = 4;
var updown = 0
var leftright = 0
var canvas;
var stage;
var characterImg;
var character;
var socket;

function init() {
  console.log("starting init");

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
  character = new createjs.Bitmap(characterImg);
  console.log(character);
  character.x = canvas.width / 2;
  character.y = canvas.height / 2;
  stage.addChild(character);
  stage.update();

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  socket = io.connect();
  socket.on('youMove', setCharacterMovementFromSocket);

  createjs.Ticker.useRAF = true;
  createjs.Ticker.setFPS(60);
  if (!createjs.Ticker.hasEventListener("tick")) {
    createjs.Ticker.addEventListener("tick", tick);
  }
}

function tick() {
  character.x += leftright;
  character.y += updown;

  stage.update();
}

function handleKeyDown(e){
  if (!e)
    var e = window.event;
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
      leftright = -1; break;
    case KEYCODE_RIGHT:
      leftright = 1; break;
    case KEYCODE_DOWN:
      updown = 1; break;
    case  KEYCODE_UP:
      updown = -1; break;
  }

  socket.emit('iMove', { leftright : leftright, updown : updown });
  return false;
}

function handleKeyUp(e){
  if (!e)
    var e = window.event;
  switch(e.keyCode)
  {
    case KEYCODE_LEFT:
    case KEYCODE_RIGHT:
      leftright = 0; break;
    case KEYCODE_DOWN:
    case  KEYCODE_UP:
      updown = 0; break;
  }

  socket.emit('iMove', { leftright : leftright, updown : updown });
  return false;
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");
  updown = data.updown;
  leftright = data.leftright;
}

