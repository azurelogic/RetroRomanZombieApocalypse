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
var deadCharacterIds;
var colors;
var socket;
var myId;
var lastTime;
var lastHeartbeatTime;
var lastAttackTime;
var lastPlayerLockTime;
var lastDeadCharacterPurgeTime;
var enemyInterval;
var lastEnemyTime;
var keyPressedDown;
var keyPressedUp;
var keyPressedLeft;
var keyPressedRight;
var keyPressedSpace;
var viewModel;

function init() {
  console.log("starting init");

  canvas = document.getElementById("gameCanvas");
  stage = new createjs.Stage(canvas);

  var viewModelMaker = function () {
    var self = this;

    self.points = ko.observable();
    self.health = ko.observable();
    self.gameStarted = ko.observable();

    self.rooms = ko.observableArray();
    self.currentRoom = ko.observable();

    self.awardPoints = function (points) {
      self.points(self.points() + points);
    };
    self.newGameReset = function () {
      self.points(0);
      self.health(100);
      self.gameStarted(false);
    };
  };

  viewModel = new viewModelMaker();

  ko.applyBindings(viewModel);

  spritesImage = new Image();
  spritesImage.onload = handleImageLoad;
  spritesImage.src = "/images/sprites.png";

  //todo load the background image!!!

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
      bluewalk: { frames: [1, 0, 2, 0], frequency: 6 },
      blueattack: { frames: [0, 3, 4, 3, 0], frequency: 6 },
      greenstand: 5,
      greenwalk: { frames: [6, 5, 7, 5], frequency: 6 },
      greenattack: { frames: [5, 8, 9, 8, 5], frequency: 6 },
      redstand: 10,
      redwalk: { frames: [11, 10, 12, 10], frequency: 6 },
      redattack: { frames: [10, 13, 14, 13, 10], frequency: 6 },
      yellowstand: 15,
      yellowwalk: { frames: [16, 15, 17, 15], frequency: 6 },
      yellowattack: { frames: [15, 18, 19, 18, 15], frequency: 6 },
      zombiestand: 20,
      zombiewalk: { frames: [21, 20, 22, 20], frequency: 10 },
      zombieattack: { frames: [20, 23, 24, 23, 20], frequency: 10 }
    }
  };

  spriteSheet = new createjs.SpriteSheet(spriteData);

  socket = io.connect();
  socket.on('setId', joinRoom);
  socket.emit('getId');
}

function joinRoom(data) {
  myId = data.playerId;

  lastTime = 0;
  lastHeartbeatTime = 0;
  lastAttackTime = 0;
  lastEnemyTime = 0;
  lastPlayerLockTime = 0;
  lastDeadCharacterPurgeTime = 0;
  enemyInterval = 1000;

  characters = [];
  deadCharacterIds = [];

  stage.removeAllChildren();
  stage.removeAllEventListeners();

  colors = [];
  colors.push({color: 'red', unused: true});
  colors.push({color: 'green', unused: true});
  colors.push({color: 'blue', unused: true});
  colors.push({color: 'yellow', unused: true});

  createjs.SpriteSheetUtils.addFlippedFrames(spriteSheet, true, true, false);

  addNewPlayer({
    id: myId,
    spritex: canvas.width / 2,
    spritey: canvas.height / 2,
    updown: 0,
    leftright: 0,
    facingLeftright: -1
  });

  viewModel.newGameReset();
  viewModel.gameStarted(true);

  console.log(myId);

  sendDataOnRealtimeRoute('joinRoom');
  socket.on('youMove', setCharacterMovementFromSocket);

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

function tick() {
  var now = Date.now();
  var deltaTime = now - lastTime;

  // generate enemies
  if (now - lastEnemyTime > enemyInterval) {
    generateZombie();
    enemyInterval = Math.floor(Math.random() * 1000) + 2000;
    lastEnemyTime = now;
  }

  var zombies = _.where(characters, {ownerId: myId});

  // establish targeting and attacks by enemies
  if (now - lastPlayerLockTime > 50) {
    for (var i = 0; i < zombies.length; i++) {
      zombies[i].lockOnPlayer();

      if (zombies[i].shouldAttack && now - zombies[i].lastAttackTime > 500)
      {
        zombies[i].attemptAttack();
        zombies[i].lastAttackTime = now;
      }

      zombies[i].establishDirection();
      lastPlayerLockTime = now;
    }
  }

  // move all of the characters
  for (var id = 0; id < characters.length; id++)
    if (characters[id]) {
      characters[id].move(deltaTime);

      // remove characters that are out of health
      if (characters[id].health <= 0)
        characters[id].die();
    }

  // sort depth layers
  var sortedCharacters = _.sortBy(characters, function (character) {
    return character.sprite.y;
  });
  stage.removeAllChildren();
  for (var i = 0; i < sortedCharacters.length; i++)
    stage.addChild(sortedCharacters[i].sprite);

  //heartbeat every 500 ms
  if (now - lastHeartbeatTime > 500) {
    sendDataOnRealtimeRoute('iMove');
    lastHeartbeatTime = now;
  }

  if (now - lastDeadCharacterPurgeTime > 10000)
  {
    deadCharacterIds = _.filter(deadCharacterIds, function (id) {
      return now - id.time > 10000;
    });
    lastDeadCharacterPurgeTime = now;
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
        if (!keyPressedSpace) {
          player.justAttacked = true;
          keyPressedSpace = true;
          player.handleAttackOn('zombie');
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
  data.chars = [];

  var player = _.find(characters, {id: myId});
  if (player)
    player.appendDataToMessage(data);

  var zombies = _.where(characters, {ownerId: myId});
  for (var i = 0; i < zombies.length; i++)
    zombies[i].appendDataToMessage(data);

  data.damaged = [];


  var zombies = _.where(characters, {damaged: true});
  for (var i = 0; i < zombies.length; i++)
    zombies[i].appendDamagedDataToMessage(data);

  socket.emit(messsageRoute, data);
}

function setCharacterMovementFromSocket(data) {
  console.log("receiving data");

  var playerFound = _.find(characters, {id: data.playerId});
  var playerData = _.find(data.chars, {id: data.playerId});
  if (playerFound && playerData)
    playerFound.updatePositionAndVelocity(playerData);
  else if (playerData && !_.any(deadCharacterIds, {id: data.playerId}))
    addNewPlayer(playerData);

  var zombieDataList = _.where(data.chars, {ownerId: data.playerId});
  for (var i = 0; i < zombieDataList.length; i++) {
    var zombieFound = _.find(characters, {id: zombieDataList[i].id});
    var zombieData = _.find(data.chars, {id: zombieDataList[i].id});

    if (zombieFound && zombieData)
      zombieFound.updatePositionAndVelocity(zombieData);
    else if (zombieData && !_.any(deadCharacterIds, {id: zombieDataList[i].id}))
      addNewZombie(zombieData);
  }

  var damagedZombieDataList = _.where(data.damaged, {ownerId: myId});
  for (var i = 0; i < damagedZombieDataList.length; i++) {
    var zombieFound = _.find(characters, {id: damagedZombieDataList[i].id});
    var zombieData = _.find(data.damaged, {id: damagedZombieDataList[i].id});

    if (zombieFound && zombieData)
      zombieFound.takeDamage(zombieData.damage);
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
    color: pickNewPlayerColor(),
    characterType: 'player',
    health: 100
  }));
}

function pickNewPlayerColor() {
  var colorIndex = Math.floor(Math.random() * 4);
  var result = false;
  for (var i = 0; i < colors.length; i++) {
    if (colors[colorIndex].unused) {
      result = colors[colorIndex].color;
      colors[colorIndex].unused = false;
      break;
    }

    colorIndex = (colorIndex + 1) % colors.length;
  }
  return result;
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
    color: 'zombie',
    characterType: 'zombie',
    targetId: characterData.targetId,
    health: 100
  }));
}

function generateZombie() {
  var x;
  if (dieRoll(2))
    x = -50;
  else
    x = 550;

  addNewZombie({
    id: uuid.v4(),
    spritex: x,
    spritey: Math.floor(Math.random() * 220) + 200,
    updown: 0,
    leftright: 0,
    facingLeftright: 1,
    ownerId: myId,
    targetId: myId
  });
}

function dieRoll (numberOfSides) {
  return Math.floor(Math.random() * numberOfSides) == 1;
}