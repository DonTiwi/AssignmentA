import Phaser from 'phaser';

class MyGame extends Phaser.Scene {
    constructor() {
        super();
        this.lastDirection = 'Right'; // Initialize lastDirection as a class-level variable
        this.runState = 0;
        this.runTimer = 0;
        this.canJump = true;
        this.controlsEnabled = true; // Initialize controlsEnabled as true
    }

    preload() {
        // Context for each direction
        const marioLeftContext = require.context('./assets/Mario/MarioLeft', false, /\.png$/);
        const marioRightContext = require.context('./assets/Mario/MarioRight', false, /\.png$/);

        // Get all the keys for each context
        const states = ['Climb', 'Duck', 'Idle', 'Jump', 'JumpFalling', 'RunEnd', 'RunMiddle', 'RunStart', 'Sit'];
        states.forEach(state => {
            // Use the context to dynamically require the image
            const leftImg = marioLeftContext(`./MarioLeft_${state}.png`);
            const rightImg = marioRightContext(`./MarioRight_${state}.png`);

            // Debugging line
            console.log("Loading: ", leftImg, rightImg);

            // Load the image into Phaser
            this.load.image(`MarioLeft_${state}`, leftImg);
            this.load.image(`MarioRight_${state}`, rightImg);
        });

        // Load the sceneries
        const blockContext = require.context('./assets/Blocks', false, /\.png$/);
        const sceneryContext = require.context('./assets/Scenery', false, /\.png$/);

        const blockKey = blockContext.keys();
        blockKey.forEach((key) => {
        const itemKey = key.replace('./', '').replace('.png', '');
        this.load.image(itemKey, blockContext(key));

        });

        const sceneryKey = sceneryContext.keys();
        sceneryKey.forEach((key) => {
        const itemKey = key.replace('./', '').replace('.png', '');
        this.load.image(itemKey, sceneryContext(key));
        
        });

        const replayButtonContext = require.context('./assets', false, /replayBtn\.png$/);
        const replayBtnImg = replayButtonContext('./replayBtn.png');
        this.load.image('replayButton', replayBtnImg);


    }

    create() {
        // Function to create a set of blocks
        function createBlockSet(blocks, startX, startY, pattern, repeat = 1, gap = 0, additionalBlocks = null) {
            let x = startX;
            let y = startY;

            for (let r = 0; r < repeat; r++) {
                pattern.forEach((blockType) => {
                    const block = blocks.create(x, y, blockType).setOrigin(.5, 1);
                    block.body.setOffset(0, -10);
                    x += 16 + gap; 
                });
            }

            // Create additional blocks
            if (additionalBlocks) {
                for (const { relX, relY, type } of additionalBlocks) {
                    const block = blocks.create(startX + relX, startY + relY, type).setOrigin(.5, 1);
                    block.body.setOffset(0, -10);
                }
            }
        }

        // Function to handle hitting blocks
        const hitBlock = (_mario, block) => {
            if (block.texture.key === 'BlockQuestion') {
                block.setTexture('BlockUsed');
                
                // Spawn a coin above the block
                const coin = coins.create(block.x, block.y - 20, 'CoinFront');
                coin.setVelocityY(-300);
                coin.setCollideWorldBounds(true);
                coin.setBounce(0.6);
                coin.setDepth(1);
                this.physics.add.collider(coin, [ground, blocks]);

                // center the collision box
                coin.body.setSize(16, 16);
                coin.body.setOffset(-5.5, 0);

                // Start the spinning animation
                coin.setScale(1.5, 1);
                coin.anims.play('spin', true);
            }
        };

        // Coin animation        
        this.anims.create({
            key: 'spin',
            frames: [
                { key: 'CoinFront' },
                { key: 'CoinSideLight' },
                { key: 'CoinBackDark' },
                { key: 'CoinBackLight' }
            ],
            frameRate: 6,
            repeat: -1
        });

        // Function to collect coins
        function collectCoin(_mario, coin) {
            coin.destroy();
            // Increase the score
            score += 10;
            // Update the score display
            scoreText.setText('Score: ' + score);
        }

        // Function to create a set of blocks
        function createStairs(blocks, startX, startY, width, height, blockType, direction = 'normal') {
            let x = startX;
            let y = startY;
            let stepWidth = 16;  // Width of each step in pixels
            let stepHeight = 16; // Height of each step in pixels

            // Calculate the number of steps horizontally and vertically
            let numStepsX = Math.floor(width / stepWidth);
            let numStepsY = Math.floor(height / stepHeight);

            // Loop through each step
            for (let stepY = 0; stepY < numStepsY; stepY++) {
                // Reset x-coordinate for each row
                x = (direction === 'normal') ? startX : startX + width - stepWidth;

                for (let stepX = 0; stepX < numStepsX; stepX++) {
                    const block = blocks.create(x, y, blockType).setOrigin(.5, 1);
                    block.body.setOffset(0, -10);

                    // Update x-coordinate based on direction
                    if (direction === 'normal') {
                        x += stepWidth;
                    } else {
                        x -= stepWidth;
                    }
                }

                // Update y-coordinate for the next row
                y -= stepHeight;

                // Reduce the width for the next row of steps
                numStepsX--;
            }
        }

        // Score variable
        let score = 0;
        let scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000'});
        scoreText.setScrollFactor(0); // Make the score text stay in place
        scoreText.setDepth(1); // Ensure the score text is on top of everything else

        // Timer variable
        this.timerStarted = false;
        this.timerEvent = null;
        

        // Keyboard input
        this.moveKeys = this.input.keyboard.addKeys({
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            W: Phaser.Input.Keyboard.KeyCodes.W,
            S: Phaser.Input.Keyboard.KeyCodes.S
        });
        
        this.timer = 0.00;
        this.timerText = this.add.text(16, 48, 'Time: 0', { fontSize: '32px', fill: '#000'});
        this.timerText.setScrollFactor(0); // Make the timer text stay in place
        this.timerText.setDepth(1); // Ensure the timer text is on top of everything else

        this.replayButton = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'replayButton').setInteractive();
        this.replayButton.setScrollFactor(0); // Ensure the button doesn't move with the camera
        this.replayButton.visible = false;
        this.replayButton.setDepth(1); // Ensure the button is on top of everything else
        this.replayButton.setInteractive();
        this.replayButton.on('pointerdown', restartGame, this);

        function restartGame() {
            this.scene.restart();
        }

        // Set world bounds first
        this.physics.world.setBounds(0, 0, 4500, 600); 

        // Set camera bounds
        this.cameras.main.setBounds(0, 0, 4500, 600);

        // Create Mario
        // ! Change mario spawn position here
        this.mario = this.physics.add.sprite(100, 450, 'MarioRight_Idle');
        this.mario.setBounce(0.2);
        this.mario.setCollideWorldBounds(true);
        this.mario.body.onWorldBounds = true;
        this.mario.setDepth(1);

        // Set camera to follow Mario
        this.cameras.main.startFollow(this.mario);

        // Add this new collider for Mario and flagpole for when he wins
        let gameWon = false;
        const flagpole = this.physics.add.staticGroup();
        // !Hell! This was a cockblock
        this.physics.add.collider(this.mario, flagpole, () => {
            if (!gameWon) {
                gameWon = true; // Set the game state to won
                this.controlsEnabled = false; // Disable controls

                this.mario.setBounce(0); // Ensure no bounce
                this.mario.body.setAllowGravity(false); //disable gravity
                this.mario.setVelocityX(0); // Stop any horizontal movement
                
                // Glide Mario down to the ground
                this.tweens.add({
                    targets: this.mario,
                    y: 534, // Ground level
                    duration: 2000, // Time in ms
                    onComplete: () => {
                        // Make Mario run to the castle
                        this.tweens.add({
                            targets: this.mario,
                            x: 4300, // Castle position
                            y: 534,  // Ground level
                            duration: 3000, // Time in ms
                            onStart: () => {
                                this.mario.anims.play('MarioRight_Run', true); // Play running animation
                            },
                            onComplete: () => {
                                this.mario.anims.play('right-idle', true);
                                
                                // Stop the timer
                                if (this.timerStarted) {
                                    this.timerStarted = false;
                                    if (this.timerEvent) {
                                        this.timerEvent.remove();
                                    }
                                }

                                // Show the replay button
                                this.replayButton.visible = true;
                            }
                        });
                    }
                });
            }
        });

        // canJump variable
        this.canJump = true;

        // Initialize runState and runTimer
        this.runState = 0;
        this.runTimer = 0;

        // Mario animations
        const states = ['Climb', 'Duck', 'Idle', 'Jump', 'JumpFalling', 'RunEnd', 'RunMiddle', 'RunStart', 'Sit'];
        states.forEach(state => {
            this.anims.create({
                key: `right-${state.toLowerCase()}`,
                frames: [{ key: `MarioRight_${state}` }],
                frameRate: 20
            });
            this.anims.create({
                key: `left-${state.toLowerCase()}`,
                frames: [{ key: `MarioLeft_${state}` }],
                frameRate: 20
            });
        });

        // Mario running sequence for right. Used after hitting the pole so he runs to the castle
        this.anims.create({
            key: 'MarioRight_Run',
            frames: [
                { key: 'MarioRight_RunStart' },
                { key: 'MarioRight_RunMiddle' },
                { key: 'MarioRight_RunEnd' }
            ],
            frameRate: 10,
            repeat: -1 // Infinite loop
        });

        // Keyboard input
        this.cursors = this.input.keyboard.addKeys('W,A,S,D');
        this.controlsEnabled = true;

        // Create ground
        const ground = this.physics.add.staticGroup({
            key: 'ground',
            repeat: 300,  // Increase this number to extend the ground
            setXY: { x: 0, y: 570, stepX: 16 }
        });

        let gap1Start = 1420;
        let gap1End = 1452;

        let gap2Start = 1850;
        let gap2End = 1892;

        let gap3Start = 3290;
        let gap3End = 3329;

        let blocksToDestroy = []; // Create an empty array to store the blocks to destroy to create gaps in the ground

        ground.children.iterate((block) => {
            if (block) {  // Check if block is not undefined
                let blockX = block.getBottomLeft().x; // Get the x-coordinate of the block

                // Check if the block is within the gap ranges
                if ((blockX >= gap1Start && blockX <= gap1End) || (blockX >= gap2Start && blockX <= gap2End) || (blockX >= gap3Start && blockX <= gap3End)) {
                    blocksToDestroy.push(block);  // Add the block to the list of blocks to destroy
                } else {
                    block.setTexture('BlockFloor');
                    block.setDisplaySize(16, 16);
                    block.body.setSize(16, 16);
                    block.setOrigin(1, 1);
                }
            }
        });

        // Destroy the blocks that are in the gaps
        blocksToDestroy.forEach((block) => {
            block.destroy();
        });

        // Collision between Mario and ground
        this.physics.add.collider(this.mario, ground, () => {
            if (gameWon) {
                this.mario.setVelocityY(0); // Stop any vertical movement
            }
            this.canJump = true;
        });

        // If mario is touching the bottom bound of the world, kill him and restart the game
        this.physics.world.on('worldbounds', (body) => {
            if (body.gameObject === this.mario) {
                this.mario.setTint(0xff0000);
                this.mario.anims.play('right-idle', true);
                this.physics.pause();
                this.time.delayedCall(1000, () => {
                    this.scene.restart();
                });
            }
        });

        // Scenery for non-collidable objects
        const scenery = this.physics.add.staticGroup();

        // Separate group for pipes
        const pipes = this.physics.add.staticGroup();
        this.physics.add.collider(this.mario, pipes);

        // Seperate group for blocks
        const blocks = this.physics.add.staticGroup();
        const coins = this.physics.add.group();

        this.physics.add.collider(this.mario, blocks, hitBlock, null, this);
        this.physics.add.collider(this.mario, coins, collectCoin, null, this);

        // Hills [HillLarge, HillSmall]
        function createHills(scenery) {
            scenery.create(100, 554, 'HillLarge').setOrigin(.5, 1);
            scenery.create(400, 554, 'HillSmall').setOrigin(.5, 1);
            scenery.create(1050, 554, 'HillLarge').setOrigin(.5, 1);
            scenery.create(1320, 554, 'HillSmall').setOrigin(.5, 1);
            scenery.create(2100, 554, 'HillLarge').setOrigin(.5, 1);
            scenery.create(2500, 554, 'HillSmall').setOrigin(.5, 1);
            scenery.create(3200, 554, 'HillLarge').setOrigin(.5, 1);
            scenery.create(3430, 554, 'HillSmall').setOrigin(.5, 1);
            scenery.create(3970, 554, 'HillLarge').setOrigin(.5, 1);
            scenery.create(4400, 554, 'HillSmall').setOrigin(.5, 1);
        }

        // Clouds [CloudLarge, CloudSmall, CloudMedium]
        // ! This is a small mess, but it works. Fucker took a while to make them dynamically scale with viepoet height change
        function createClouds(scenery, gameHeight) {
            const cloudPositions = [600, 501, 700, 900, 1100, 1330, 1500, 1700, 1900, 2520, 2600, 2700, 3050, 3200, 3100, 3940, 3700, 4000, 4350];
            const cloudTypes = ['CloudSmall', 'CloudSmall', 'CloudLarge', 'CloudMedium', 'CloudSmall', 'CloudSmall', 'CloudLarge', 'CloudMedium', 'CloudSmall', 'CloudSmall', 'CloudLarge', 'CloudMedium', 'CloudSmall', 'CloudSmall', 'CloudLarge', 'CloudMedium', 'CloudSmall', 'CloudLarge', 'CloudSmall'];

            for (let i = 0; i < cloudPositions.length; i++) {
                let height = gameHeight - Math.floor(Math.random() * 150);
                scenery.create(cloudPositions[i], height, cloudTypes[i]).setOrigin(.5, 1);
            }
        }

        // Bushes [BushLarge, BushSmall, BushMedium]
        function createBushes(scenery) {
            scenery.create(350, 554, 'BushLarge').setOrigin(.5, 1);
            scenery.create(500, 554, 'BushSmall').setOrigin(.5, 1);
            scenery.create(900, 554, 'BushMedium').setOrigin(.5, 1);
            scenery.create(1250, 554, 'BushLarge').setOrigin(.5, 1);
            scenery.create(1500, 554, 'BushSmall').setOrigin(.5, 1);
            scenery.create(1930, 554, 'BushMedium').setOrigin(.5, 1);
            scenery.create(2435, 554, 'BushLarge').setOrigin(.5, 1);
            scenery.create(2670, 554, 'BushSmall').setOrigin(.5, 1);
            scenery.create(3080, 554, 'BushMedium').setOrigin(.5, 1);
            scenery.create(3550, 554, 'BushSmall').setOrigin(.5, 1);
        }

        // Castle and Flag [Castle, Flag]
        function createCastleAndFlag(scenery, flagpole) {
            scenery.create(4300, 554, 'Castle').setOrigin(.5, 1);

            const flag = flagpole.create(4050, 554, 'Flag').setOrigin(.5, 1);
            flag.body.setSize(5, 150);  // Set the width to 5 and keep the height at 80
            flag.body.setOffset(12, -70); // Adjust the x-offset to center the collision box
        }

        // Pipes [PipeTop, PipeMiddle]
        function createPipes(pipes) {
            const pipe = pipes.create(650, 554, 'PipeTop').setOrigin(.5, 1);
            pipe.body.setOffset(0, -15);

            const pipe2_TOP = pipes.create(800, 538, 'PipeTop').setOrigin(.5, 1);
            const pipe2_MIDDLE = pipes.create(800, 554, 'PipeMiddle').setOrigin(.5, 1);         
            pipe2_TOP.body.setOffset(0, -15);
            pipe2_MIDDLE.body.setOffset(0, -5);

            const pipe3_TOP = pipes.create(1000, 522, 'PipeTop').setOrigin(.5, 1);
            const pipe3_MIDDLE = pipes.create(1000, 538, 'PipeMiddle').setOrigin(.5, 1);
            const pipe3_BOTTOM = pipes.create(1000, 555, 'PipeMiddle').setOrigin(.5, 1);
            pipe3_TOP.body.setOffset(0, -15);
            pipe3_MIDDLE.body.setOffset(0, -5);
            pipe3_BOTTOM.body.setOffset(0, 5);

            const pipe4_TOP = pipes.create(1200, 522, 'PipeTop').setOrigin(.5, 1);
            const pipe4_MIDDLE = pipes.create(1200, 538, 'PipeMiddle').setOrigin(.5, 1);
            const pipe4_BOTTOM = pipes.create(1200, 555, 'PipeMiddle').setOrigin(.5, 1);
            pipe4_TOP.body.setOffset(0, -15);
            pipe4_MIDDLE.body.setOffset(0, -5);
            pipe4_BOTTOM.body.setOffset(0, 5);

            const pipe5_TOP = pipes.create(3500, 538, 'PipeTop').setOrigin(.5, 1);
            const pipe5_MIDDLE = pipes.create(3500, 554, 'PipeMiddle').setOrigin(.5, 1);
            pipe5_TOP.body.setOffset(0, -15);
            pipe5_MIDDLE.body.setOffset(0, -5);
        }

        // Blocks [BlockFloor, BlockQuestion, BlockBrick, BlockUsed, BlockStairs]
        function createBlocks(blocks) {
            const block = blocks.create(380, 500, 'BlockQuestion').setOrigin(.5, 1);
            block.body.setOffset(0, -10);

            const blockPattern1 = ['BlockBrick', 'BlockQuestion', 'BlockBrick', 'BlockQuestion', 'BlockBrick'];
            const additionalBlocks1 = [{ relX: 32, relY: -80, type: 'BlockQuestion' }];

            const blockPattern2 = ['BlockBrick', 'BlockQuestion', 'BlockBrick'];

            // For blockPattern1 and blockPattern2, no repetition and no gap is needed, so repeat is set to 1 and gap is omitted
            createBlockSet(blocks, 500, 500, blockPattern1, 1, 0, additionalBlocks1);
            createBlockSet(blocks, 1650, 500, blockPattern2, 1, 0, null);

            // For blockPattern3, you want to repeat the 'BlockBrick' 9 times with no gap, so repeat is set to 9 and gap is 0
            const blockPattern3 = ['BlockBrick'];
            createBlockSet(blocks, 1698, 420, blockPattern3, 9, 0, null);

            const blockPattern4 = ['BlockBrick', 'BlockBrick', 'BlockBrick', "BlockQuestion"];
            const additionalBlocks2 = [{ relX: 48, relY: 80, type: 'BlockBrick' }];
            // For blockPattern4, no repetition and no gap is needed, so repeat is set to 1 and gap is 0
            createBlockSet(blocks, 1950, 420, blockPattern4, 1, 0, additionalBlocks2);

            // For this blockPattern3, you want to repeat it 3 times with no gap, so repeat is set to 2 and gap is 0
            createBlockSet(blocks, 2150, 500, blockPattern3, 3, 0, null);

            // For this blockPattern5, you want to repeat it 3 times with a gap of 16, so repeat is set to 3 and gap is 16 with 1 additional block above the center. All are question blocks
            const blockPattern5 = ['BlockQuestion'];
            const additionalBlocks3 = [{ relX: 64, relY: -80, type: 'BlockQuestion' }];
            createBlockSet(blocks, 2350, 500, blockPattern5, 3, 16*3, additionalBlocks3);

            createBlockSet(blocks, 2650, 500, blockPattern3, 1, 0, null);
            createBlockSet(blocks, 2698, 420, blockPattern3, 3, 0, null);

            const blockPattern6 = ['BlockBrick', 'BlockQuestion', 'BlockQuestion', "BlockBrick"];
            const additionalBlocks4 = [{ relX: 24, relY: 80, type: 'BlockBrick' }];
            createBlockSet(blocks, 2850, 420, blockPattern6, 1, 0, additionalBlocks4);

            createStairs(blocks, 3000, 554, 64, 64, 'BlockStairs' , 'reversed');
            createStairs(blocks, 3110, 554, 64, 64, 'BlockStairs' );
            createStairs(blocks, 3240, 554, 64, 64, 'BlockStairs' , 'reversed');
            //! CANT GET IT IN PERFECT POSITION!!!!!!!!!! 🤬
            createStairs(blocks, 3345, 554, 64, 64, 'BlockStairs' );

            // ! Coin block in this bitch aint working... LET ME SLEEP!
            const blockPattern7 = ['BlockBrick', 'BlockBrick', "BlockQuestion", 'BlockBrick'];
            createBlockSet(blocks, 3600, 500, blockPattern7, 1, 0, null);

            createStairs(blocks, 3750, 554, 144, 144, 'BlockStairs' , 'reversed');
        }

        // Scenery
        createHills(scenery);
        createClouds(scenery, this.game.config.height);
        createBushes(scenery);
        createCastleAndFlag(scenery, flagpole);
        createPipes(pipes);
        createBlocks(blocks);

    }   

    update() {
        // Increment runTimer
        this.runTimer++;

        // Timer stuff
        if ((this.moveKeys.A.isDown || this.moveKeys.D.isDown || this.moveKeys.W.isDown || this.moveKeys.S.isDown) && !this.timerStarted) {
            this.timerStarted = true;
            this.timerEvent = this.time.addEvent({
                delay: 10,
                callback: () => {
                    this.timer += 0.01;
                    this.timerText.setText('Time: ' + this.timer.toFixed(2)); 
                },
                loop: true
            });
        }
        if (this.controlsEnabled === false && this.timerStarted) {
            this.timerStarted = false;
            if (this.timerEvent) {
                this.timerEvent.remove();
            }
        }

        // Only allow controls if they are enabled
        if (this.controlsEnabled) {
            // Handle ducking (S key)
            // ! The little bitch clips if moved right after ducking! 02:28 Kill me! Delay doesn't solve it!
            // * Petting dog helps
            if (this.cursors.S.isDown) {
                this.mario.setVelocityX(0);
                this.mario.setTexture('MarioRight_Duck');
                this.mario.body.setSize(16, 24); // Set new collision box size
            }
            // Handle right movement (D key)
            else if (this.cursors.D.isDown) {
                this.handleMovement(160, 'Right');
            }
            // Handle left movement (A key)
            else if (this.cursors.A.isDown) {
                this.handleMovement(-160, 'Left');
            }
            // Handle idle state
            else {
                this.mario.setVelocityX(0);
                this.mario.play(`${this.lastDirection.toLowerCase()}-idle`, true);
                this.mario.body.setSize(16, 32); // Reset collision box size to original dimensions
            }
            // Handle jumping (W key)
            if (this.cursors.W.isDown && this.canJump && !this.cursors.S.isDown) {
                this.handleJump();
            }
        }
        // Check if Mario is touching the ground
        if (this.mario.body.touching.down) {
            this.canJump = true;
        }
    }

    // Function to handle movement
    handleMovement(velocity, direction) {
        this.mario.setVelocityX(velocity);
        this.lastDirection = direction;

        
        if (this.runTimer % 10 === 0) {
            const runStates = ['RunStart', 'RunMiddle', 'RunEnd'];
            this.mario.setTexture(`Mario${direction}_${runStates[this.runState]}`);
            this.runState = (this.runState + 1) % 3;
        }
    }

    // Function to handle jumping
    handleJump() {
        this.mario.setVelocityY(-300);
        const currentVelocity = this.mario.body.velocity.y;
        const currentXVelocity = this.mario.body.velocity.x;
        const direction = currentXVelocity > 0 ? 'Right' : 'Left';
        const jumpState = currentVelocity < 0 ? 'Jump' : 'JumpFalling';
        this.mario.setTexture(`Mario${direction}_${jumpState}`);
        this.canJump = false;
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'MarioGame',
    width: 800,
    height: 400,
    backgroundColor: '#5c94fc',
    scene: MyGame,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);


