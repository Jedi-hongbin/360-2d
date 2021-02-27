let timer = null; // 计时器
let prevMoveOrigin = null; // 上次移动的点坐标
let sourceIndex = 1; // 当前播放的资源索引
let requestCompleted = false; // 请求是否完毕
let canBePlayLength = 0; // 加载期间 可以连续播放的数据长度
let requestsCompletedNumber = 0; // 记录当前分段是否请求完成(请求的次数)，请求完成再开始下一段数据请求
// value是Image元素src为请求的图片blob，key是对应的索引
const sources = {};
const timeout = 50; //自动播放的速度,时间间隔
const sourceLength = 261; // TODO: 动态获取需要请求的长度
// const sourceLength = 60; // TODO: 动态获取需要请求的长度
const promiseLimit = 20; // 同时请求次数
let currentBreakpoint = 0; // 当前请求在第几段
const batches = Math.ceil(sourceLength / promiseLimit);
const AllowedPlayLength = 0; // 当有多少张图片获取到时开始播放
const LoadFragment = 5; // 第一次加载时间隔几个数据优先加载展示
const canvasProperties = {
  id: "canvas",
  width: 365,
  height: 365,
};
const progressBarProperties = { id: "progressBar" };
const containerProperties = { id: "canvas_container" };
const defaultImageUrl =
  "https://media.emeralds.com/stone/E1526/video360/E1526-video360-001-Medium.jpg?1";
// 显示默认图片
// drawDefaultImage();
const defaultSource = new Image();
defaultSource.src = defaultImageUrl;
defaultSource.onload = () => drawSource(defaultSource);
// 容器
const container = document.createElement("div");
container.id = containerProperties.id;
// 先插入到dom中然后才能ById获取
document.getElementsByTagName("body")[0].appendChild(container);
// document
//   .getElementById("ProductSection-product-template")
//   .getElementsByClassName(
//     "grid product-single product-single--medium-media"
//   )[0]
//   .appendChild(container);
fillContainer();
const progressbar = document.getElementById(progressBarProperties.id);
const canvas = document.getElementById(canvasProperties.id);
const canvasContext = canvas.getContext("2d");

// getSources();
// breakpointRequest();
// firstLoadFragmentRequest();
// 添加监听

function Drag() {
  // 添加监听
  canvas.addEventListener("mousedown", starDrag);
  canvas.addEventListener("mouseup", stopDrag);
  canvas.addEventListener("mouseleave", stopDrag);
  // 移动端事件
  canvas.addEventListener("touchstart", starDrag);
  canvas.addEventListener("touchend", stopDrag);
  canvas.addEventListener("touchleave", stopDrag);
}

function starDrag(e) {
  e.preventDefault();
  // 阻止默认行为， 用意移动端阻止mouse事件
  const distance = e.clientX || e.touches[0].clientX;
  // 停止自动播放
  clearTimer();
  // 记录当前位置，决定播放方向
  prevMoveOrigin = distance;
  // 添加移动事件
  canvas.addEventListener("touchmove", mouseMove);
  canvas.addEventListener("mousemove", mouseMove);
}

function mouseMove(e) {
  e.preventDefault();
  const distance = e.clientX || e.touches[0].clientX;
  const nextSourcesIndex = computedNextSourcesIndex(
    distance,
    prevMoveOrigin,
    sourceIndex,
    Object.keys(sources).length
  );
  toggleSource(nextSourcesIndex);
  prevMoveOrigin = distance;
}

function stopDrag() {
  if (timer) return;
  clearTimer();
  canvas.removeEventListener("mousemove", mouseMove);
  canvas.removeEventListener("touchmove", mouseMove);
  // 从当前位置开启自动播放
  autoPlay(sourceIndex);
}

function autoPlay(startIndex) {
  clearTimeout(timer);
  // 没请求完所有资源时,播放完当前所有图片就暂停等待新的图片加入
  if (!requestCompleted && sourceIndex === canBePlayLength) {
    clearTimer();
  } else {
    const sourceIndex =
      startIndex <= Object.keys(sources).length ? startIndex : 1;
    toggleSource(sourceIndex);
    timer = setTimeout(() => {
      autoPlay(sourceIndex + 1);
    }, timeout);
  }
}

function toggleSource(index) {
  const source = sources[index];
  drawSource(source);
  sourceIndex = index;
}

function clearTimer() {
  clearTimeout(timer);
  timer = null;
}

function sourceUrl(num) {
  const sourceNumber = num.toString().padStart(3, "0");
  const url = `https://media.emeralds.com/stone/E1526/video360/E1526-video360-${sourceNumber}-Medium.jpg?1`;
  return url;
}

async function firstLoadFragmentRequest() {
  const shouldLoadSourceIndex = Array.from(
    { length: sourceLength },
    (_, i) => i
  ).filter((_, index) => (index % LoadFragment === 0 ? index : false));
  //根据分成片段的数组发送请求
  for (const index of shouldLoadSourceIndex) {
    const url = sourceUrl(index);
    const imageBlob = await requestImageBlob(url);

    if (imageBlob) {
      const image = generateImage(imageBlob);
      image.onload = () => {
        sources[index] = image;
        drawSource(image);
        sourceIndex = index;
      };
    }
    // 进度条变化
    const currentSourcesLength = Object.keys(sources).length;
    const progress =
      ((currentSourcesLength / sourceLength) % sourceLength) * 100;
    progressbar.style["width"] = progress + "%";
  }
  // 加载全部图片
  breakpointRequest();
}

// canvas绘制图片
function drawSource(image) {
  const { width, height } = canvasProperties;
  canvasContext.drawImage(image, 0, 0, width, height);
}
breakpointRequest();
// 请求一段数据
function breakpointRequest() {
  requestsCompletedNumber++;
  const { start, end } = computedBreakpoint(currentBreakpoint);
  for (let index = start; index <= end; index++) {
    const sourceNumber = index.toString().padStart(3, "0");
    const url = `https://media.emeralds.com/stone/E1526/video360/E1526-video360-${sourceNumber}-Medium.jpg?1`;
    // const url = `http://localhost:4000/api/source/${sourceNumber}`;
    requestSource(url, index, end);
  }
}
let date = +new Date();
function requestSource(url, index, end) {
  //   if (!Object.keys(sources).includes(String(index))) {
  requestImageBlob(url)
    .then((imageBlob) => {
      const image = generateImage(imageBlob);
      sources[index] = image;
      //计算当前这条数据和之前的数据是连续的 则播放到这条数据的位置
      computedPlay(index);
      handleRequestSource(end);
      const currentDate = +new Date();
      console.log(index + "-->", currentDate - date);
      date = currentDate;
    })
    .catch((err) => {
      console.error("err-", index, err);
      handleRequestSource(end);
    });
  //   } else handleRequestSource(end);
}

// 不管图片请求成功还是失败都要执行的操作
function handleRequestSource(end) {
  // 进度条
  progressBarProgress();
  // if 执行完当前分段的所有数据
  if (requestsCompletedNumber === end) {
    ++currentBreakpoint < batches && breakpointRequest();
  }
  // 如果全部请求完毕
  requestsCompletedNumber === sourceLength && handleRequestComplete();
  requestsCompletedNumber++;
}

// 加载进度条进度变化
function progressBarProgress() {
  const currentSourcesLength = Object.keys(sources).length;
  const progress = ((currentSourcesLength / sourceLength) % sourceLength) * 100;
  progressbar.style["width"] = progress + "%";
}

//判断是否有可播放资源
function computedPlay(currentSourceIndex) {
  const sourcesKeys = Object.keys(sources);
  const currentSourcesLength = sourcesKeys.length;

  if (currentSourcesLength < AllowedPlayLength) return;

  const { length } = sourcesKeys.filter((key) => key <= currentSourceIndex);
  // 如果当前位置以前所有的图片是连续的，那就开始播放
  if (length === currentSourceIndex) {
    // 设置可以播放source的长度
    canBePlayLength = currentSourceIndex;
    // 当前如果播放则不用再播放
    !timer && autoPlay(sourceIndex);
  }
}

function generateImage(bold) {
  const image = new Image();
  const imgSrc = window.URL.createObjectURL(bold);
  image.src = imgSrc;
  return image;
}

function handleRequestComplete() {
  requestCompleted = true;
  !timer && autoPlay(sourceIndex);
  // 隐藏进度条
  progressbar.style["opacity"] = 0;
  // 允许手势滑动查看
  Drag();
}

function requestImageBlob(url) {
  return fetch(url, { responseType: "blob", cache: "no-cache" }).then((res) =>
    res.blob()
  );
}

function setProperty(element, props) {
  for (const [property, value] of Object.entries(props)) {
    element[property] = value;
  }
}

function setElementStyle(element, styles) {
  for (const [property, value] of Object.entries(styles)) {
    element.style[property] = value;
  }
}

function computedNextSourcesIndex(
  clientX,
  prevClientX,
  currentSourceIndex,
  sourcesLength
) {
  const nextIndex =
    clientX > prevClientX ? currentSourceIndex - 1 : currentSourceIndex + 1;
  const allowValue = nextIndex <= sourcesLength && nextIndex >= 1;

  return allowValue ? nextIndex : nextIndex < 1 ? sourcesLength : 1;
}

function fillContainer() {
  const containerStyles = {
    position: "relative",
    display: "inline-block",
  };
  setElementStyle(container, containerStyles);
  // 进度条
  const progressBar = document.createElement("div");
  progressBar.id = progressBarProperties.id;
  const progressBarStyles = {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "0%",
    height: "5px",
    backgroundColor: "rgba(10,200,10,0.5)",
    transition: "width 0.2s linear",
  };
  setElementStyle(progressBar, progressBarStyles);
  // canvas
  const Canvas = document.createElement("canvas");
  Canvas.style["cursor"] = "ew-resize";
  setProperty(Canvas, canvasProperties);
  // canvas和进度条插入到container中
  const eContainer = document.getElementById("canvas_container");
  eContainer.appendChild(Canvas);
  eContainer.appendChild(progressBar);
}

function drawDefaultImage() {
  const defaultSource = new Image();
  defaultSource.src = defaultImageUrl;
  defaultSource.onload = () => drawSource(defaultSource);
}

function computedBreakpoint(index) {
  const small = index * promiseLimit;
  const start = small + 1;
  const big = (index + 1) * promiseLimit;
  const end = big <= sourceLength ? big : sourceLength;
  return { start, end };
}

function request() {
  fetch("http://localhost:4000/api/source/001")
    .then((res) => res.blob())
    .then((res) => {
      if (!res) return;
      const image = new Image();
      const canvas = document.createElement("canvas");
      canvas.width = 365;
      canvas.height = 365;
      canvas.style.border = "1px solid #ccc";

      document.body.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      //   const fileUrl = URL.createObjectURL(res);
      //   URL.revokeObjectURL(fileUrl);
      const reader = new FileReader();
      reader.readAsDataURL(res);
      reader.addEventListener("load", ({ target: { result } }) => {
        image.src = result;
        image.onload = () => {
          ctx.drawImage(image, 0, 0, 365, 365);
        };
      });
    })
    .catch((err) => {
      console.log("err", err);
    });
}

/**
 * @param {*} imgData 图片对象
 * @param {*} str     图片下载到本地的文件名
 * @param {*} type    图片下载到本地的类型
 */
// function commonDownloads(blob, name, type) {
//   try {
//     if (window.navigator && window.navigator.msSaveOrOpenBlob) {
//       // 兼容ie
//       window.navigator.msSaveOrOpenBlob(blob, name);
//     } else {
//       const downloadElement = document.createElement("a");
//       downloadElement.innerHTML = `${name} download`;
//       downloadElement.style["margin"] = "2px 2px";
//       downloadElement.style["display"] = "block";
//       const href = window.URL.createObjectURL(blob); // 静态方法会创建一个 DOMnameing，其中包含一个表示参数中给出的对象的URL。这个 URL 的生命周期和创建它的窗口中的 document 绑定。这个新的URL 对象表示指定的 File 对象或 Blob 对象
//       downloadElement.href = href;
//       downloadElement.download = name;
//       document.body.appendChild(downloadElement);
//       downloadElement.click();
//       document.body.removeChild(downloadElement);
//       window.URL.revokeObjectURL(href); // 释放之前已经存在的、通过调用 URL.createObjectURL() 创建的 URL 对象。当你结束使用某个 URL 对象之后，应该通过调用这个方法来让浏览器知道不用在内存中继续保留对这个文件的引用了。
//     }
//   } catch (error) {
//     console.error("download err -> ", error);
//   }
// }
// function imageDownload(blob, index) {
//   const name = `${index.toString().padStart(3, "0")}.png`;
//   const type =
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8";
//   commonDownloads(blob, name, type);
// }
