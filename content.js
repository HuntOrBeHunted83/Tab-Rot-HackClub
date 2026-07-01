
 
 chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "setIcon") {

    /*
    document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = chrome.runtime.getURL(msg.icon) + "?t=" + Date.now();
    document.head.appendChild(link);
    */

    updateIcon(msg.icon);
  }
});


let intervalId = null;
let currentFrame = 0;

function updateIcon(state){
  if (state === 'image/50.png'){
        if (intervalId){
      clearInterval(intervalId);
    }
    intervalId = setInterval(() => {

      faviconLink = document.querySelector("link[rel*='icon']");
      if (faviconLink) {
        currentFrame = (currentFrame + 1) % frames.length;
        faviconLink.href = chrome.runtime.getURL(frames[currentFrame]) + "?t=" + Date.now();
      }
    }, 200);
  }else{
    if (intervalId){
      clearInterval(intervalId);
    }
    document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = chrome.runtime.getURL(state) + "?t=" + Date.now();
    document.head.appendChild(link);
  }
}

// 1. Break your GIF into individual static PNG frames
const frames = [
  'image/10.png',
  'image/20.png',
  'image/30.png',
  'image/40.png'
];

