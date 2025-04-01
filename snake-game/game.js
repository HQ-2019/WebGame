// 获取 canvas 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');

// 获取设备像素比
const devicePixelRatio = window.devicePixelRatio || 1;
// 设置 canvas 的 CSS 样式大小
canvas.style.width = canvas.width + 'px';
canvas.style.height = canvas.height + 'px';
// 设置 canvas 的实际屏幕分辨大小
canvas.width = canvas.width * devicePixelRatio;
canvas.height = canvas.height * devicePixelRatio;
// 缩放 canvas 的上下文
ctx.scale(devicePixelRatio, devicePixelRatio);

// 获取 canvas 的实际物理宽度和高度
const CANVAS_WIDTH = canvas.width / devicePixelRatio;
const CANVAS_HEIGHT = canvas.height / devicePixelRatio;

let snake = []; // 蛇的数组（蛇身单元）
let food = [];  // 食物数组
let direction = 'right'; // 蛇的初始方向
let gameLoop;   // 游戏（蛇）主循环定时器
let foodUpdateLoop; // 食物移动的定时器
let initialLength = 5; // 蛇的初始长度
let snakeColor; // 蛇的颜色
let isPaused = false;    // 游戏暂停状态
const GRID_SIZE = 20;     // 网格大小
const FOOD_COUNT = 20;    // 食物数量
const COLORS = ['#9542f5', '#02a35a', '#00c2db', '#fcd226', '#fc4482', 'ff0000'];  // 颜色数组
const MIN_SNAKE_LENGHT = 2; // 设置蛇的最小长度为2
const SAME_COLOR_RATIO = 0.2; // 同色食物占比为1/5
const MAX_FOOD_COUNT = FOOD_COUNT * 1.5; // 最大食物数量为初始数量的1.5倍
const REMOVE_FOOD_INTERVAL = 5000; // 每5秒检查一次是否需要移除多余的食物
const FOOD_UPDATE_INTERVAL = 50; // 食物移动更新间隔(毫秒)
let lastRemoveTime = 0; // 上次移除食物的时间

// 定义蛇的速度级别和对应的速度值
const SPEED_LEVELS = {
    lowest: 600,
    low: 400,
    medium: 200,
    high: 100
};

// 定义当前蛇的移动速度级别
let currentSpeed = SPEED_LEVELS.low;

// 定义蛇移动时吃到食物的状态常量
const EAT_STATUS = {
    none: 0,
    same: 1,
    different: 2
}

// 添加爆炸效果相关的常量和变量
const PARTICLE_COUNT = 15; // 每次爆炸产生的粒子数量
const PARTICLE_SPEED = 3; // 粒子移动速度
const PARTICLE_LIFE = 1000; // 粒子生命周期（毫秒）
const PARTICLE_SIZE = 3; // 粒子大小
let explosions = []; // 存储所有活跃的爆炸效果

// 定义爆炸粒子类
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
        this.size = PARTICLE_SIZE;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * PARTICLE_SPEED;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.createTime = Date.now();
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        const age = Date.now() - this.createTime;
        this.alpha = 1 - (age / PARTICLE_LIFE);
        return this.alpha > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 创建爆炸效果
function createExplosion(x, y, color) {
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(x, y, color));
    }
    explosions.push(particles);
}

// 添加食物移动速度和方向
class Food {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.dx = (Math.random() - 0.5) * 2; // 随机速度 (-1 到 1)
        this.dy = (Math.random() - 0.5) * 2;
        this.size = 0; // 初始大小为 0
        this.createdTime = Date.now(); // 记录创建时间
        this.growing = true; // 标记是否正在增长
        this.shrinking = false; // 标记是否正在收缩
        this.maxSize = GRID_SIZE / 2 - 2; // 最大尺寸
        this.growthSpeed = 3.0; // 加快生长速度
        this.shrinkSpeed = 0.8; // 收缩速度
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;

        // 检查是否完全移出画布
        if (this.x + GRID_SIZE / 2 < 0 || this.x - GRID_SIZE / 2 > CANVAS_WIDTH ||
            this.y + GRID_SIZE / 2 < 0 || this.y - GRID_SIZE / 2 > CANVAS_HEIGHT) {
            return false; // 标记为需要移除
        }

        // 动效逻辑
        if (this.growing) {
            this.size = Math.min(this.maxSize * 1.2, this.size + this.growthSpeed);
            if (this.size >= this.maxSize * 1.2) {
                this.growing = false;
                this.shrinking = true;
            }
        } else if (this.shrinking) {
            this.size = Math.max(this.maxSize, this.size - this.shrinkSpeed);
            if (this.size <= this.maxSize) {
                this.shrinking = false;
            }
        }

        return true;
    }
}

// 开始游戏
function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    if (foodUpdateLoop) clearInterval(foodUpdateLoop);
    
    isPaused = false;
    document.getElementById('pauseBtn').textContent = '暂停';
    
    const startX = Math.floor(CANVAS_WIDTH / 2 / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(CANVAS_HEIGHT / 2 / GRID_SIZE) * GRID_SIZE;

    console.log(`Start X: ${startX}, Start Y: ${startY} `, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    snake = [];
    for (let i = 0; i < initialLength; i++) {
        snake.push({
            x: startX - i * GRID_SIZE,
            y: startY,
            size: GRID_SIZE - (i * 2)
        });
    }
    
    snakeColor = colorPicker.value;
    direction = 'right';
    generateFood(true);
    draw();
    
    foodUpdateLoop = setInterval(updateFood, FOOD_UPDATE_INTERVAL); // 控制食物移动
    
    let countdown = 3;
    const countdownDiv = document.getElementById('countdown');
    countdownDiv.style.display = 'block';
    countdownDiv.textContent = countdown;

    const countDownLoop = setInterval(() => {
        countdown -= 1;
        if (countdown < 0) {
            countdownDiv.style.display = 'none';
            clearInterval(countDownLoop);
            // 开始游戏主循环, 控制小蛇移动
            gameLoop = setInterval(updateSnake, currentSpeed); 
        } else if (countdown === 0) {
            countdownDiv.textContent = "GO";
        } else {
            countdownDiv.textContent = countdown;
        }
        draw();
    }, 1000);
}

// 暂停游戏
function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    
    if (isPaused) {
        clearInterval(gameLoop);
        clearInterval(foodUpdateLoop);
    } else {
        gameLoop = setInterval(updateSnake, currentSpeed);
        foodUpdateLoop = setInterval(updateFood, FOOD_UPDATE_INTERVAL);
    }
}

// 添加速度控制函数
function setSpeed(level) {
    currentSpeed = SPEED_LEVELS[level];
    if (gameLoop && !isPaused) {
        clearInterval(gameLoop);
        gameLoop = setInterval(updateSnake, currentSpeed);
    }
}

// 创建食物
function generateFood(forceGenerate = false) {
    if (forceGenerate) {
        food = [];
    } else {
        // 保留现有的不同色食物，但要控制数量
        food = food.filter(f => f.color !== snakeColor);
        if (food.length > MAX_FOOD_COUNT - Math.ceil(FOOD_COUNT * SAME_COLOR_RATIO)) {
            removeExcessFood();
        }
    }

    const sameColorCount = Math.ceil(FOOD_COUNT * SAME_COLOR_RATIO);
    
    // 生成同色食物
    for (let i = 0; i < sameColorCount; i++) {
        addNewFood(snakeColor);
    }

    // 如果现有的不同色食物数量不足，则补充
    const currentDifferentColorCount = food.filter(f => f.color !== snakeColor).length;
    const targetDifferentColorCount = FOOD_COUNT - sameColorCount;
    
    if (currentDifferentColorCount < targetDifferentColorCount) {
        const needToAdd = targetDifferentColorCount - currentDifferentColorCount;
        for (let i = 0; i < needToAdd; i++) {
            let randomColor;
            do {
                randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            } while (randomColor === snakeColor);
            addNewFood(randomColor);
        }
    }
}

// 添加新的食物
function addNewFood(foodColor) {
    let validPosition = false;
    let x, y;
    let attempts = 0;
    const maxAttempts = 100;

    while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (CANVAS_WIDTH - GRID_SIZE);
        y = Math.random() * (CANVAS_HEIGHT - GRID_SIZE);
        
        validPosition = true;
        // 检查是否与蛇身重叠
        for (let segment of snake) {
            const distance = Math.sqrt(
                Math.pow((x + GRID_SIZE/2) - (segment.x + GRID_SIZE/2), 2) + 
                Math.pow((y + GRID_SIZE/2) - (segment.y + GRID_SIZE/2), 2)
            );
            if (distance < GRID_SIZE) {
                validPosition = false;
                break;
            }
        }
        
        // 检查是否与其他食物重叠
        for (let f of food) {
            const distance = Math.sqrt(
                Math.pow(x - f.x, 2) + 
                Math.pow(y - f.y, 2)
            );
            if (distance < GRID_SIZE) {
                validPosition = false;
                break;
            }
        }
        attempts++;
    }

    if (validPosition) {
        food.push(new Food(x, y, foodColor));
    }
}

// 移除过量的食物
function removeExcessFood() {
    // 统计不同颜色的食物数量
    const differentColorFood = food.filter(f => f.color !== snakeColor);
    
    if (differentColorFood.length > MAX_FOOD_COUNT - Math.ceil(FOOD_COUNT * SAME_COLOR_RATIO)) {
        // 按距离蛇头的远近排序，优先移除远处的食物
        const head = snake[0];
        differentColorFood.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - head.x, 2) + Math.pow(a.y - head.y, 2));
            const distB = Math.sqrt(Math.pow(b.x - head.x, 2) + Math.pow(b.y - head.y, 2));
            return distB - distA; // 距离远的排在前面
        });

        // 计算需要移除的数量
        const removeCount = differentColorFood.length - (MAX_FOOD_COUNT - Math.ceil(FOOD_COUNT * SAME_COLOR_RATIO));
        
        // 获取要移除的食物
        const foodToRemove = differentColorFood.slice(0, removeCount);
        
        // 从食物数组中移除
        food = food.filter(f => !foodToRemove.includes(f));
    }
}

// 更新食物
function updateFood() {
    if (isPaused) return;
    
    // 更新食物位置
    food = food.filter(f => f.move());

    // 检查是否有食物移出画布，若有则重新生成
    const numRemoved = FOOD_COUNT - food.length;
    for (let i = 0; i < numRemoved; i++) {
        addNewFood(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }

    // 不定时随机爆炸一个停留较久的食物
    if (Math.random() < 0.01 && food.length > 0) { 
        const sortedFood = [...food].sort((a, b) => a.createdTime - b.createdTime);
        const oldFood = sortedFood[0];
        const currentTime = Date.now();
        
        // 判断食物是否存在超过10秒
        if (currentTime - oldFood.createdTime >= 10000) { 
            createExplosion(oldFood.x, oldFood.y, oldFood.color);
            food = food.filter(f => f !== oldFood);
            addNewFood(COLORS[Math.floor(Math.random() * COLORS.length)]);

        }
    }

    // 检查是否需要移除多余的食物
    const currentTime = Date.now();
    if (currentTime - lastRemoveTime > REMOVE_FOOD_INTERVAL) {
        removeExcessFood();
        lastRemoveTime = currentTime;
    }

    // 如果食物太少，生成新的
    if (food.length < FOOD_COUNT / 2) {
        generateFood();
    }

    // 更新所有爆炸效果
    explosions = explosions.map(particles =>
        particles.filter(particle => particle.update())
    ).filter(particles => particles.length > 0);

    draw();
}

// 更新蛇状态
function updateSnake() {
    if (isPaused) return;

    // 检查蛇的长度，长度小于最小长度时结束游戏
    if (snake.length < MIN_SNAKE_LENGHT) {
        gameOver();
        draw();
        return;
    }

    const head = {
        x: snake[0].x,
        y: snake[0].y,
        size: snake[0].size
    };

    // 移动蛇头
    switch (direction) {
        case 'up':
            head.y -= GRID_SIZE;
            break;
        case 'down':
            head.y += GRID_SIZE;
            break;
        case 'left':
            head.x -= GRID_SIZE;
            break;
        case 'right':
            head.x += GRID_SIZE;
            break;
    }

    // 检查边界和自身碰撞
    if (head.x < 0 || head.x >= CANVAS_WIDTH || head.y < 0 || head.y >= CANVAS_HEIGHT) {
        gameOver();
        return;
    }

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // 增加蛇头
    snake.unshift(head);
    // 初始化吃到食物的状态
    let eatStatus = EAT_STATUS.none;
    
    // 检查食物碰撞，记录状态，过滤掉别吃的食物
    food = food.filter(f => {
        const distance = Math.sqrt(
            Math.pow((head.x + GRID_SIZE / 2) - f.x, 2) +
            Math.pow((head.y + GRID_SIZE / 2) - f.y, 2)
        );

        if (distance < (GRID_SIZE / 2 + GRID_SIZE / 2)) {
            if (f.color === snakeColor) {
                // 吃到同色食物
                eatStatus = EAT_STATUS.same;
                addNewFood(snakeColor);
            } else {
                // 吃到异色食物
                eatStatus = EAT_STATUS.different;
            }
            return false; // 标记为需要移除
        }
        return true; // 保留其他食物
    });
    

    // 检查是否有同色食物，如果没有则补充 (同色食物少于3个时补充)
    const sameColorFoodCount = food.filter(f => f.color === snakeColor).length;
    if (sameColorFoodCount < 3) {
        for (let index = 0; index < 3-sameColorFoodCount; index++) {
            addNewFood(snakeColor);            
        }
    }

    switch (eatStatus) {
        case EAT_STATUS.none:
            // 没有吃到食物，正常移动，移除蛇尾
            snake.pop();
            break;
        case EAT_STATUS.different:
            // 吃到异色食物，长大减1，移除2段蛇尾
            snake.pop();
            if (snake.length > 0) {
                snake.pop();
            }
            // 创建爆炸效果
            const tail = snake[snake.length - 1];
            createExplosion(
                tail.x + GRID_SIZE / 2,
                tail.y + GRID_SIZE / 2,
                snakeColor
            );
            break;
        case EAT_STATUS.same:
            // 吃到同色食物，不增加长度
            break;
    }

    draw();
}

// 绘制游戏场景
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
    // ctx.fillStyle = 'red';
    // ctx.beginPath();
    // ctx.arc(10.0, 10.0, 10, 0, Math.PI * 2);
    // ctx.fill();
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        ctx.fillStyle = snakeColor;
        ctx.beginPath();
        ctx.arc(
            segment.x + GRID_SIZE/2,
            segment.y + GRID_SIZE/2,
            segment.size/2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
    
    // 绘制食物
    food.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制爆炸效果
    explosions.forEach(particles => {
        particles.forEach(particle => {
            particle.draw(ctx);
        });
    });
}

// 游戏结束
function gameOver() {
    // 创建爆炸效果
    const tail = snake[0];
    createExplosion(
        tail.x + GRID_SIZE / 2,
        tail.y + GRID_SIZE / 2,
        snakeColor
    );

    const snakeLenght = snake.length;
    
    // 重置蛇
    snake = [];
    clearInterval(gameLoop);
    // clearInterval(foodUpdateLoop);

    // 延迟一秒后执行弹窗
    setTimeout(() => {
        alert(`游戏结束！\n最终长度: ${snakeLenght}`);
    }, 1000);
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (direction !== 'down') direction = 'up';
            break;
        case 'arrowdown':
        case 's':
            if (direction !== 'up') direction = 'down';
            break;
        case 'arrowleft':
        case 'a':
            if (direction !== 'right') direction = 'left';
            break;
        case 'arrowright':
        case 'd':
            if (direction !== 'left') direction = 'right';
            break;
    }
});