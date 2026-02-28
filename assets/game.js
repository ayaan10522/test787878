// Core Game Logic for Multiplayer Soccer
const screenSize = { width: 1152, height: 768 };
const playerConfig = { moveSpeed: 300, jumpPower: -600, slideSpeed: 350 };
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
        
        // Custom body size for better collision
        this.body.setSize(200, 500);
        this.body.setOffset(50, 20);
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
        
        this.setCircle(120); // Scaled for the asset
        this.setBounce(0.8);
        this.setCollideWorldBounds(true);
        this.setDrag(100);
        this.setScale(0.15); // Smaller ball
        this.body.setOffset(150, 150);
    }
}

class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene');
    }

    init(data) {
        this.startData = data;
    }

    preload() {
        this.load.image('soccer_field_background', 'https://cdn-game-mcp.gambo.ai/676085e5-65fe-4db4-85cb-3be2f7a27e14/images/clean_soccer_field_background.png');
        this.load.image('soccer_ball', 'https://cdn-game-mcp.gambo.ai/5c66fbc0-7e63-4a2d-800d-14a844f5c1e0/images/soccer_ball.png');
        this.load.image('player1_idle_frame1', 'https://cdn-game-mcp.gambo.ai/b81f2b2f-0ae0-4d02-b06a-9ffbbf27614b/animations/messi_idle_R/frame_1.png');
        this.load.image('player2_idle_frame1', 'https://cdn-game-mcp.gambo.ai/d515e62f-46fe-4011-85b6-2dce3bc71fe8/animations/ronaldo_idle_R/frame_1.png');
        this.load.image('goal_left', 'https://cdn-game-mcp.gambo.ai/004e6037-b271-4ba5-86d3-cba18a7ddc4d/images/fixed_goal_left.png');
        this.load.image('goal_right', 'https://cdn-game-mcp.gambo.ai/6561a879-0e5d-4397-b358-e2757f44865e/images/fixed_goal_right.png');
        
        this.add.text(576, 384, 'Loading Game...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    }

    create() {
        this.scene.start('GameScene', this.startData);
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
        // Background
        const bg = this.add.image(576, 384, 'soccer_field_background');
        bg.setDisplaySize(1152, 768);
        
        // Ground level is roughly 648
        const groundY = 648;

        // Goals - Adjusted positions and scale
        this.goalLeft = this.add.image(80, groundY, 'goal_left').setOrigin(0.5, 1).setScale(0.6);
        this.goalRight = this.add.image(1072, groundY, 'goal_right').setOrigin(0.5, 1).setScale(0.6).setFlipX(true);

        const p1Char = this.isHost ? this.myChar : this.otherChar;
        const p2Char = this.isHost ? this.otherChar : this.myChar;

        this.player1 = new Player(this, 200, groundY, p1Char, 'left');
        this.player2 = new Player(this, 952, groundY, p2Char, 'right');
        this.ball = new Ball(this, 576, groundY - 100);

        this.physics.add.collider(this.player1, this.ball);
        this.physics.add.collider(this.player2, this.ball);
        this.physics.add.collider(this.player1, this.player2);

        // Input setup
        this.p1Keys = this.input.keyboard.addKeys({
            up: 'W', left: 'A', down: 'S', right: 'D', kick: 'SPACE'
        });
        this.p2Keys = this.input.keyboard.createCursorKeys();

        // Score UI
        this.scoreText = this.add.text(576, 80, '0 - 0', { 
            fontSize: '64px', 
            fill: '#fff', 
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

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

        // Simple goal detection logic
        if (this.ball.x < 100 && this.ball.y > 450) {
            this.goalScored(2);
        } else if (this.ball.x > 1052 && this.ball.y > 450) {
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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1200 }, debug: false }
    },
    scene: [LoadingScene, GameScene]
};

window.startGame = (data) => {
    if (window.game) {
        window.game.destroy(true);
    }
    window.game = new Phaser.Game(config);
    // Use timeout to ensure canvas is ready
    setTimeout(() => {
        window.game.scene.start('LoadingScene', data);
    }, 100);
};
