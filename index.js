let timer = null; // 计时器
let prevMoveOrigin = null; // 上次移动的点坐标
let sourceIndex = 1; // 当前播放的资源索引
let requestCompleted = false; // 请求是否完毕
let canBePlayLength = 0; // 加载期间 可以连续播放的数据长度
// value是Image元素src为请求的图片blob，key是对应的索引
const sources = {};
const timeout = 50; //自动播放的速度,时间间隔
const sourceLength = 261; // TODO: 动态获取需要请求的长度
// const sourceLength = 60; // TODO: 动态获取需要请求的长度
const promiseLimit = 20; // 同时请求次数
let currentBreakpoint = 0; // 当前请求在第几段
const batches = Math.ceil(sourceLength / promiseLimit);
const AllowedPlayLength = 0; // 当有多少张图片获取到时开始播放
const LoadFragment = 4; // 第一次加载时间隔几个数据优先加载展示
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
breakpointRequest();

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
    clearTimeout(timer);
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

// canvas绘制图片
function drawSource(image) {
  const { width, height } = canvasProperties;
  canvasContext.drawImage(image, 0, 0, width, height);
}

// 请求一段数据
function breakpointRequest() {
  const { start, end } = computedBreakpoint(currentBreakpoint);
  for (let num = start; num <= end; num++) {
    const sourceNumber = num.toString().padStart(3, "0");
    const url = `https://media.emeralds.com/stone/E1526/video360/E1526-video360-${sourceNumber}-Medium.jpg?1`;
    requestSource(url, num, end);
  }
}

function requestSource(url, index, end) {
  requestImageBlob(url)
    .then((imageBlob) => {
      const image = generateImage(imageBlob);
      sources[index] = image;
      const sourcesKeys = Object.keys(sources);
      const currentSourcesLength = sourcesKeys.length;
      progressBarProgress(currentSourcesLength);
      //有一定条数连续的数据，开始播放
      computedPlay(sourcesKeys, index);
      // 当执行完当前分段时
      if (index === end) {
        ++currentBreakpoint < batches && breakpointRequest();
      }
      // 如果全部请求完毕
      currentSourcesLength === sourceLength && handleRequestComplete();
    })
    .catch((err) => {
      console.log.error("err-", index, err);
    });
}

// 加载进度条进度变化
function progressBarProgress(currentSourcesLength) {
  const progress = ((currentSourcesLength / sourceLength) % sourceLength) * 100;
  progressbar.style["width"] = progress + "%";
}

//判断是否有可播放资源
function computedPlay(sourcesKeys, currentSourceIndex) {
  const currentSourcesLength = sourcesKeys.length;

  if (currentSourcesLength < AllowedPlayLength) return;

  const { length } = sourcesKeys.filter((key) => key <= currentSourceIndex);
  // 如果当前位置以前所有的图片是连续的，那就开始播放
  if (length === currentSourceIndex) {
    // 设置可以播放source的长度
    canBePlayLength = currentSourceIndex;
    console.log(timer);
    autoPlay(sourceIndex);
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
  autoPlay(sourceIndex);
  // 隐藏进度条
  progressbar.style["opacity"] = 0;
  // 允许手势拖拽
  Drag();
}

function requestImageBlob(url) {
  return fetch(url, { responseType: "blob" }).then((res) => res.blob());
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
