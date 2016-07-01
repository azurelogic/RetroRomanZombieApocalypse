import * as _ from "lodash";
import Sprite = createjs.Sprite;
import {Globals} from "./main";

abstract class Character {
    id: string;
    sprite: Sprite;
    updown: number; //todo convert to Enum
    leftright: number; //todo convert to Enum
    facingLeftright: number; //todo convert to Enum
    color: string; //todo convert to Enum
    characterType: string;
    justAttacked: boolean;
    velocityFactor: number;
    damageRadius: number;
    damageRadiusSquared: number;
    damageRating: number;
    health: number;
    killedBy: string;
    stageBoundTrap: boolean;
    localAttackAnimationComplete: boolean;
    lastUpdateTime: number;
    dead: boolean;
    //todo convert to Enum

    // Character constructor
    constructor(options) {
        // setup Character common properties from options object as needed
        this.id = options.id;
        this.sprite = new createjs.Sprite(Globals.spriteSheet);
        this.sprite.x = options.x;
        this.sprite.y = options.y;
        this.updown = options.updown;
        this.leftright = options.leftright;
        this.facingLeftright = this.leftright;
        this.color = options.color;
        this.characterType = options.characterType;
        this.justAttacked = false;
        this.velocityFactor = .08;
        this.damageRadius = 60;
        this.damageRadiusSquared = this.damageRadius * this.damageRadius;
        this.damageRating = 50;
        this.health = options.health;
        this.killedBy = null;
        this.stageBoundTrap = false;
        this.localAttackAnimationComplete = false;
        this.lastUpdateTime = Date.now();
        this.dead = false;

        // add sprite to the stage
        Globals.stage.addChild(this.sprite);
        Globals.stage.update();

        // setup animations on sprite sheet
        Globals.spriteSheet.getAnimation(this.color + 'stand').next = this.color + 'stand';
        Globals.spriteSheet.getAnimation(this.color + 'stand_h').next = this.color + 'stand_h';
        Globals.spriteSheet.getAnimation(this.color + 'walk').next = this.color + 'walk';
        Globals.spriteSheet.getAnimation(this.color + 'walk_h').next = this.color + 'walk_h';

        // start animation standing
        this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
    };

    abstract die();

    // updates character animation based on current direction components
    updateAnimation() {
        if ((this.updown != 0 || this.leftright != 0))
            this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
        else
            this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
    };

    // handles character movement based on current direction vector
    move(deltaTime) {
        // vertical/horizontal motiion
        if (this.updown == 0 || this.leftright == 0) {
            this.sprite.x += this.leftright * deltaTime * this.velocityFactor;
            this.sprite.y += this.updown * deltaTime * this.velocityFactor;
        }
        // diagonal motion
        else {
            this.sprite.x += this.leftright * deltaTime * this.velocityFactor * 0.70711;
            this.sprite.y += this.updown * deltaTime * this.velocityFactor * 0.70711;
        }

        // set trap variable once a character enters the game area
        if (!this.stageBoundTrap && (this.sprite.x < 470 && this.sprite.x > 30))
            this.stageBoundTrap = true;

        // ensure character doesn't leave the game area if trap variable is set
        if (this.stageBoundTrap) {
            if (this.sprite.x < 30)
                this.sprite.x = 30;
            else if (this.sprite.x > 470)
                this.sprite.x = 470;
        }
        if (this.sprite.y < 200)
            this.sprite.y = 200;
        else if (this.sprite.y > 420)
            this.sprite.y = 420;

        // kill weird x-bound escapees
        if (this.sprite.x > 560 || this.sprite.x < -60)
            this.dead = true;

        // fix remote character animations
        if (this.localAttackAnimationComplete) {
            this.updateAnimation();
            this.localAttackAnimationComplete = false;
        }
    };

    // assemble the animation name based on character color, animation
    // type, and current direction
    getAnimationNameFor(animationType) {
        if (this.facingLeftright == 1)
            return this.color + animationType + '_h';
        else
            return this.color + animationType;
    };

    // ----- motion handling function section -----
    // these functions set the direction of motion, direction the
    // character faces, and the current animation based on which
    // key is being pressed or released
    startLeftMotion() {
        this.leftright = -1;
        this.facingLeftright = this.leftright;
        this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    };

    startRightMotion() {
        this.leftright = 1;
        this.facingLeftright = this.leftright;
        this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    };

    startUpMotion() {
        this.updown = -1;
        this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    };

    startDownMotion() {
        this.updown = 1;
        this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
    };

    stopLeftRightMotion() {
        if (this.leftright != 0)
            this.facingLeftright = this.leftright;

        this.leftright = 0;
        this.updateAnimation();
    };

    stopUpDownMotion() {
        this.updown = 0;
        this.updateAnimation();
    };

    // handles collision detection and damage delivery to opposing character type
    handleAttackOn(enemyType) {
        // start the attack animation
        this.startAttackMotion();

        // find the local models of the enemy type
        var opposingForces: any[] = _.filter(Globals.characters, {characterType: enemyType});

        // perform collision detection with all opposing forces
        for (var i = 0; i < opposingForces.length; i++) {
            // don't bother with detailed collisions if out of damage radius range
            if (opposingForces[i].sprite.x > this.sprite.x + this.damageRadius ||
                opposingForces[i].sprite.x < this.sprite.x - this.damageRadius ||
                opposingForces[i].sprite.y > this.sprite.y + this.damageRadius ||
                opposingForces[i].sprite.y < this.sprite.y - this.damageRadius)
                continue;

            // calculate x and y distances
            var x = this.sprite.x - opposingForces[i].sprite.x;
            var y = this.sprite.y - opposingForces[i].sprite.y;

            // deliver damage if within damage radius and in the correct direction;
            // this is essentially a semicircle damage area in front of the character
            // with a little wrap around the back
            if (x * x + y * y <= this.damageRadiusSquared &&
                (opposingForces[i].sprite.x - this.sprite.x) * this.facingLeftright >= -10)
                opposingForces[i].takeDamage(this.damageRating, this);
        }
    };

    // stop character from moving and start playing attack animation
    startAttackMotion() {
        this.updown = 0;
        this.leftright = 0;
        this.sprite.gotoAndPlay(this.getAnimationNameFor('attack'));
    };

    // handle taking damage, marking characters as dead, and
    // updating viewmodel for local player's health
    takeDamage(damageAmount, attacker?) {
        // decrement character health
        this.health -= damageAmount;

        // mark 0 health characters as dead
        if (this.health <= 0) {
            this.dead = true;

            // mark who killed it -> used for points calculations
            if (attacker)
                this.killedBy = attacker.id;
        }

        // update health on viewmodel for knockout if local player was damaged
        if (this.id == Globals.localPlayerId)
            Globals.viewModel.health(this.health);
    };

}

class Player extends Character {
    constructor(options) {
        // call base class constructor
        super(options);

        // setup player attack animation follow up
        Globals.spriteSheet.getAnimation(this.color + 'attack').next = this.color + 'stand';
        Globals.spriteSheet.getAnimation(this.color + 'attack_h').next = this.color + 'stand_h';
    };


// appends player data to message
    appendDataToMessage(data) {
        data.chars.push({
            id: this.id,
            leftright: this.leftright,
            facingLeftright: this.facingLeftright,
            updown: this.updown,
            spritex: this.sprite.x,
            spritey: this.sprite.y,
            justAttacked: this.justAttacked
        });

        // set update time on local models
        this.lastUpdateTime = Date.now();
    };

// updates local character model based on data in characterData
    updateLocalCharacterModel(characterData) {
        // update position/direction and health data
        this.sprite.x = characterData.spritex;
        this.sprite.y = characterData.spritey;
        this.updown = 0.8 * characterData.updown;
        this.leftright = 0.8 * characterData.leftright;
        this.facingLeftright = characterData.facingLeftright;

        // mark as updated
        this.lastUpdateTime = Date.now();

        // handle motion and attacks
        if (characterData.justAttacked) {
            // ensure that attack animation from remote characters complete
            this.sprite.on('animationend', () => this.localAttackAnimationComplete = true);
            this.handleAttackOn('zombie');
        }
        else
            this.updateAnimation();
    };

// handle player death
    die() {
        // add to dead list and mark as dead
        Globals.deadCharacterIds.push({id: this.id, time: Date.now()});
        this.dead = true;

        // update viewmodel and notify other players if local player died
        if (this.id == Globals.localPlayerId) {
            Globals.viewModel.dead(true);
            document.onkeydown = null;
            document.onkeyup = null;
            Globals.socket.emit('localPlayerDied', {playerId: Globals.localPlayerId, roomId: Globals.viewModel.currentRoomId()});
        }

        // release the color being used by the player
        var color: any = <any>(_.find(Globals.colors, {color: this.color}));
        color.unused = true;
    };
}

class Zombie extends Character {
    ownerId: string;
    targetId: string;
    damaged: boolean;
    damageTaken: number;
    attemptRadius: number;
    attemptRadiusSquared: number;
    canAttemptAttack: boolean;
    lastAttackAttemptTime: number;
    lastPlayerLockTime: number;
    stopMoving: boolean;
    private notRunningAttackAnimation: boolean;

    constructor(options) {
        // append color to options
        options.color = 'zombie';
        // call base class constructor
        super(options);

        // setup Zombie specific properties from options object as needed
        this.ownerId = options.ownerId;
        this.targetId = options.targetId;
        this.velocityFactor = .05;
        this.damageRating = 10;
        this.damaged = false;
        this.damageTaken = 0;
        this.damageRadius = 40;
        this.attemptRadius = 70;
        this.attemptRadiusSquared = this.attemptRadius * this.attemptRadius;
        this.notRunningAttackAnimation = true;
        this.canAttemptAttack = false;
        this.lastAttackAttemptTime = 0;
        this.lastPlayerLockTime = 0;
        this.stopMoving = false;

        // setup player attack animation follow up
        Globals.spriteSheet.getAnimation(this.color + 'attack').next = this.color + 'walk';
        Globals.spriteSheet.getAnimation(this.color + 'attack_h').next = this.color + 'walk_h';

        // setup attack animation end handler that ensures local zombie attack animations complete
        this.sprite.on('animationend', (event) => {
            var {target:sprite, name:animationName} = <any>event;
            if (animationName.indexOf('attack') != -1) {
                sprite.notRunningAttackAnimation = true;
                this.updateAnimation();
            }
        });
    };

    takeDamage(damageAmount, attacker?) {
        super.takeDamage(damageAmount, attacker);

        // mark zombies as damaged
            this.damaged = true;
            this.damageTaken += damageAmount;
    }

// appends zombie data to message
    appendDataToMessage(data) {
        data.chars.push({
            id: this.id,
            leftright: this.leftright,
            facingLeftright: this.facingLeftright,
            updown: this.updown,
            spritex: this.sprite.x,
            spritey: this.sprite.y,
            justAttacked: this.justAttacked,
            ownerId: this.ownerId,
            targetId: this.targetId,
            health: this.health
        });

        // set update time on local models
        this.lastUpdateTime = Date.now();
    };

// appends zombie damage data to message
    appendDamagedDataToMessage(data) {
        data.damaged.push({
            id: this.id,
            ownerId: this.ownerId,
            damage: this.damageTaken
        });

        this.damaged = false;
    };

// updates local character model based on data in characterData
    updateLocalCharacterModel(characterData) {
        // update position/direction and health data
        this.sprite.x = characterData.spritex;
        this.sprite.y = characterData.spritey;
        this.updown = 0.8 * characterData.updown;
        this.leftright = 0.8 * characterData.leftright;
        this.facingLeftright = characterData.facingLeftright;
        if (this.characterType == 'zombie')
            this.health = characterData.health;

        // mark as updated
        this.lastUpdateTime = Date.now();

        // handle motion and attacks
        if (characterData.justAttacked) {
            // ensure that attack animation from remote characters complete
            this.sprite.on('animationend', () => this.localAttackAnimationComplete = true);
            this.handleAttackOn('player');
        }
        else
            this.updateAnimation();
    };

// handle zombie targeting nearest player
    lockOnPlayer() {
        // extract players from characters array
        var players = _.filter(Globals.characters, {characterType: 'player'});
        // get array of ids and distances from zombie
        var playerMaps = _.map(players, _.bind(function (player) {
            var x = this.sprite.x - player.sprite.x;
            var y = this.sprite.y - player.sprite.y;
            return {
                id: player.id,
                distanceSquared: x * x + y * y
            };
        }, this));
        // set target to character that is closest by finding the minimum distance
        var closestPlayerMap:any = _.minBy(playerMaps, _.bind(function (playerMap) {
            // mark to allow attack attempt
            this.canAttemptAttack = playerMap.distanceSquared <= this.attemptRadiusSquared;
            // mark to stop moving when very close to player
            this.stopMoving = playerMap.distanceSquared <= 100;
            // return the distance
            return playerMap.distanceSquared;
        }, this));
        if (closestPlayerMap)
            this.targetId = closestPlayerMap.id;
    };

// decide if the zombie should attempt to attack
    setToAttack() {
        // turn off attack attempt flag
        this.canAttemptAttack = false;
        this.justAttacked = true;
    };

// establishes the best direction for the zombie and handles initiating the attack
    determineDirectionsAndActions() {
        // find the target player model
        var targetPlayer:any = _.find(Globals.characters, {id: this.targetId});

        // if target player does not exist anymore, try to find a new target instead
        if (!targetPlayer) {
            this.lockOnPlayer();
            return;
        }

        var updown = 0;
        var leftright = 0;

        // if attacking or too close to move, set movement components to 0
        if (this.justAttacked || this.stopMoving) {
            updown = 0;
            leftright = 0;

            // handle attacks
            if (this.justAttacked) {
                this.notRunningAttackAnimation = false;
                this.handleAttackOn('player');
            }
        }
        // otherwise, calculate best direction to chase target player
        else {
            // calculate absolute value of slope
            var absoluteSlope = Math.abs((targetPlayer.sprite.y - this.sprite.y) / (targetPlayer.sprite.x - this.sprite.x));

            // set direction towards target player based on slope and differences in x and y
            if (absoluteSlope > 0.414)
                updown = 1;
            if (absoluteSlope < 2.414)
                leftright = 1;
            if (targetPlayer.sprite.y < this.sprite.y)
                updown *= -1;
            if (targetPlayer.sprite.x < this.sprite.x)
                leftright *= -1;

            // update correct facing direction
            if (leftright != 0)
                this.facingLeftright = leftright;
        }

        // if direction has changed, set actual vector variables and change animation as needed
        if (updown != this.updown || leftright != this.leftright) {
            this.updown = updown;
            this.leftright = leftright;

            // prevent animation changes during attack animation
            if (this.notRunningAttackAnimation) {
                this.updateAnimation();
            }
        }
    };

// handle zombie death and award points
    die() {
        // award points on viewmodel if killed by local player
        if (this.killedBy == Globals.localPlayerId)
            Globals.viewModel.awardPoints(50);

        Globals.deadCharacterIds.push({id: this.id, time: Date.now()});
        this.dead = true;
    };
}
export {Character, Player, Zombie};