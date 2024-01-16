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
    file.overlap = 0
    file.url = URL.createObjectURL(file)
    file.image = await load(file.url)
    file.image.file = file
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
  const first = !merge.current
  const current = merge.current = {}
  await new Promise(resolve=>setTimeout(resolve, 100));
  if (!first && current != merge.current) return merge.last
  const images = files.map(file => file.image)
  const width = images.reduce((r, image) => r - image.file.overlap + image.width, 0)
  const height = Math.max(0, ...images.map(image => image.height))
  const c = new OffscreenCanvas(width || 1, height || 1)
  const cc = c.getContext('2d')
  images.reduce((r, image) => {
    cc.drawImage(image, r - image.file.overlap, 0)
    return r - image.file.overlap + image.width
  }, 0)
  const blob = await c.convertToBlob({type: 'image/png'})
  if (!first && current != merge.current) return merge.last
  if (merge.last) URL.revokeObjectURL(merge.last)
  const result = URL.createObjectURL(blob)
  merge.last = result
  merge.current = null
  return result
}

function columnPixels(image, x) {
  const c = new OffscreenCanvas(1, image.height)
  const cc = c.getContext('2d')
  cc.drawImage(image, x, 0, 1, image.height, 0, 0, 1, image.height)
  return cc.getImageData(0, 0, 1, image.height).data
}

function deltaE(img1, img2, overlap) {
  const c1 = columnPixels(img1, img1.width - overlap)
  const c2 = columnPixels(img2, 0)
  const e = Array.from({length: c1.length}, (_, i) => c2[i] - c1[i])
  return e.reduce((r, a) => r + Math.abs(a), 0)
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
      h('img', {
        src: file.url, height:100,
        style: {
          display: 'inline-block',
          verticalAlign: 'top',
        },
      }),
      h('input', {
        style: 'width: 4em',
        type: 'number',
        value: file.overlap,
        oninput: e=> {
          file.overlap=e.currentTarget.value
          updateResult()
        },
      }),
      i > 0 && h('button', {
        onclick: e=> {
          const prev = files[i-1]
          let bestOverlap, bestDeltaE = Infinity
          for (let overlap = 1; overlap <= prev.image.width; overlap++) {
            const testDeltaE = deltaE(prev.image, file.image, overlap)
            if (testDeltaE < bestDeltaE) {
              bestDeltaE = testDeltaE
              bestOverlap = overlap
            }
          }
          console.log('dE', bestDeltaE)
          file.overlap = bestOverlap
          update()
        },
      }, 'Auto'),
      h('div', {
        style: {
          display: 'inline-block',
          color: 'red',
        },
        onclick(){
          files.splice(i,1)
          update()
        },
      }, 'x'),
    ))),
    h('img', {
      id: 'result',
      src: merged,
      style: {
        maxWidth:'100%'
      }
    })
  )
}
update()
async function updateResult() {
  const start = Date.now()
  const merged = await merge(files)
  const time = Date.now() - start
  if (merged) document.getElementById('result').src = merged
}

function h(tag, optionalAttrs = {}, ...children) {
  const el = document.createElement(tag)
  if (optionalAttrs.constructor != Object) {
    children.unshift(optionalAttrs)
    optionalAttrs = {}
  }
  const {style = {}, ...attrs} = optionalAttrs
  Object.assign(el, attrs)
  if (typeof style == 'string') el.style = style
  else Object.assign(el.style, style)
  el.append(...children.flat(Infinity).filter(x => x || x === 0))
  return el
}
