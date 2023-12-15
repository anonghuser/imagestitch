ondragover = (e) => {
  document.body.style.background = 'grey'
  e.preventDefault()
}
ondragleave = (e) => {
  document.body.style.background = ''
  e.preventDefault()
}
const files = []
ondrop = e => {
  document.body.style.background = ''
  e.preventDefault()
  process(e.dataTransfer.files)
}
document.onpaste = e => {
  process(e.clipboardData.files)
}
async function process(newFiles) {
  for (const file of newFiles) {
    files.push(file)
    file.url = URL.createObjectURL(file)
    file.image = await load(file.url)
  }
  update()
}
async function load(url) {
  return new Promise((resolve, reject)=>{
    const img = new Image
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image.'))
    img.src = url
  })
}

async function merge(files) {
  const images = files.map(file => file.image)
  const width = images.reduce((r, image) => r + image.width, 0)
  const height = Math.max(0, ...images.map(image => image.height))
  const c = new OffscreenCanvas(width || 1, height || 1)
  const cc = c.getContext('2d')
  images.reduce((r, image) => {
    cc.drawImage(image, r, 0)
    return r + image.width
  }, 0)
  return URL.createObjectURL(await c.convertToBlob({type: 'image/png'}))
}
async function update() {
  document.body.innerHTML = '';
  const start = Date.now()
  const merged = await merge(files)
  const time = Date.now() - start
  
  document.body.append(
    h('div', files.length, ' files, ', time, ' ms'),
    h('ul', files.map((file, i) => h('li', 
      file.name,
      h('img', {src: file.url, height:100}),
      h('div', {
        style: {
          display: 'inline-block',
          verticalAlign: 'top',
          color: 'red',
        },
        onclick(){
          files.splice(i,1)
          update()
        },
      }, 'x'),
    ))),
    h('img', {
      src: merged,
      style: {
        maxWidth:'100%'
      }
    })
  )
}
update()

function h(tag, optionalAttrs = {}, ...children) {
  const el = document.createElement(tag)
  if (optionalAttrs.constructor != Object) {
    children.unshift(optionalAttrs)
    optionalAttrs = {}
  }
  const {style = {}, ...attrs} = optionalAttrs
  Object.assign(el, attrs)
  Object.assign(el.style, style)
  el.append(...children.flat(Infinity))
  return el
}
