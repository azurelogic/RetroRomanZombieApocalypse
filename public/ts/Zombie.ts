import * as _ from "lodash";
import Sprite = createjs.Sprite;
import {Globals} from "./main";
import {Character} from "./Character";

export class Zombie extends Character {
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