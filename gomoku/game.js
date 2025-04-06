const AI_LEVELS = {
    beginner: 'beginner',
    master: 'master',
    expert: 'expert',
    godlike: 'godlike'
}

class GomokuGame {
    constructor() {
        this.boardSize = 15;
        this.cellSize = 30;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1; // 1: 黑棋, 2: 白棋
        this.gameOver = false;
        this.aiLevel = AI_LEVELS.beginner;
        this.playerColor = 'black';
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('status');
        this.previewPiece = { x: -1, y: -1, visible: false };
        this.themeSelector = document.getElementById('theme-selector');

        this.initEventListeners();
        this.drawBoard();
        
        // 移动端适配
        this.adjustCanvasSize();
        window.addEventListener('resize', () => this.adjustCanvasSize());
    }

    adjustCanvasSize() {
        const maxSize = Math.min(window.innerWidth - 40, 450);
        this.canvas.width = maxSize;
        this.canvas.height = maxSize;
        this.cellSize = maxSize / this.boardSize;
        this.drawBoard();
    }
    
    initEventListeners() {
        // 添加主题选择器事件监听器
        this.themeSelector.addEventListener('change', () => {
            document.body.className = this.themeSelector.value + '-theme';
        });

        // 添加开始按钮事件监听器
        document.getElementById('start-btn').addEventListener('click', () => {
            this.resetGame();
        });

        // 添加触摸和鼠标事件
        this.canvas.addEventListener('mousedown', this.handleDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleUp.bind(this));
        this.canvas.addEventListener('touchstart', this.handleDown.bind(this));
        this.canvas.addEventListener('touchmove', this.handleMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleUp.bind(this));
    }

    // 处理按下事件
    handleDown(e) {
        e.preventDefault(); // 阻止默认行为
        if (this.gameOver || 
            (this.currentPlayer === 1 && this.playerColor === 'white') || 
            (this.currentPlayer === 2 && this.playerColor === 'black')) {
            return;
        }
        
        const pos = this.getPosition(e);
        const { x, y } = pos;
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize && this.board[y][x] === 0) {
            this.previewPiece = { x, y, visible: true };
            this.drawBoard();
        }
    }

    // 处理移动事件
    handleMove(e) {
        e.preventDefault(); // 阻止默认行为
        if (!this.previewPiece.visible) return;
        
        const pos = this.getPosition(e);
        const { x, y } = pos;
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize && this.board[y][x] === 0) {
            this.previewPiece.x = x;
            this.previewPiece.y = y;
            this.drawBoard();
        }
    }

    // 处理释放事件
    handleUp(e) {
        if (!this.previewPiece.visible) return;
        
        const pos = this.getPosition(e);
        const { x, y } = pos;
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize && this.board[y][x] === 0) {
            this.makeMove(x, y);
            
            if (!this.gameOver) {
                setTimeout(() => this.aiMove(), 500);
            }
        }
        
        this.previewPiece.visible = false;
        this.drawBoard();
    }

    // 获取点击位置
    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
    
        let clientX, clientY;
    
        if (e.clientX !== undefined) {
            // 鼠标事件
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.touches?.length > 0) {
            // 触摸事件
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches?.length > 0) {
            // touchend事件
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            console.warn("无法获取点击位置", e);
            return { x: -1, y: -1 };
        }
    
        // 计算 canvas 缩放比例，防止 CSS 缩放影响计算
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
    
        // 转换坐标，确保基于实际的 canvas 坐标计算
        const x = Math.floor(((clientX - rect.left) * scaleX) / this.cellSize);
        const y = Math.floor(((clientY - rect.top) * scaleY) / this.cellSize);
    
        return { x, y };
    }

    // 重置游戏
    resetGame() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.gameOver = false;
        this.aiLevel = AI_LEVELS[document.getElementById('ai-level').value] || AI_LEVELS.beginner;
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
        
        // 绘制预览棋子
        if (this.previewPiece.visible) {
            this.drawPiece(
                this.previewPiece.x, 
                this.previewPiece.y, 
                this.currentPlayer === 1 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)'
            );
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
            this.showWinAnimation(`${winner}胜`);
            return;
        }
        
        if (this.checkDraw()) {
            this.gameOver = true;
            this.statusEl.textContent = '游戏结束，平局！';
            this.showWinAnimation("平局");
            return;
        }
        
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateStatus();
    }

    // AI落子
    aiMove() {
        let x, y;
        
        switch (this.aiLevel) {
            case AI_LEVELS.beginner:
                [x, y] = this.getSmartMove(1);
                break;
            case AI_LEVELS.master:
                [x, y] = this.getSmartMove(3);
                break;
            case AI_LEVELS.expert:
                [x, y] = this.getSmartMove(5);
                break;
            case AI_LEVELS.godlike:
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
            case AI_LEVELS.beginner: // 萌新 - 只防守直接威胁
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
                
            case AI_LEVELS.master: // 棋士 - 防守活四和直接威胁
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
                
            case AI_LEVELS.expert: // 宗师 - 防守活三及以上
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
                
            case AI_LEVELS.godlike: // 棋圣 - 防守活三及以上
                for (let y = 0; y < this.boardSize; y++) {
                    for (let x = 0; x < this.boardSize; x++) {
                        if (this.board[y][x] === 0) {
                            this.board[y][x] = opponent;
                            const isWin = this.checkWin(x, y);
                            if (isWin) {
                                this.board[y][x] = 0;
                                return [x, y];
                            }
                            const isAlmostWin = this.checkAlmostWinLevel(x, y, opponent, 2);
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
    
    // 检查是否还有落子的位置
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

    // 显示胜利动画
    showWinAnimation(winText) {
        const winBtn = document.getElementById('win-btn');
        winBtn.textContent = winText + ', 再战一局';
        winBtn.classList.add('show');
        winBtn.onclick = () => {
            this.resetGame();
        };
        
        // 显示胜利文字和烟花效果
        const container = document.getElementById('confetti-container');
        container.innerHTML = '';
        
        // 添加胜利文字
        const victoryText = document.createElement('div');
        victoryText.textContent = winText;
        victoryText.style.position = 'fixed';
        victoryText.style.top = '50%';
        victoryText.style.left = '50%';
        victoryText.style.transform = 'translate(-50%, -50%)';
        victoryText.style.fontSize = '5rem';
        victoryText.style.fontWeight = 'bold';
        victoryText.style.color = '#fff';
        victoryText.style.textShadow = '0 0 10px #000';
        container.appendChild(victoryText);
        
        // 添加烟花效果
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.top = Math.random() * 100 + 'vh';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            const duration = Math.random() * 3 + 2;
            confetti.style.animationDuration = duration + 's';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            
            // 添加动画结束事件监听器
            confetti.addEventListener('animationend', () => {
                confetti.remove();
                victoryText.remove();
            });
            
            container.appendChild(confetti);
        }
    }
}

// 初始化游戏
const game = new GomokuGame();
