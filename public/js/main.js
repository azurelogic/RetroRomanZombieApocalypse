var KEYCODE_ENTER = 13;
var KEYCODE_SPACE = 32;
var KEYCODE_UP = 38;
var KEYCODE_LEFT = 37;
var KEYCODE_RIGHT = 39;
var KEYCODE_DOWN = 40;

var canvas;
var stage;
var spritesImage;
var spriteSheet;
var characters;
var colors;
var socket;
var myId;
var lastTime;
var lastHeartbeatTime;
var enemyInterval;
var lastEnemyTime;
var keyPressedDown;
var keyPressedUp;
var keyPressedLeft;
var keyPressedRight;
var keyPressedSpace;

function init() {
  console.log("starting init");

  lastTime = 0;
  lastHeartbeatTime = 0;
  lastEnemyTime = 0;
  enemyInterval = 1000;

  characters = [];
  canvas = document.getElementById("gameCanvas");
  console.log(canvas);
  stage = new createjs.Stage(canvas);

  colors = [];
  colors.push({color: 'red', unused: true});
  colors.push({color: 'green', unused: true});
  colors.push({color: 'blue', unused: true});
  colors.push({color: 'yellow', unused: true});

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

  spriteSheet = new createjs.SpriteSheet(spriteData);

  socket = io.connect();
  socket.on('setId', joinRoom);
  socket.emit('getId');
}

function tick() {
  var now = Date.now();
  var deltaTime = (now - lastTime) / 1000;

  // move all of the characters
  for (var id = 0; id < characters.length; id++)
    if (characters[id])
      characters[id].move(deltaTime);

  var sortedCharacters = _.sortBy(characters, function (character) { return character.sprite.y;});
  stage.removeAllChildren();
  for (var i = 0; i < sortedCharacters.length; i++)
    stage.addChild(sortedCharacters[i].sprite);

  if (now - lastEnemyTime > enemyInterval) {
    generateZombie();
    enemyInterval = Math.floor(Math.random()*1000) + 1000;
    lastEnemyTime = now;
  }

  //heartbeat every 500 ms
  if (now - lastHeartbeatTime > 500) {
    sendDataOnRealtimeRoute('iMove');
    lastHeartbeatTime = now;
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
        break;
      case KEYCODE_RIGHT:
        keyPressedRight = false;
        player.stopLeftRightMotion();
        nonGameKeyPressed = false;
        break;
      case KEYCODE_DOWN:
        keyPressedDown = false;
        player.stopUpDownMotion();
        nonGameKeyPressed = false;
        break;
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
  var player = _.find(characters, {id: myId});
  var lastLeftright = player.leftright;
  var lastUpdown = player.updown;
  var nonGameKeyPressed = switchHandler(e, player);

  if (!nonGameKeyPressed && (lastLeftright != player.leftright || lastUpdown != player.updown || player.justAttacked)) {
    sendDataOnRealtimeRoute('iMove');
    lastHeartbeatTime = Date.now();
  }
  return nonGameKeyPressed;
}

function sendDataOnRealtimeRoute(messsageRoute) {
  var data = {};
  data.room = "theRoom";
  data.playerId = myId;

  _.find(characters, {id: myId}).appendDataToMessage(data);

  var zombies = _.where(characters, {ownerId: myId});
  for (var i = 0; i < zombies.length; i++)
    zombies[i].appendDataToMessage(data);

  socket.emit(messsageRoute, data);
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");

  var playerFound = _.find(characters, {id: data.playerId});
  var playerData = _.find(data.chars, {id: data.playerId});
  if (playerFound && playerData)
    playerFound.updatePositionAndVelocity(playerData);
  else
    addNewPlayer(playerData);

  var zombieDataList = _.where(data.chars, {ownerId: data.playerId});
  for (var i = 0; i < zombieDataList.length; i++)
  {
    var zombieFound = _.find(characters, {id: zombieDataList[i].id});
    var zombieData = _.find(data.chars, {id: zombieDataList[i].id});

    if (zombieFound && zombieData)
      zombieFound.updatePositionAndVelocity(zombieData);
    else
      addNewZombie(zombieData);
  }

}

function joinRoom(data) {
  myId = data.playerId;

  createjs.SpriteSheetUtils.addFlippedFrames(spriteSheet, true, true, false);

  characters.push(new Player({
    id: myId,
    x: canvas.width / 2,
    y: canvas.height / 2,
    updown: 0,
    leftright: 0,
    color: pickNewPlayerColor()
  }));

  console.log(myId);

  sendDataOnRealtimeRoute('joinRoom');
  socket.on('youMove', setCharacterMovementFromSocket);
  //socket.on('hasJoinedRoom', addNewPlayer);

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

function addNewPlayer(characterData) {
  characters.push(new Player({
    id: characterData.id,
    x: characterData.spritex,
    y: characterData.spritey,
    updown: characterData.updown,
    leftright: characterData.leftright,
    facingLeftright: characterData.facingLeftright,
    color: pickNewPlayerColor()
  }));
}

function addNewZombie(characterData) {
  characters.push(new Zombie({
    id: characterData.id,
    x: characterData.spritex,
    y: characterData.spritey,
    updown: characterData.updown,
    leftright: characterData.leftright,
    facingLeftright: characterData.facingLeftright,
    ownerId: characterData.ownerId,
    color: 'zombie'
  }));
}

function pickNewPlayerColor() {
  var colorIndex = Math.floor(Math.random()*4);
  var result = false;
  for (var i = 0; i < colors.length; i++)
  {
    if (colors[colorIndex].unused)
    {
      result = colors[colorIndex].color;
      colors[colorIndex].unused = false;
      break;
    }

    colorIndex = (colorIndex + 1) % colors.length;
  }
  return result;
}

function generateZombie() {
  addNewZombie({
    id: uuid.v4(),
    spritex: Math.floor(Math.random()*400),
    spritey: Math.floor(Math.random()*400),
    updown: 0,
    leftright: 0,
    facingLeftright: 1,
    ownerId: myId
  });
}