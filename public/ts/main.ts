import _ from "lodash";
import ko from "knockout";
import io from "socket.io";
import * as uuid from "node-uuid";

import {Character} from './Character'
import {Player} from './Player'
import {Zombie} from './Zombie'

enum Keycode {
    Space = 32,
    Up = 38,
    Left = 37,
    Right = 39,
    Down = 40
}

class Globals {
    static canvas;
    static stage;
    static background;
    static spritesImage;
    static spriteSheet: createjs.SpriteSheet;
    static characters: Character[];
    static deadCharacterIds: any[];
    static colors;
    static socket;
    static localPlayerId: string;
    static lastTime: number;
    static lastHeartbeatTime: number;
    static lastAttackTime: number;
    static lastDeadCharacterPurgeTime: number;
    static enemyInterval: number;
    static lastEnemyTime: number;
    static keyPressedDown: boolean;
    static keyPressedUp: boolean;
    static keyPressedLeft: boolean;
    static keyPressedRight: boolean;
    static keyPressedSpace: boolean;
    static viewModel;
    static sendLocalPlayerMotion: boolean;
}

// initialize the whole game site
function init() {
    // attach the easelJS stage to the canvas
    Globals.canvas = document.getElementById("gameCanvas");
    Globals.stage = new createjs.Stage(Globals.canvas);

    // initialize arrays
    Globals.characters = [];
    Globals.deadCharacterIds = [];

    // setup the viewmodel for knockout
    var viewModelMaker = function () {
        var self = this;

        // in game data
        self.points = ko.observable();
        self.health = ko.observable();
        self.gameStarted = ko.observable();
        self.currentRoomId = ko.observable();
        self.dead = ko.observable();

        // room stats
        self.totalRooms = ko.observable();
        self.playersInRooms = ko.observable();

        // room list
        self.rooms = ko.observableArray();

        // this initiates room join with server
        self.joinRoom = function (room) {
            var data: any = {};
            data.playerId = Globals.localPlayerId;
            data.roomId = room.roomId;
            Globals.socket.emit('joinRoom', data);
        };

        // requests updated room list from server
        self.getRoomUpdate = function () {
            Globals.socket.emit('getRooms');
        };

        // returns player to room list
        self.returnToRoomList = function () {
            Globals.socket.emit('leaveRoom', {roomId: Globals.viewModel.currentRoomId()});
            Globals.stage.removeAllChildren();
            Globals.stage.removeAllEventListeners();
            self.getRoomUpdate();
            self.gameStarted(false);
        };

        // adds points to current score
        self.awardPoints = function (points) {
            self.points(self.points() + points);
        };

        // resets game state for a new game
        self.newGameReset = function () {
            self.points(0);
            self.health(100);
            self.gameStarted(false);
            self.dead(false);
        };
    };

    // instantiate viewmodel and register with knockout
    Globals.viewModel = new viewModelMaker();
    ko.applyBindings(Globals.viewModel);

    // connect to server
    Globals.socket = io(location.protocol + '//' + location.host, {path: '/sockets/rrza'});

    // register callbacks for server messages
    Globals.socket.on('connectionReply', loadRoomsAndMyId);
    Globals.socket.on('roomJoined', startGame);
    Globals.socket.on('updatedRoomList', updateRooms);
    Globals.socket.on('connectionRefused', Globals.viewModel.getRoomUpdate);
    Globals.socket.on('clientReceive', handleGameDataReceivedFromServer);
    Globals.socket.on('playerDisconnected', handlePlayerDisconnect);
    Globals.socket.on('remotePlayerDied', handlePlayerDied);
    Globals.socket.emit('playerConnect');

    // load background
    Globals.background = new createjs.Bitmap("/images/colosseum.png");

    // load sprite sheet
    Globals.spritesImage = new Image();
    Globals.spritesImage.onload = handleImageLoad;
    Globals.spritesImage.src = "/images/sprites.png";
}

// sets player id and room data from server message
function loadRoomsAndMyId(data) {
    Globals.localPlayerId = data.playerId;
    updateRooms(data);
}

// updates room stats and list from data message
function updateRooms(data) {
    Globals.viewModel.totalRooms(data.totalRooms);
    Globals.viewModel.playersInRooms(data.playersInRooms);
    Globals.viewModel.rooms(data.rooms);
}

function handlePlayerDisconnect(data) {
    handlePlayerDied(data);

    // clean up abandoned zombies
    _.map(Globals.characters, function (character) {
        if (character.characterType == 'zombie' && (<Zombie>character).ownerId == data.playerId)
            character.die();
    });
}

function handlePlayerDied(data) {
    //trigger player death
    _.find(Globals.characters, {id: data.playerId}).die();
}

// parses spritesheet image into animations on an easelJS spritesheet object
function handleImageLoad() {
    // data about the organization of the sprite sheet
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
            bluewalk: { frames: [1, 0, 2, 0], speed: 0.2 },
            blueattack: { frames: [0, 3, 4, 3], speed: 0.2 },
            greenstand: 5,
            greenwalk: { frames: [6, 5, 7, 5], speed: 0.2 },
            greenattack: { frames: [5, 8, 9, 8], speed: 0.2 },
            redstand: 10,
            redwalk: { frames: [11, 10, 12, 10], speed: 0.2 },
            redattack: { frames: [10, 13, 14, 13], speed: 0.2 },
            yellowstand: 15,
            yellowwalk: { frames: [16, 15, 17, 15], speed: 0.2 },
            yellowattack: { frames: [15, 18, 19, 18], speed: 0.2 },
            zombiestand: 20,
            zombiewalk: { frames: [21, 20, 22, 20], speed: 0.1 },
            zombieattack: { frames: [20, 23, 24, 23], speed: 0.1 }
        }
    };

    // initialize the spritesheet object
    Globals.spriteSheet = new createjs.SpriteSheet(spriteData);
}

// start a game
function startGame(data) {
    // set the room id based on server message
    Globals.viewModel.currentRoomId(data.roomId);

    // initialize time trackers
    Globals.lastTime = 0;
    Globals.lastHeartbeatTime = 0;
    Globals.lastAttackTime = 0;
    Globals.lastEnemyTime = 0;
    Globals.lastDeadCharacterPurgeTime = 0;
    Globals.enemyInterval = 1000;

    // set key press flags to false
    Globals.keyPressedDown = false;
    Globals.keyPressedUp = false;
    Globals.keyPressedLeft = false;
    Globals.keyPressedRight = false;
    Globals.keyPressedSpace = false;
    Globals.sendLocalPlayerMotion = false;

    // clear arrays
    Globals.characters.length = 0;
    Globals.deadCharacterIds.length = 0;

    // strip stage and add background
    Globals.stage.removeAllChildren();
    Globals.stage.removeAllEventListeners();
    Globals.stage.addChild(Globals.background);

    // setup player colors
    Globals.colors = [];
    Globals.colors.push({color: 'red', unused: true});
    Globals.colors.push({color: 'green', unused: true});
    Globals.colors.push({color: 'blue', unused: true});
    Globals.colors.push({color: 'yellow', unused: true});

    // add vertically and horizontally flipped animations to spritesheet
    createjs.SpriteSheetUtils.addFlippedFrames(Globals.spriteSheet, true, true, false);

    // instantiate local player
    addNewPlayer({
        id: Globals.localPlayerId,
        spritex: Globals.canvas.width / 2,
        spritey: Globals.canvas.height / 2,
        updown: 0,
        leftright: 0,
        facingLeftright: -1
    });

    // reset viewmodel game state
    Globals.viewModel.newGameReset();
    // set flag that game has started
    Globals.viewModel.gameStarted(true);

    // attach key press functions to document events
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    // set preferred frame rate to 60 frames per second and
    // use requestanimationframe if available
    createjs.Ticker.useRAF = true;
    createjs.Ticker.setFPS(60);

    // start the game loop
    if (!createjs.Ticker.hasEventListener("tick")) {
        createjs.Ticker.addEventListener("tick", tick);
    }
}

// main game loop
function tick() {
    // get current time
    var now = Date.now();

    // get difference in time since last frame
    // this makes the game logic run independent of frame rate
    var deltaTime = now - Globals.lastTime;

    // generate enemies
    if (now - Globals.lastEnemyTime > Globals.enemyInterval) {
        generateZombie();
        Globals.enemyInterval = Math.floor(Math.random() * 2000) + 2000;
        Globals.lastEnemyTime = now;
    }

    // establish targeting and attacks by enemies
    var zombies = <Zombie[]>_.filter(Globals.characters, {ownerId: Globals.localPlayerId});
    for (var i = 0; i < zombies.length; i++) {
        if (now - zombies[i].lastPlayerLockTime > 51) {
            zombies[i].lockOnPlayer();
            zombies[i].lastPlayerLockTime = now;
        }
        if (zombies[i].canAttemptAttack &&
            now - zombies[i].lastAttackAttemptTime > Math.floor(Math.random() * 500) + 500) {
            zombies[i].setToAttack();
            zombies[i].lastAttackAttemptTime = now;
        }
        zombies[i].determineDirectionsAndActions();
    }

    // move all of the characters
    for (var i = 0; i < Globals.characters.length; i++)
        if (Globals.characters[i])
            Globals.characters[i].move(deltaTime);

    // sort depth layers by reinsertion based on y value
    var sortedCharacters = _.sortBy(Globals.characters, function (character) {
        return character.sprite.y;
    });
    // strip the stage
    Globals.stage.removeAllChildren();
    // reinsert the stage
    Globals.stage.addChild(Globals.background);
    // reinsert the characters in sorted order
    for (var i = 0; i < sortedCharacters.length; i++)
        Globals.stage.addChild(sortedCharacters[i].sprite);

    // determine if any local models attacked
    var localModelAttacked = _.some(Globals.characters, function (character) {
        if (!character.justAttacked)
            return false;
        if (character.characterType == 'player' && character.id == Globals.localPlayerId)
            return true;
        if (character.characterType == 'zombie' && (<Zombie>character).ownerId == Globals.localPlayerId)
            return true;
        return false;
    });

    // send game data if motion occurred, any local character attacked,
    // or just a heartbeat every 500 milliseconds
    if (Globals.sendLocalPlayerMotion || localModelAttacked || now - Globals.lastHeartbeatTime > 500) {
        Globals.sendLocalPlayerMotion = false;
        sendGameDataToServer();
        Globals.lastHeartbeatTime = now;
    }

    // fixes for characters that need to happen after sending game data
    for (var i = 0; i < Globals.characters.length; i++) {
        // reset justAttacked flags for all characters
        Globals.characters[i].justAttacked = false;

        // remove characters that are out of health or have not been updated
        if (Globals.characters[i].health <= 0 || now - Globals.characters[i].lastUpdateTime > 3000)
            Globals.characters[i].die();
    }

    // strip the dead from characters array;
    // sprite will not be reinserted to stage during sorting on next tick
    Globals.characters = _.filter(Globals.characters, {dead: false});

    // todo revisit this logic
    // purge dead characters after they have been dead more than 10 seconds
    if (now - Globals.lastDeadCharacterPurgeTime > 3001) {
        Globals.deadCharacterIds = _.filter(Globals.deadCharacterIds, function (id) {
            return now - id.time > 3001;
        });
        Globals.lastDeadCharacterPurgeTime = now;
    }

    // update stage graphics
    Globals.stage.update();
    Globals.lastTime = now;
}

// handle key down event - returns true for non game keys, false otherwise
function handleKeyDown(e) {
    // use common key handling code with custom switch callback
    return handleKeySignals(e, function (e, player) {
        var nonGameKeyPressed = true;
        switch (e.keyCode) {
            case Keycode.Left:
                if (!Globals.keyPressedLeft) {
                    Globals.keyPressedLeft = true;
                    player.startLeftMotion();
                }
                nonGameKeyPressed = false;
                break;
            case Keycode.Right:
                if (!Globals.keyPressedRight) {
                    Globals.keyPressedRight = true;
                    player.startRightMotion();
                }
                nonGameKeyPressed = false;
                break;
            case Keycode.Down:
                if (!Globals.keyPressedDown) {
                    Globals.keyPressedDown = true;
                    player.startDownMotion();
                }
                nonGameKeyPressed = false;
                break;
            case  Keycode.Up:
                if (!Globals.keyPressedUp) {
                    Globals.keyPressedUp = true;
                    player.startUpMotion();
                }
                nonGameKeyPressed = false;
                break;
            case Keycode.Space:
                if (!Globals.keyPressedSpace) {
                    player.justAttacked = true;
                    Globals.keyPressedSpace = true;
                    player.handleAttackOn('zombie');
                }
                nonGameKeyPressed = false;
                break;
        }
        // return necessary to tell the browser whether it should handle the
        // key separately; don't want game keys being passed back to the
        // browser
        return nonGameKeyPressed;
    });
}

// handle key up event - returns true for non game keys, false otherwise
function handleKeyUp(e) {
    // use common key handling code with custom switch callback
    return handleKeySignals(e, function (e, player) {
        var nonGameKeyPressed = true;
        switch (e.keyCode) {
            case Keycode.Left:
                Globals.keyPressedLeft = false;
                player.stopLeftRightMotion();
                nonGameKeyPressed = false;
                break;
            case Keycode.Right:
                Globals.keyPressedRight = false;
                player.stopLeftRightMotion();
                nonGameKeyPressed = false;
                break;
            case Keycode.Down:
                Globals.keyPressedDown = false;
                player.stopUpDownMotion();
                nonGameKeyPressed = false;
                break;
            case Keycode.Up:
                Globals.keyPressedUp = false;
                player.stopUpDownMotion();
                nonGameKeyPressed = false;
                break;
            case Keycode.Space:
                Globals.keyPressedSpace = false;
                nonGameKeyPressed = false;
                break;
        }
        // return necessary to tell the browser whether it should handle the
        // key separately; don't want game keys being passed back to the
        // browser
        return nonGameKeyPressed;
    });
}

// common code for key up/down events;
// takes a callback for handling unique elements of each
function handleKeySignals(e, switchHandler) {
    if (!e)
        e = window.event;
    var player = _.find(Globals.characters, {id: Globals.localPlayerId});
    var lastLeftright = player.leftright;
    var lastUpdown = player.updown;
    var nonGameKeyPressed = switchHandler(e, player);

    if (!nonGameKeyPressed && (lastLeftright != player.leftright || lastUpdown != player.updown || player.justAttacked))
        Globals.sendLocalPlayerMotion = true;
    return nonGameKeyPressed;
}

// sends current player's game state to server
function sendGameDataToServer() {
    // initialize data message
    var data: any = {};

    // attach room and player ids
    data.roomId = Globals.viewModel.currentRoomId();
    data.playerId = Globals.localPlayerId;

    // initialize character array
    data.chars = [];

    // find local player and pack player data on message
    var player = <Player>_.find(Globals.characters, {id: Globals.localPlayerId});
    if (player)
        player.appendDataToMessage(data);

    // find zombies owned by local player and pack their data on message
    var zombies = <Zombie[]>_.filter(Globals.characters, {ownerId: Globals.localPlayerId});
    for (var i = 0; i < zombies.length; i++)
        zombies[i].appendDataToMessage(data);

    // initialize damaged enemy array
    data.damaged = [];

    // find zombies that local player has damaged and pack their
    // data on message for updating their owner
    var zombies = <Zombie[]>_.filter(Globals.characters, {damaged: true});
    for (var i = 0; i < zombies.length; i++)
        zombies[i].appendDamagedDataToMessage(data);

    // ship data to the server
    Globals.socket.emit('clientSend', data);
}

// callback for handling game data shipped from the server;
// parses through the data and calls appropriate functions
// to sync the local game model with the received data
function handleGameDataReceivedFromServer(data) {
    // find local model of remote player
    var playerFound = <Player>_.find(Globals.characters, {id: data.playerId});
    // extract remote player data from data message
    var playerData = _.find(data.chars, {id: data.playerId});
    // if player exists, update local representation model
    if (playerFound && playerData)
        playerFound.updateLocalCharacterModel(playerData);
    // when player does not exist and was not recently killed, add them
    else if (playerData && !_.some(Globals.deadCharacterIds, {id: data.playerId}))
        addNewPlayer(playerData);

    // extract models of remotely owned enemies from data message
    var zombieDataList: any[] = _.filter(data.chars, {ownerId: data.playerId});
    // iterate over zombies being updated
    for (var i = 0; i < zombieDataList.length; i++) {
        // find local model of remote zombie
        var zombieFound = <Zombie>_.find(Globals.characters, {id: zombieDataList[i].id});
        // extract specific remote zombie data from data message
        var zombieData: any = _.find(data.chars, {id: zombieDataList[i].id});
        // if zombie exists, update local representation model
        if (zombieFound && zombieData)
            zombieFound.updateLocalCharacterModel(zombieData);
        // when zombie does not exist and was not recently killed, add them
        else if (zombieData && !_.some(Globals.deadCharacterIds, {id: zombieDataList[i].id}))
            addNewZombie(zombieData);
    }

    // remove zombies that are no longer being updated
    var localZombiesModelsForIncomingData: any[] = _.filter(data.chars, {ownerId: data.playerId});
    for (var i = 0; i < localZombiesModelsForIncomingData.length; i++) {
        if (!_.some(zombieDataList, {id: localZombiesModelsForIncomingData[i].id}))
            localZombiesModelsForIncomingData[i].die();
    }


    // find local models of damaged zombies that local player owns
    var damagedZombieDataList: any[] = _.filter(data.damaged, {ownerId: Globals.localPlayerId});
    // iterate over damaged zombies being updated
    for (var i = 0; i < damagedZombieDataList.length; i++) {
        // find local model of local zombie
        var zombieFound = <Zombie>_.find(Globals.characters, {id: damagedZombieDataList[i].id});
        // extract damage model for zombie
        var zombieData: any = _.find(data.damaged, {id: damagedZombieDataList[i].id});
        // if matches are found, issue damage to the local model
        if (zombieFound && zombieData)
            zombieFound.takeDamage(zombieData.damage);
    }
}

// create a new local model for a player based on options object
function addNewPlayer(options) {
    // add the new player to the characters array
    Globals.characters.push(new Player({
        id: options.id,
        x: options.spritex,
        y: options.spritey,
        updown: options.updown,
        leftright: options.leftright,
        facingLeftright: options.facingLeftright,
        color: pickNewPlayerColor(),
        characterType: 'player',
        health: 100
    }));
}

// randomly issue an unused player color for a new player
function pickNewPlayerColor() {
    // start at a random color
    var colorIndex = Math.floor(Math.random() * 4);
    var result = false;
    // iterate over the colors array looking for the first unused color
    for (var i = 0; i < Globals.colors.length; i++) {
        if (Globals.colors[colorIndex].unused) {
            result = Globals.colors[colorIndex].color;
            Globals.colors[colorIndex].unused = false;
            break;
        }
        colorIndex = (colorIndex + 1) % Globals.colors.length;
    }
    // return the first unused color found
    return result;
}

// create a new local model for a zombie based on options object
function addNewZombie(options) {
    // add the new zombie to the characters array
    Globals.characters.push(new Zombie({
        id: options.id,
        x: options.spritex,
        y: options.spritey,
        updown: options.updown,
        leftright: options.leftright,
        facingLeftright: options.facingLeftright,
        ownerId: options.ownerId,
        color: 'zombie',
        characterType: 'zombie',
        targetId: options.targetId,
        health: 100
    }));
}

// sets the coordinates of a new zombie and calls to add it locally
function generateZombie() {
    // pick left or right side of stage to spawn
    var x;
    if (Math.floor(Math.random() * 2) == 1)
        x = -50;
    else
        x = 550;

    // add the new zombie
    addNewZombie({
        id: uuid.v4(),
        spritex: x,
        spritey: Math.floor(Math.random() * 220) + 200,
        updown: 0,
        leftright: 0,
        facingLeftright: 1,
        ownerId: Globals.localPlayerId,
        targetId: Globals.localPlayerId
    });
}
console.log('about to call init');
init();
console.log('called init');

export {Globals};