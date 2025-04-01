class GomokuGame {
    constructor() {
        this.boardSize = 15;
        this.cellSize = 30;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1; // 1: 黑棋, 2: 白棋
        this.gameOver = false;
        this.aiLevel = 'beginner';
        this.playerColor = 'black';
        
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('status');
        
        this.initEventListeners();
        this.drawBoard();
    }
    
    initEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.resetGame();
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver || 
                (this.currentPlayer === 1 && this.playerColor === 'white') || 
                (this.currentPlayer === 2 && this.playerColor === 'black')) {
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.cellSize);
            const y = Math.floor((e.clientY - rect.top) / this.cellSize);
            
            if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize && this.board[y][x] === 0) {
                this.makeMove(x, y);
                this.createConfetti();
                if (!this.gameOver) {
                    setTimeout(() => this.aiMove(), 500);
                }
            }
        });
    }
    
    // 重置游戏
    resetGame() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.gameOver = false;
        this.aiLevel = document.getElementById('ai-level').value;
        this.playerColor = document.getElementById('player-color').value;
        this.currentPlayer = 1;
        
        this.drawBoard();
        
        this.statusEl.textContent = '游戏开始，黑棋先行';
        const winBtn = document.getElementById('win-btn');
        winBtn.classList.remove('show');
        
        if (this.playerColor === 'white') {
            setTimeout(() => this.aiMove(), 500);
        }
    }
    
    // 绘制棋盘
    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制棋盘网格
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.boardSize; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            this.ctx.lineTo((this.boardSize - 0.5) * this.cellSize, i * this.cellSize + this.cellSize / 2);
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize + this.cellSize / 2, this.cellSize / 2);
            this.ctx.lineTo(i * this.cellSize + this.cellSize / 2, (this.boardSize - 0.5) * this.cellSize);
            this.ctx.stroke();
        }
        
        // 绘制棋子
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 1) {
                    this.drawPiece(x, y, 'black');
                } else if (this.board[y][x] === 2) {
                    this.drawPiece(x, y, 'white');
                }
            }
        }
    }
    
    // 绘制棋子
    drawPiece(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(
            x * this.cellSize + this.cellSize / 2,
            y * this.cellSize + this.cellSize / 2,
            this.cellSize / 2 - 4,
            0,
            Math.PI * 2
        );
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
    
    // 落子，检查胜负
    makeMove(x, y) {
        this.board[y][x] = this.currentPlayer;
        this.drawPiece(x, y, this.currentPlayer === 1 ? 'black' : 'white');
        
        if (this.checkWin(x, y)) {
            this.gameOver = true;
            const winner = this.currentPlayer === 1 ? '黑棋' : '白棋';
            this.statusEl.textContent = `游戏结束，${winner}获胜！`;
            this.showWinAnimation(`${winner}获胜, 再来一局`);
            return;
        }
        
        if (this.checkDraw()) {
            this.gameOver = true;
            this.statusEl.textContent = '游戏结束，平局！';
            this.showWinAnimation("平局, 再来一局");
            return;
        }
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateStatus();
    }
    
    aiMove() {
        let x, y;
        
        switch (this.aiLevel) {
            case 'beginner':
                [x, y] = this.getSmartMove(1);
                break;
            case 'master':
                [x, y] = this.getSmartMove(3);
                break;
            case 'expert':
                [x, y] = this.getSmartMove(5);
                break;
            case 'godlike':
                [x, y] = this.getSmartMove(8);
                break;
        }
        
        this.makeMove(x, y);
    }
    
    getRandomMove() {
        const emptyCells = [];
        
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 0) {
                    emptyCells.push([x, y]);
                }
            }
        }
        
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    getSmartMove(depth) {
        // 优先检查自己是否有立即获胜的位置
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 0) {
                    this.board[y][x] = this.currentPlayer;
                    if (this.checkWin(x, y)) {
                        this.board[y][x] = 0;
                        return [x, y];
                    }
                    this.board[y][x] = 0;
                }
            }
        }

        const opponent = this.currentPlayer === 1 ? 2 : 1;
        
        // 根据AI等级调整防守策略
        switch(this.aiLevel) {
            case 'beginner': // 萌新 - 只防守直接威胁
                // 检查对手立即获胜的位置
                for (let y = 0; y < this.boardSize; y++) {
                    for (let x = 0; x < this.boardSize; x++) {
                        if (this.board[y][x] === 0) {
                            this.board[y][x] = opponent;
                            if (this.checkWin(x, y)) {
                                this.board[y][x] = 0;
                                return [x, y];
                            }
                            this.board[y][x] = 0;
                        }
                    }
                }
                break;
                
            case 'master': // 棋士 - 防守活四和直接威胁
                for (let y = 0; y < this.boardSize; y++) {
                    for (let x = 0; x < this.boardSize; x++) {
                        if (this.board[y][x] === 0) {
                            this.board[y][x] = opponent;
                            const isWin = this.checkWin(x, y);
                            if (isWin) {
                                this.board[y][x] = 0;
                                return [x, y];
                            }
                            const isAlmostWin = this.checkAlmostWinLevel(x, y, opponent, 4);
                            this.board[y][x] = 0;
                            if (isAlmostWin) {
                                return [x, y];
                            }
                        }
                    }
                }
                break;
                
            case 'expert': // 宗师 - 防守活三及以上
                for (let y = 0; y < this.boardSize; y++) {
                    for (let x = 0; x < this.boardSize; x++) {
                        if (this.board[y][x] === 0) {
                            this.board[y][x] = opponent;
                            const isWin = this.checkWin(x, y);
                            if (isWin) {
                                this.board[y][x] = 0;
                                return [x, y];
                            }
                            const isAlmostWin = this.checkAlmostWinLevel(x, y, opponent, 3);
                            this.board[y][x] = 0;
                            if (isAlmostWin) {
                                return [x, y];
                            }
                        }
                    }
                }
                break;
                
            case 'godlike': // 棋圣 - 防守活三及以上
                for (let y = 0; y < this.boardSize; y++) {
                    for (let x = 0; x < this.boardSize; x++) {
                        if (this.board[y][x] === 0) {
                            this.board[y][x] = opponent;
                            const isWin = this.checkWin(x, y);
                            if (isWin) {
                                this.board[y][x] = 0;
                                return [x, y];
                            }
                            const isAlmostWin = this.checkAlmostWinLevel(x, y, opponent, 3);
                            this.board[y][x] = 0;
                            console.log(`Checking for almost win at (${x}, ${y}): ${isAlmostWin}`);
                            if (isAlmostWin) {
                                return [x, y];
                            }
                        }
                    }
                }
                break;
        }

        // 根据深度进行更复杂的评估
        if (depth > 0) {
            // 优先选择能形成自己活三的位置
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (this.board[y][x] === 0) {
                        this.board[y][x] = this.currentPlayer;
                        if (this.checkAlmostWin(x, y, this.currentPlayer)) {
                            this.board[y][x] = 0;
                            return [x, y];
                        }
                        this.board[y][x] = 0;
                    }
                }
            }
        }

        // 默认策略：优先选择中心区域
        const centerX = Math.floor(this.boardSize / 2);
        const centerY = Math.floor(this.boardSize / 2);
        const maxRadius = Math.floor(this.boardSize / 2);

        for (let radius = 0; radius <= maxRadius; radius++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                for (let x = centerX - radius; x <= centerX + radius; x++) {
                    if (x >= 0 && x < this.boardSize &&
                        y >= 0 && y < this.boardSize && 
                        this.board[y][x] === 0) {
                        return [x, y];
                    }
                }
            }
        }

        // 如果中心区域已满，随机选择一个空位置
        return this.getRandomMove();
    }

    // 检查特定级别的威胁
    checkAlmostWinLevel(x, y, player, level) {
        const directions = [
            [1, 0],
            [0, 1], 
            [1, 1], 
            [1, -1]
        ];
    
        for (const [dx, dy] of directions) {
            let count = 1;
            let openEnds = 0;
    
            // 计算当前方向上的连续子数
            let i = 1;
            while (true) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= this.boardSize || 
                    ny < 0 || ny >= this.boardSize || 
                    this.board[ny][nx] !== player) {
                    if (nx >= 0 && nx < this.boardSize && 
                        ny >= 0 && ny < this.boardSize && 
                        this.board[ny][nx] === 0) {
                        openEnds++;
                    }
                    break;
                }
                count++;
                i++;
            }
    
            // 计算反方向上的连续子数
            i = 1;
            while (true) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= this.boardSize || 
                    ny < 0 || ny >= this.boardSize || 
                    this.board[ny][nx] !== player) {
                    if (nx >= 0 && nx < this.boardSize && 
                        ny >= 0 && ny < this.boardSize && 
                        this.board[ny][nx] === 0) {
                        openEnds++;
                    }
                    break;
                }
                count++;
                i++;
            }
    
            // 判断不同等级的威胁
            switch(level) {
                case 3: // 活三
                    if (count === 3 && openEnds >= 2) return true;
                    break;
                case 4: // 活四
                    if (count === 4 && openEnds >= 1) return true;
                    break;
                default:
                    if (count === 5) return true;
                    break;
            }
        }
        return false;
    }
    
    // 检查是否形成活三或活四
    checkAlmostWin(x, y, player) {
        const directions = [
            [1, 0],
            [0, 1],
            [1, 1], 
            [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            let count = 1;
            let openEnds = 0;
            
            // 正向检查
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                
                if (nx >= 0 && nx < this.boardSize && 
                    ny >= 0 && ny < this.boardSize) {
                    if (this.board[ny][nx] === player) {
                        count++;
                    } else if (this.board[ny][nx] === 0) {
                        openEnds++;
                        break;
                    } else {
                        break;
                    }
                }
            }
            
            // 反向检查
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                
                if (nx >= 0 && nx < this.boardSize && 
                    ny >= 0 && ny < this.boardSize) {
                    if (this.board[ny][nx] === player) {
                        count++;
                    } else if (this.board[ny][nx] === 0) {
                        openEnds++;
                        break;
                    } else {
                        break;
                    }
                }
            }
            
            // 活四(两端开放的四连珠)或活三(两端开放的三连珠)
            if ((count >= 4 && openEnds >= 1) || (count >= 3 && openEnds >= 2)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 检查是否形成五子连珠
    checkWin(x, y) {
        const directions = [
            [1, 0],   // 水平
            [0, 1],   // 垂直
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];
        
        const player = this.board[y][x];
        
        for (const [dx, dy] of directions) {
            let count = 1;
            
            // 正向检查
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                
                if (nx >= 0 && nx < this.boardSize && 
                    ny >= 0 && ny < this.boardSize && 
                    this.board[ny][nx] === player) {
                    count++;
                    if (count >= 5) {
                        return true;
                    }
                } else {
                    break;
                }
            }
            
            // 反向检查
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                
                if (nx >= 0 && nx < this.boardSize && 
                    ny >= 0 && ny < this.boardSize && 
                    this.board[ny][nx] === player) {
                    count++;
                    if (count >= 5) {
                        return true;
                    }
                } else {
                    break;
                }
            }
        }
        
        return false;
    }
    
    checkDraw() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 0) {
                    return false;
                }
            }
        }
        return true;
    }
    
    updateStatus() {
        const player = this.currentPlayer === 1 ? '黑棋' : '白棋';
        this.statusEl.textContent = `轮到${player}下棋`;
    }

    showWinAnimation(winText) {
        const winBtn = document.getElementById('win-btn');
        
        winBtn.textContent = winText;
        winBtn.classList.add('show');
        
        winBtn.onclick = () => {
            this.resetGame();
        };
        
        this.createConfetti();
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        container.innerHTML = '';
        
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.top = Math.random() * 100 + 'vh';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            container.appendChild(confetti);
        }
    }
}

// 初始化游戏
const game = new GomokuGame();

// 在GomokuGame类的constructor中添加
this.themeSelector = document.getElementById('theme-selector');
this.themeSelector.addEventListener('change', () => {
    document.body.className = this.themeSelector.value + '-theme';
});

// 在resetGame方法中添加
document.body.className = this.themeSelector.value + '-theme';
