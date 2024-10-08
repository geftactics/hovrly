const electron = require('electron')
const remote = electron.remote
const app = remote.app
const ipc = electron.ipcRenderer
const config = remote.require('./config')
const db = remote.require('./db')
const clock = remote.require('./clock')
const launch = remote.require('./launch')
const nativeTheme = remote.nativeTheme
const Sortable = require('sortablejs')
const $ = selector => document.querySelector(selector)
const $all = selector => document.querySelectorAll(selector)

function init()
{
    ipc.on('app-height-get', updateAppHeight)
    ipc.on('app-hide', hideTime)
    ipc.on('app-show', updateTime)

    theme()
    slider()
    clocks()
    search()
    quit()
    update()
    startup()
    twentyforhour()
    compact()
    date()
    about()
    donate()
    collapse()
    sortable()

    ipc.send('ready')
}


function sortable()
{
    let sortable = Sortable.create($('.clock'), {
        draggable: 'button',
        onUpdate: () => {
            let sortTo = []
            $all('.clock button').forEach(item => {
                let name = item.querySelector('.name').innerText
                sortTo.push(name)
            })

            ipc.send('clocks-sort', sortTo)
        },
    })
}

function collapse()
{
    setTimeout(function() {
        if(clock.isCollapsed() == 'on') {
            $('.app').classList.add('tiny')
            $('.clock').style.maxHeight = '499px'
        }
        else {
            $('.app').classList.remove('tiny')
            $('.clock').style.maxHeight = '210px'
        }
    }, 1)

    $('.collapse .toggle').addEventListener('click', e => {
        if($('.app').classList.contains('tiny')) {
            $('.app').classList.remove('tiny')
            $('.clock').style.maxHeight = '210px'
        }
        else {
            $('.app').classList.add('tiny')
            $('.clock').style.maxHeight = '499px'
        }

        updateAppHeight()
        ipc.send('collapse')
    })
}

function slider()
{
    current()

    $('.slider input').addEventListener('input', sliderRecalc)

    // $('.slider input').addEventListener('mousedown', e => {
    //     $all('.clock button:not(.active)').forEach(item => {
    //         item.classList.add('focus')
    //     })
    // })
    // 
    // $('.slider input').addEventListener('mouseup', e => {
    //     current()
    // 
    //     $all('.clock button:not(.active)').forEach(item => {
    //         item.classList.remove('focus')
    //     })
    // })
    
    $('.slider input').addEventListener('mouseup', e => {
        current()
    })

    function current()
    {
        $('.slider input').value = (new Date().getHours() * 60) + new Date().getMinutes()
        sliderRecalc()
    }
}

function update()
{
    $('.update').addEventListener('click', () => {
        if($('.update').classList.contains('install')) {
            $('.update').classList.add('loading')
            ipc.send('update-install')
        }
        else {
            $('.update').classList.add('loading')
            $('.update-message').innerText = 'Checking...'
            ipc.send('update-check')
        }
    })

    ipc.on('update-finish', (e, result) => {
        if($('.update').classList.contains('install')) return

        if(result == 'dev-mode') {
            $('.update').classList.remove('loading')
            $('.update-message').innerHTML = `<span class='gray'>Not working on Dev</span>`
            setTimeout(() => { $('.update-message').innerText = 'Check for Update' }, 3000)
        }

        if(result == 'downloaded') {
            $('.update').classList.add('install')
            $('.update').classList.remove('loading')
            $('.update-message').innerText = 'Install Update & Restart' // `Ready! Please Relaunch ${config.APP_NAME}`
            $('.app.tiny .collapse button').classList.add('install')

        }

        if(result == 'available') {
            $('.update-message').innerHTML = '<b>New version! Downloading...</b>'
        }

        if(result == 'not-available') {
            $('.update').classList.remove('loading')
            $('.update-message').innerHTML = `<span class='gray'>You have latest version</span>`
            setTimeout(() => { $('.update-message').innerText = 'Check for Update' }, 3000)
        }
    })
}

function theme()
{
    setTimeout(() => {
        $('.app').classList.add(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
    }, 1)

    nativeTheme.on('updated', () => {
        $('.app').classList.remove('dark', 'light')
        $('.app').classList.add(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
    })
}

function twentyforhour()
{
    setTimeout(function() {
        if(clock.isTwentyFourHour() == 'on') {
            $('.twentyfourhour').classList.add('active')
            $('.slider .from').innerText = '00:00'
            $('.slider .to').innerText = '23:59'
        }
        else {
            $('.clock').classList.add('ampm')
            $('.slider .from').innerText = '12:00 AM'
            $('.slider .to').innerText = '11:59 PM'
        }
    }, 1)

    $('.twentyfourhour').addEventListener('click', e => {
        e.target.classList.toggle('active')

        if($('.clock').classList.contains('ampm')) {
            $('.clock').classList.remove('ampm')
            $('.slider .from').innerText = '00:00'
            $('.slider .to').innerText = '23:59'
        }
        else {
            $('.clock').classList.add('ampm')
            $('.slider .from').innerText = '12:00 AM'
            $('.slider .to').innerText = '11:59 PM'
        }

        ipc.send('twentyfourhour')
        sliderRecalc()
        updateTime()
    })
}

function compact()
{
    setTimeout(function() {
        if(clock.isCompactView() == 'on') $('.compact').classList.add('active')
    }, 1)

    $('.compact').addEventListener('click', e => {
        e.target.classList.toggle('active')
        ipc.send('compact')
    })
}

function date()
{
    setTimeout(function() {
        if(clock.isDate() == 'on') $('.date').classList.add('active')
    }, 1)

    $('.date').addEventListener('click', e => {
        e.target.classList.toggle('active')
        ipc.send('date')
    })
}

function donate()
{
    $('.support').addEventListener('click', e => {
        ipc.send('donate')
    })
}

function about()
{
    $('.about').addEventListener('click', e => {
        ipc.send('about')
    })
}

function startup()
{
    setTimeout(function() {
        if(launch.isAutoOpen()) $('.startup').classList.add('active')
    }, 1)

    $('.startup').addEventListener('click', e => {
        e.target.classList.toggle('active')
        ipc.send('startup')
    })
}

function quit()
{
    $('.exit').addEventListener('click', () => {
        ipc.send('exit')
    })
}

function search()
{
    var newclock = null
    $('.search input').addEventListener('keyup', e => {
        let keycode = e.keyCode ? e.keyCode : e.which
        let q = $('.search input').value.trim().replace(',', '')
        
        // $('.search label').innerText = ''

        if(keycode == 13) {
            if(newclock) {
                ipc.send('clock-add', newclock)
                newclock = null
            }

            $('.search label').innerText = ''
            $('.search input').value = ''
        }
        else if(keycode == 27) {
            newclock = null
            $('.search label').innerText = ''
            $('.search input').value = ''
        }
        else {
            if (q == '') {
                newclock = null
                $('.search label').innerText = ''
            }
            else {
                let query = `SELECT name, UPPER(country) code, timezone FROM cities WHERE CONCAT(city, ' ', country) LIKE '%${q}%' ORDER BY popularity DESC LIMIT 1`

                db.find(query, city => {
                    if(city.name && !city.timezone) return
                    let fullName = city.name + (city.code ? ', ' + city.code : '')
                    $('.search label').innerText = !city.name ? 'Not found' : fullName
                    newclock = city.name ? { name: city.name, full: fullName, timezone: city.timezone, tray: 0 } : null
                })
            }
        }
    })
}

function clocks()
{
    setTimeout(function() {
        updateTime()
        runClock()
    }, 1)

    ipc.on('add-clock', (e, clock) => {
        if(!clock.timezone) return

        let button = document.createElement('button')

        if(clock.tray) button.classList.add('active')

        button.innerHTML = `
            <time class='clearfix' data-timezone='${clock.timezone}'></time>
            <span class='name' contenteditable='true' spellcheck='false'>${clock.full}</span>
            <span class='delete'></span>
            <span class='eye'></span>
        `
        // button.setAttribute('data-id', $('.clock button').length+1)
        // button.setAttribute('data-name', clock.name)

        // rename
            
            var inputPrevName = ''
            
            // mouseover
            button.querySelector('.name').addEventListener('mouseover', e => {
                e.target.closest('.name').classList.add('hover')
            })
            
            // mouseout
            button.querySelector('.name').addEventListener('mouseout', e => {
                let input = e.target.closest('.name')
                
                if(!input.classList.contains('focus')) {
                    input.classList.remove('hover')
                }
            })
            
            // activate
            button.querySelector('.name').addEventListener('focus', e => {
                e.stopPropagation()
                let input = e.target.closest('.name')
                input.classList.add('focus')
                input.scrollLeft = 0
                inputPrevName = input.innerText
            })
            
            // deactivate
            button.querySelector('.name').addEventListener('blur', e => {
                e.stopPropagation()
                let input = e.target.closest('.name')
                input.classList.remove('focus', 'hover')
                input.blur()
                input.scrollLeft = 0
                input.innerText = inputPrevName
            })

            // paste
            button.querySelector('.name').addEventListener('paste', e => {
                let ev = (e.originalEvent || e)
                let input = ev.target.closest('.name')
                let text = ev.clipboardData.getData('text/plain')
                inputPrevName = input.innerText
                text = text.replace(/<\/?[^>]+(>|$)/g, '').trim()
                document.execCommand('insertHTML', false, text)
                e.preventDefault()
            })
            
            button.querySelector('.name').addEventListener('keydown', e => {
                let keycode = e.keyCode ? e.keyCode : e.which
                let input = e.target.closest('.name')
                
                if(keycode == 13) {
                    ipc.send('clock-rename', inputPrevName, input.innerText)
                    inputPrevName = input.innerText
                    input.blur()
                    e.preventDefault()
                }
                
                if(keycode == 27) {
                    input.classList.remove('focus', 'hover')
                    input.innerText = inputPrevName
                    input.blur()
                    e.preventDefault()
                }
            })

        // show/hide
        button.querySelector('.eye').addEventListener('click', e => {
            e.stopPropagation()
            button.classList.toggle('active')
            ipc.send('clock-toggle', button.querySelector('.name').innerText)
        })

        // delete
        button.querySelector('.delete').addEventListener('click', e => {
            e.stopPropagation()
            ipc.send('clock-remove', button.querySelector('.name').innerText)
            button.parentNode.removeChild(button)
            updateAppHeight()
        })

        $('.clock').appendChild(button)
        $('.clock').scrollTop = $('.clock').scrollHeight

        updateTime()
        updateAppHeight()
    })

    function runClock() {
        let now = new Date()
        let tick = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

        setTimeout(function() {
            $('.slider input').value = (new Date().getHours() * 60) + new Date().getMinutes()
            sliderRecalc()
            updateTime()
            runClock()
        }, tick)
    }
}

function updateTime() {

    let val = $('.slider input').value
    let now = new Date(), then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    let diff = Math.floor((now.getTime() - then.getTime()) / 1000)
    let offset = (Math.floor((val * 60) - diff)) * 1000

    $all('.clock button').forEach(item => {
        let time = item.querySelector('time')
        let tz = clock.getTzTime(time.getAttribute('data-timezone'), offset)

        time.classList.remove('morning', 'evening')
        time.classList.add(tz.morning)
        time.innerText = tz.time
    })
}

function hideTime() {

    $all('.clock button').forEach(item => {
        let time = item.querySelector('time')
        time.innerText = ":"
    })
}

function sliderRecalc()
{
    let el = $('.slider input')
    let format = clock.formatTime(el.value * 60 * 1000, true)
    let is24H = clock.isTwentyFourHour() == 'on' ? true : false

    $('.slider .now').innerText = format.time
    $('.slider .from').style.opacity = el.value < (is24H ? 200 : 250) ? 0 : 0.3
    $('.slider .to').style.opacity =  el.value > (is24H ? 1080 : 950) ? 0 : 0.3
    updateTime()

    let left = el.offsetWidth * (el.value - el.min) / (el.max - el.min)
    let ampm_offset = is24H ? 23 : 38
    left = el.value < 1260 ? left + 25 : left - ampm_offset
    $('.slider .now').style.left = `${left}px`
}

function updateAppHeight()
{
    let appHeight = parseFloat(getComputedStyle($('.app'), null).height.replace('px', ''))
    ipc.send('app-height', appHeight)
}

window.addEventListener('DOMContentLoaded', init)
document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => event.preventDefault())
