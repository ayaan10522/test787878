// Core Game Logic for Multiplayer Soccer
const screenSize = { width: 1152, height: 768 };
const playerConfig = { moveSpeed: 200, jumpPower: -500, slideSpeed: 350 };
const ballConfig = { maxSpeed: 800, normalKickForce: 450 };

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, characterType, playerSide) {
        const texture = characterType === 'messi' ? 'player1_idle_frame1' : 'player2_idle_frame1';
        super(scene, x, y, texture);
        this.playerSide = playerSide;
        this.characterType = characterType;
        this.facingRight = playerSide === 'left';
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setScale(0.25); 
        this.setOrigin(0.5, 1);
        
        // Custom body size
        this.body.setSize(100, 450);
        this.body.setOffset(50, 50);
    }

    update(keys) {
        if (!this.body) return;

        let vx = 0;
        if (keys.left.isDown) {
            vx = -playerConfig.moveSpeed;
            this.facingRight = false;
        } else if (keys.right.isDown) {
            vx = playerConfig.moveSpeed;
            this.facingRight = true;
        }
        
        this.setVelocityX(vx);
        this.setFlipX(!this.facingRight);

        if (keys.up.isDown && this.body.blocked.down) {
            this.setVelocityY(playerConfig.jumpPower);
        }
    }
}

class Ball extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'soccer_ball');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCircle(25);
        this.setBounce(0.8);
        this.setCollideWorldBounds(true);
        this.setDrag(100);
        this.setScale(0.5);
    }
}

class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene');
    }

    preload() {
        this.load.image('soccer_field_background', 'https://cdn-game-mcp.gambo.ai/676085e5-65fe-4db4-85cb-3be2f7a27e14/images/clean_soccer_field_background.png');
        this.load.image('soccer_ball', 'https://cdn-game-mcp.gambo.ai/5c66fbc0-7e63-4a2d-800d-14a844f5c1e0/images/soccer_ball.png');
        this.load.image('player1_idle_frame1', 'https://cdn-game-mcp.gambo.ai/b81f2b2f-0ae0-4d02-b06a-9ffbbf27614b/animations/messi_idle_R/frame_1.png');
        this.load.image('player2_idle_frame1', 'https://cdn-game-mcp.gambo.ai/d515e62f-46fe-4011-85b6-2dce3bc71fe8/animations/ronaldo_idle_R/frame_1.png');
        this.load.image('goal_left', 'https://cdn-game-mcp.gambo.ai/004e6037-b271-4ba5-86d3-cba18a7ddc4d/images/fixed_goal_left.png');
        this.load.image('goal_right', 'https://cdn-game-mcp.gambo.ai/6561a879-0e5d-4397-b358-e2757f44865e/images/fixed_goal_right.png');
        
        let loadingText = this.add.text(576, 384, 'Loading...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    }

    create() {
        this.scene.start('GameScene');
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.matchId = data.matchId;
        this.isHost = data.isHost;
        this.myChar = data.myChar || 'messi';
        this.otherChar = data.otherChar || 'ronaldo';
        this.player1Score = 0;
        this.player2Score = 0;
    }

    create() {
        this.add.image(576, 384, 'soccer_field_background');
        
        // Goals
        this.add.image(50, 648, 'goal_left').setOrigin(0.5, 1).setScale(0.8);
        this.add.image(1102, 648, 'goal_right').setOrigin(0.5, 1).setScale(0.8).setFlipX(true);

        const p1Char = this.isHost ? this.myChar : this.otherChar;
        const p2Char = this.isHost ? this.otherChar : this.myChar;

        this.player1 = new Player(this, 150, 648, p1Char, 'left');
        this.player2 = new Player(this, 1002, 648, p2Char, 'right');
        this.ball = new Ball(this, 576, 384);

        this.physics.add.collider(this.player1, this.ball);
        this.physics.add.collider(this.player2, this.ball);
        this.physics.add.collider(this.player1, this.player2);

        // Input setup
        this.p1Keys = this.input.keyboard.addKeys({
            up: 'W', left: 'A', down: 'S', right: 'D', kick: 'SPACE'
        });
        this.p2Keys = this.input.keyboard.createCursorKeys();

        // Score UI
        this.scoreText = this.add.text(576, 50, '0 - 0', { fontSize: '48px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        window.currentScene = this;
    }

    update() {
        if (window.isInputFocused) {
            this.player1.setVelocityX(0);
            this.player2.setVelocityX(0);
            return;
        }

        const myKeys = this.isHost ? this.p1Keys : this.p2Keys;
        const myPlayer = this.isHost ? this.player1 : this.player2;
        
        myPlayer.update(myKeys);

        // Goal detection (simple)
        if (this.ball.x < 50 && this.ball.y > 500) {
            this.goalScored(2);
        } else if (this.ball.x > 1102 && this.ball.y > 500) {
            this.goalScored(1);
        }
    }

    goalScored(playerNum) {
        if (playerNum === 1) this.player1Score++;
        else this.player2Score++;
        
        this.scoreText.setText(`${this.player1Score} - ${this.player2Score}`);
        this.resetBall();
    }

    resetBall() {
        this.ball.setPosition(576, 384);
        this.ball.setVelocity(0, 0);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1152,
    height: 768,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1000 }, debug: false }
    },
    scene: [LoadingScene, GameScene]
};

window.startGame = (data) => {
    if (window.game) window.game.destroy(true);
    window.game = new Phaser.Game(config);
    // Game will start with LoadingScene automatically
    // We need to pass data to GameScene when it starts
    window.game.events.once('ready', () => {
        window.game.scene.start('LoadingScene', data);
    });
};
