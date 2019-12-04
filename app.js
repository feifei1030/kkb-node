const Koa = require('koa')
const app = new Koa()
const moment = require('moment')
const schedule = require('node-schedule')
// 这里是需要缓存的接口清单
const cacheList = ['/api/data/xxxx']
const cache = {}
console.log('数据初始化')
const updateCache = async () => {
    let all = cacheList.map(item => {
        return new Promise((resolve, reject) => {
            console.log('开始处理', item)
            setTimeout(() => {
                // 这里伪处理缓存接口数据
                cache[item] = '这里是缓存数据，数据生成时间：'+moment().format('YYYY-MM-DD HH:mm:ss')
                console.log('处理完毕', item)
                resolve()
            }, 1000);
        })
    })
    await Promise.all(all)
}

(async () => {
    await updateCache()
    console.log('数据加载完毕')

    const scheduleCronstyle = () => {
        // 这里设置每天凌晨执行（不知道对不对）
        schedule.scheduleJob('0 0 0 * * ?', () => {
            updateCache()
        });
    }
    scheduleCronstyle();

    // 这是那个缓存处理中间件
    app.use((ctx, next) => {
        const exp = new Date(moment().add(1, 'days').format('YYYY/MM/DD'))

        if (cacheList.indexOf(ctx.request.URL.pathname) >= 0) {
            const data = cache[ctx.request.URL.pathname]
            ctx.body = data
            ctx.res.setHeader('Expires',exp)
        }
        next()
    })

    const router = require('koa-router')()
    router.get('/string', async (ctx, next) => {
        ctx.body = 'koa2 string'
    })
    router.get('/api/data/xxxx', async (ctx, next) => {
        // 这里的数据已经走缓存了

    })
    router.get('/', async (ctx, next) => {
        ctx.body = 'koa2 root'
    })
    router.get('*', async (ctx, next) => {
        ctx.body = '404'
    })
    app.use(router.routes())
    app.listen(3002, () => {
        console.log('启动成功')
    })
})()