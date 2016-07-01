import * as _ from "lodash";
import Sprite = createjs.Sprite;
import {Globals} from "./main";

export abstract class Character {
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
