const Koa = require('koa')
const app = new Koa()
const moment = require('moment')
const fs = require('fs')
const schedule = require('node-schedule')
const filePath = './data.json'
let cache = {}
// 这里是需要缓存的接口清单
const cacheList = {
    '/api/data/xxxx': () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const data = 'cache data ' + moment().format('YYYY-MM-DD HH:mm:ss')
                console.log(data)
                resolve(data)
            }, 4000)
        })
    }
}
console.log('数据初始化')

// 如果重启，优先判断本地缓存文件进行初始化
if (fs.existsSync(filePath)) {
    console.log('读取本地缓存数据')
    cache = JSON.parse(fs.readFileSync(filePath))
    console.log('读取本地缓存数据，加载完毕')
}

const updateCache = () => {
    let all = Object.keys(cacheList).map(item => {
        return new Promise((resolve, reject) => {
            console.log('开始处理', item)
            cacheList[item]().then(res => {
                cache[item] = res
                console.log('处理完毕', item)
                resolve()
            })
        })
    })
    Promise.all(all).then(() => {
        fs.writeFileSync(filePath, JSON.stringify(cache))
        console.log('数据更新完毕')
    })
}

// 为避免文件内数据不够新，再更新一下缓存数据，不阻塞服务启动
updateCache()

const scheduleCronstyle = () => {
    // 这里设置每天凌晨执行（不知道对不对）
    schedule.scheduleJob('0 0 0 * * ?', () => {
        updateCache()
    });
}
scheduleCronstyle();

// 这是那个缓存处理中间件
app.use(async (ctx, next) => {
    const exp = new Date(moment().add(1, 'days').format('YYYY/MM/DD'))
    console.log('ctx.request.URL', ctx.request.URL)
    if (cache.hasOwnProperty(ctx.request.URL.pathname)) {
        const data = cache[ctx.request.URL.pathname]
        ctx.body = data
        // 尝试设置浏览器缓存，但是不知道有没有起作用
        ctx.res.setHeader('Expires', exp)
    }
    await next()
})

const router = require('koa-router')()
router.get('/string', async (ctx, next) => {
    ctx.body = 'koa2 string'
})
router.get('/api/data/xxxx', async (ctx, next) => {
    // 这里的数据已经走缓存了，实在是刚好缓存没做足，没等到缓存数据就单独调一下
    // 但是结果是总是返回了一个纯白的对象，直接报204,后来解决了，
    // 一个是中间件next前要加await，解决了请求内部await没生效？？？
    // 另一个就是中间件里，没有数据缓存就直接跳过，不要赋值undefined，否则也会导致204，原因不清楚，应该是和执行顺序有关系？？？
    if (!ctx.body) {
        console.log('ctx.body1', ctx.body)
        ctx.body = await cacheList['/api/data/xxxx']()
        console.log('ctx.body2', ctx.body)
    }
})
router.get('/', async (ctx, next) => {
    ctx.body = 'koa2 root'
})
router.get('*', async (ctx, next) => {
    ctx.body = '404'
})
app.use(router.routes())
app.listen(3003, () => {
    console.log('启动成功')
})