import * as _ from "lodash";
import Sprite = createjs.Sprite;
import {Globals} from "./main";
import {Character} from "./Character";

export class Player extends Character {
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
