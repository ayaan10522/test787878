// Core Game Logic for Multiplayer Soccer
const screenSize = { width: 1152, height: 768 };
const playerConfig = { moveSpeed: 400, jumpPower: -700 };
const ballConfig = { maxSpeed: 1000 };

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, characterType, playerSide, isLocal) {
        const texture = characterType === 'messi' ? 'player1_idle_frame1' : 'player2_idle_frame1';
        super(scene, x, y, texture);
        this.playerSide = playerSide;
        this.characterType = characterType;
        this.isLocal = isLocal;
        this.facingRight = playerSide === 'left';
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCollideWorldBounds(true);
        this.setScale(0.25); 
        this.setOrigin(0.5, 1);
        
        // Body setup
        this.body.setSize(200, 500);
        this.body.setOffset(50, 20);
        
        if (!isLocal) {
            this.body.setAllowGravity(false);
            this.body.setImmovable(true);
        }
    }

    update(keys) {
        if (!this.isLocal || !this.body) return;

        let vx = 0;
        if (keys.left.isDown || keys.A.isDown) {
            vx = -playerConfig.moveSpeed;
            this.facingRight = false;
        } else if (keys.right.isDown || keys.D.isDown) {
            vx = playerConfig.moveSpeed;
            this.facingRight = true;
        }
        
        this.setVelocityX(vx);
        this.setFlipX(!this.facingRight);

        if ((keys.up.isDown || keys.W.isDown) && this.body.blocked.down) {
            this.setVelocityY(playerConfig.jumpPower);
        }
    }
}

class Ball extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'soccer_ball');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setCircle(120); 
        this.setBounce(0.8);
        this.setCollideWorldBounds(true);
        this.setDrag(100, 50);
        this.setScale(0.15); 
        this.body.setOffset(150, 150);
        this.body.setMaxVelocity(ballConfig.maxSpeed);
    }
}

class LoadingScene extends Phaser.Scene {
    constructor() { super('LoadingScene'); }
    init(data) { this.startData = data; }
    preload() {
        const loadingText = this.add.text(576, 384, 'LOADING ASSETS...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // Progress bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(376, 420, 400, 50);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x3b82f6, 1);
            progressBar.fillRect(386, 430, 380 * value, 30);
        });

        // Assets
        this.load.image('soccer_field_background', 'https://cdn-game-mcp.gambo.ai/676085e5-65fe-4db4-85cb-3be2f7a27e14/images/clean_soccer_field_background.png');
        this.load.image('soccer_ball', 'https://cdn-game-mcp.gambo.ai/5c66fbc0-7e63-4a2d-800d-14a844f5c1e0/images/soccer_ball.png');
        this.load.image('player1_idle_frame1', 'https://cdn-game-mcp.gambo.ai/b81f2b2f-0ae0-4d02-b06a-9ffbbf27614b/animations/messi_idle_R/frame_1.png');
        this.load.image('player2_idle_frame1', 'https://cdn-game-mcp.gambo.ai/d515e62f-46fe-4011-85b6-2dce3bc71fe8/animations/ronaldo_idle_R/frame_1.png');
        this.load.image('goal_left', 'https://cdn-game-mcp.gambo.ai/004e6037-b271-4ba5-86d3-cba18a7ddc4d/images/fixed_goal_left.png');
        this.load.image('goal_right', 'https://cdn-game-mcp.gambo.ai/6561a879-0e5d-4397-b358-e2757f44865e/images/fixed_goal_right.png');
    }
    create() {
        this.scene.start('GameScene', this.startData);
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init(data) {
        this.matchId = data.matchId;
        this.isHost = data.isHost;
        this.myChar = data.myChar || 'messi';
        this.otherChar = data.otherChar || 'ronaldo';
        this.player1Score = 0;
        this.player2Score = 0;
    }

    create() {
        const bg = this.add.image(576, 384, 'soccer_field_background');
        bg.setDisplaySize(1152, 768);
        
        const groundY = 648;

        // Goals Visuals
        this.goalL = this.add.image(60, groundY, 'goal_left').setOrigin(0.5, 1).setScale(0.8);
        this.goalR = this.add.image(1092, groundY, 'goal_right').setOrigin(0.5, 1).setScale(0.8).setFlipX(true);

        // Goal Physics (invisible bars for real collision)
        this.goalBars = this.physics.add.staticGroup();
        // Left Goal: Top bar and back post
        this.goalBars.add(this.add.rectangle(60, groundY - 280, 140, 20, 0xffffff, 0)); // Crossbar
        this.goalBars.add(this.add.rectangle(10, groundY - 140, 20, 280, 0xffffff, 0)); // Back post
        
        // Right Goal: Top bar and back post
        this.goalBars.add(this.add.rectangle(1092, groundY - 280, 140, 20, 0xffffff, 0));
        this.goalBars.add(this.add.rectangle(1142, groundY - 140, 20, 280, 0xffffff, 0));

        // Players
        const p1Char = this.isHost ? this.myChar : this.otherChar;
        const p2Char = this.isHost ? this.otherChar : this.myChar;

        this.player1 = new Player(this, 250, groundY, p1Char, 'left', this.isHost);
        this.player2 = new Player(this, 902, groundY, p2Char, 'right', !this.isHost);
        this.ball = new Ball(this, 576, groundY - 100);

        // Collisions
        this.physics.add.collider(this.player1, this.ball);
        this.physics.add.collider(this.player2, this.ball);
        this.physics.add.collider(this.player1, this.player2);
        this.physics.add.collider(this.ball, this.goalBars);

        // Input
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,UP,LEFT,DOWN,RIGHT');

        // Score UI
        this.scoreText = this.add.text(576, 80, '0 - 0', { 
            fontSize: '64px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 
        }).setOrigin(0.5);

        window.currentScene = this;
    }

    update() {
        if (window.isInputFocused) {
            this.player1.setVelocityX(0);
            this.player2.setVelocityX(0);
            return;
        }

        this.player1.update(this.keys);
        this.player2.update(this.keys);

        // Only host checks for goals
        if (this.isHost) {
            // Precise goal detection: check if ball is inside the goal area
            if (this.ball.x < 80 && this.ball.y > 648 - 280) this.goalScored(2);
            else if (this.ball.x > 1072 && this.ball.y > 648 - 280) this.goalScored(1);
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
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false } },
    scene: [LoadingScene, GameScene]
};

window.startGame = (data) => {
    if (window.game) window.game.destroy(true);
    window.game = new Phaser.Game(config);
    setTimeout(() => { window.game.scene.start('LoadingScene', data); }, 100);
};
