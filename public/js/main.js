var KEYCODE_ENTER = 13;
var KEYCODE_SPACE = 32;
var KEYCODE_UP = 38;
var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_DOWN = 40;

var canvas;
var stage;
var spritesImage;
var sprites;
var players;
var playerIds;
var socket;
var myId;
var lastTime;
var lastHeartbeat;
var playerVelocityFactor;
var keyPressedDown;
var keyPressedUp;
var keyPressedLeft;
var keyPressedRight;
var keyPressedSpace;

var Character = function (options) {
  this.self = this;
  this.id = options.id;
  this.sprite = new createjs.BitmapAnimation(sprites);
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.updown = options.updown;
  this.leftright = options.leftright;
  this.facingLeftright = this.leftright;
  this.color = 'zombie';
  this.justAttacked = false;

  stage.addChild(this.sprite);
  stage.update();

  sprites.getAnimation(this.color + 'stand').next = this.color + 'stand';
  this.sprite.gotoAndPlay(this.color + 'stand');
}

Character.prototype.updatePositionAndVelocity = function (playerData) {
  this.sprite.x = playerData.spritex;
  this.sprite.y = playerData.spritey;
  this.updown = 0.9 * playerData.updown;
  this.leftright = 0.9 * playerData.leftright;
  this.facingLeftright = playerData.facingLeftright;
  if (playerData.justAttacked)
    this.startAttackMotion();
  else if (this.updown != 0 || this.leftright != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};


Character.prototype.move = function (deltaTime) {
  if (this.updown == 0 || this.leftright == 0) {
    this.sprite.x += Math.round(this.leftright * deltaTime * playerVelocityFactor);
    this.sprite.y += Math.round(this.updown * deltaTime * playerVelocityFactor);
  }
  else {
    this.sprite.x += Math.round(this.leftright * deltaTime * playerVelocityFactor * 0.707);
    this.sprite.y += Math.round(this.updown * deltaTime * playerVelocityFactor * 0.707);
  }
};

Character.prototype.handleLeftOrRightFacingAnimation = function (nextAnimationType, futureAnimationType) {
  var nextAnimationName;
  var futureAnimationName;
  if (this.facingLeftright == 1) {
    nextAnimationName = this.color + nextAnimationType + '_h';
    futureAnimationName = this.color + futureAnimationType + '_h';
  }
  else {
    nextAnimationName = this.color + nextAnimationType;
    futureAnimationName = this.color + futureAnimationType;
  }

  if (futureAnimationType)
    sprites.getAnimation(nextAnimationName).next = futureAnimationName;
  else
    sprites.getAnimation(nextAnimationName).next = nextAnimationName;

  this.sprite.gotoAndPlay(nextAnimationName);
};

Character.prototype.startLeftMotion = function ()
{
  this.leftright = -1;
  this.facingLeftright = this.leftright;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startRightMotion = function ()
{
  this.leftright = 1;
  this.facingLeftright = this.leftright;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startUpMotion = function ()
{
  this.updown = -1;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startDownMotion = function ()
{
  this.updown = 1;
  this.handleLeftOrRightFacingAnimation('walk');
};

Character.prototype.startAttackMotion = function () {
  this.updown = 0;
  this.leftright = 0;
  this.handleLeftOrRightFacingAnimation('attack', 'stand');
};

Character.prototype.stopLeftRightMotion = function ()
{
  if (this.leftright != 0)
    this.facingLeftright = this.leftright;

  this.leftright = 0;
  if (this.updown != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};

Character.prototype.stopUpDownMotion = function ()
{
  this.updown = 0;
  if (this.leftright != 0)
    this.handleLeftOrRightFacingAnimation('walk');
  else
    this.handleLeftOrRightFacingAnimation('stand');
};

var Player = function (options) {

  //todo modify the options object for color, etc before calling the super constructor!!!!!!!!!!!!!!!!!!

  Character.call(this, options);
};

Player.prototype = Object.create(Character.prototype);

Player.prototype.appendPlayerDataToMessage = function (data) {
  data.player = {};
  data.player.id = this.id;
  data.player.leftright = this.leftright;
  data.player.facingLeftright = this.facingLeftright;
  data.player.updown = this.updown;
  data.player.spritex = this.sprite.x;
  data.player.spritey = this.sprite.y;
  data.player.justAttacked = this.justAttacked;

  this.justAttacked = false;
};

function init() {
  console.log("starting init");

  lastTime = 0;
  lastHeartbeat = 0;
  playerVelocityFactor = 50;

  players = [];
  playerIds = [];
  canvas = document.getElementById("gameCanvas");
  console.log(canvas);
  stage = new createjs.Stage(canvas);

  spritesImage = new Image();
  spritesImage.onload = handleImageLoad;
  spritesImage.src = "/images/sprites.png";
  console.log("init complete");
}

function handleImageLoad() {
  console.log("image loaded");

  var spriteData = {
    images: ["images/sprites.png"],
    frames: [

      [0, 0, 80, 80, 0, 40, 0],
      [80, 0, 80, 80, 0, 40, 0],
      [160, 0, 80, 80, 0, 40, 0],
      [240, 0, 80, 80, 0, 40, 0],
      [320, 0, 80, 80, 0, 40, 0],
      [0, 80, 80, 80, 0, 40, 0],
      [80, 80, 80, 80, 0, 40, 0],
      [160, 80, 80, 80, 0, 40, 0],
      [240, 80, 80, 80, 0, 40, 0],
      [320, 80, 80, 80, 0, 40, 0],
      [0, 160, 80, 80, 0, 40, 0],
      [80, 160, 80, 80, 0, 40, 0],
      [160, 160, 80, 80, 0, 40, 0],
      [240, 160, 80, 80, 0, 40, 0],
      [320, 160, 80, 80, 0, 40, 0],
      [0, 240, 80, 80, 0, 40, 0],
      [80, 240, 80, 80, 0, 40, 0],
      [160, 240, 80, 80, 0, 40, 0],
      [240, 240, 80, 80, 0, 40, 0],
      [320, 240, 80, 80, 0, 40, 0],
      [0, 320, 80, 80, 0, 40, 0],
      [80, 320, 80, 80, 0, 40, 0],
      [160, 320, 80, 80, 0, 40, 0],
      [240, 320, 80, 80, 0, 40, 0],
      [320, 320, 80, 80, 0, 40, 0]
    ],
    animations: {
      bluestand: 0,
      bluewalk: { frames: [1,0,2,0], frequency: 6 } ,
      blueattack: { frames: [0,3,4,3,0], frequency: 6 },
      greenstand: 5,
      greenwalk: { frames: [6,5,7,5], frequency: 6 },
      greenattack: { frames: [5,8,9,8,5], frequency: 6 },
      redstand: 10,
      redwalk: { frames: [11,10,12,10], frequency: 6 },
      redattack: { frames: [10,13,14,13,10], frequency: 6 },
      yellowstand: 15,
      yellowwalk: { frames: [16,15,17,15], frequency: 6 },
      yellowattack: { frames: [15,18,19,18,15], frequency: 6 },
      zombiestand: 20,
      zombiewalk: { frames: [21,20,22,20], frequency: 6 },
      zombieattack: { frames: [20,23,24,23,20], frequency: 6 }
    }
  };

  sprites = new createjs.SpriteSheet(spriteData);

  socket = io.connect();
  socket.on('setId', joinRoom);
  socket.emit('getId');
}

function tick() {
  var now = Date.now();
  var deltaTime = (now - lastTime) / 1000;

  // move all of the characters
  for (var id = 0; id < playerIds.length; id++)
    players[playerIds[id]].move(deltaTime);

  //todo sort characters by depth layer!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  //heartbeat every 500 ms
  if (now - lastHeartbeat > 500) {
    sendDataOnRealtimeRoute('iMove');
    lastHeartbeat = now;
  }

  stage.update();
  lastTime = now;
}

function handleKeyDown(e) {
  return handleKeySignals(e, function (e, player) {
    var nonGameKeyPressed = true;
    switch (e.keyCode) {
      case KEYCODE_LEFT:
        if (!keyPressedLeft) {
          keyPressedLeft = true;
          player.startLeftMotion();
        }
        nonGameKeyPressed = false;
        break;
      case KEYCODE_RIGHT:
        if (!keyPressedRight) {
          keyPressedRight = true;
          player.startRightMotion();
        }
        nonGameKeyPressed = false;
        break;
      case KEYCODE_DOWN:
        if (!keyPressedDown) {
          keyPressedDown = true;
          player.startDownMotion();
        }
        nonGameKeyPressed = false;
        break;
      case  KEYCODE_UP:
        if (!keyPressedUp) {
          keyPressedUp = true;
          player.startUpMotion();
        }
        nonGameKeyPressed = false;
        break;
      case KEYCODE_SPACE:
        if (!keyPressedSpace)
        {
          player.justAttacked = true;
          keyPressedSpace = true;
          player.startAttackMotion();
        }
        nonGameKeyPressed = false;
        break;
    }
    return nonGameKeyPressed;
  });
}

function handleKeyUp(e) {
  return handleKeySignals(e, function (e, player) {
    var nonGameKeyPressed = true;
    switch (e.keyCode) {
      case KEYCODE_LEFT:
        keyPressedLeft = false;
        player.stopLeftRightMotion();
        nonGameKeyPressed = false;
      case KEYCODE_RIGHT:
        keyPressedRight = false;
        player.stopLeftRightMotion();
        nonGameKeyPressed = false;
        break;
      case KEYCODE_DOWN:
        keyPressedDown = false;
        player.stopUpDownMotion();
        nonGameKeyPressed = false;
      case KEYCODE_UP:
        keyPressedUp = false;
        player.stopUpDownMotion();
        nonGameKeyPressed = false;
        break;
      case KEYCODE_SPACE:
        keyPressedSpace = false;
        //player.setKeyUpOnAttack();
        nonGameKeyPressed = false;
        break;
    }
    return nonGameKeyPressed;
  });
}

function handleKeySignals(e, switchHandler) {
  if (!e)
    e = window.event;
  var player = players[myId];
  var lastLeftright = player.leftright;
  var lastUpdown = player.updown;
  var nonGameKeyPressed = switchHandler(e, player);

  if (!nonGameKeyPressed && (lastLeftright != player.leftright || lastUpdown != player.updown || player.justAttacked)) {
    sendDataOnRealtimeRoute('iMove');
    lastHeartbeat = Date.now();
  }
  return nonGameKeyPressed;
}

function sendDataOnRealtimeRoute(messsageRoute) {
  var data = {};
  data.room = "theRoom";

  players[myId].appendPlayerDataToMessage(data);

  socket.emit(messsageRoute, data);
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");

  if (players[data.player.id])
    players[data.player.id].updatePositionAndVelocity(data.player);
  else
    addNewPlayer(data);
}

function joinRoom(data) {
  myId = data.player.id;

  playerIds.push(myId);

  createjs.SpriteSheetUtils.addFlippedFrames(sprites, true, true, false);

  //todo this might work better as a players.push(...)
  players[myId] = new Player({
    id: myId,
    x: canvas.width / 2,
    y: canvas.height / 2,
    updown: 0,
    leftright: 0
  });

  console.log(players[myId].sprite);
  console.log(myId);

  sendDataOnRealtimeRoute('joinRoom');
  socket.on('youMove', setCharacterMovementFromSocket);
  socket.on('hasJoinedRoom', addNewPlayer);

  keyPressedDown = false;
  keyPressedUp = false;
  keyPressedLeft = false;
  keyPressedRight = false;
  keyPressedSpace = false;

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
    leftright: data.player.leftright,
    facingLeftright: data.player.facingLeftright
  });
  console.log(players[data.player.id].sprite);
}