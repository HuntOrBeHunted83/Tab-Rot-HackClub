let fresh = 30*1000;
let infection = 45*1000;
let decay = 60*1000;
let rotten = 75*1000;
let recover = 5*1000;

const STORAGE_KEY_PREFIX = "tab_origin_";
const SESSION_RESTORE_WINDOW_MS = 4000; // ms after startup to treat new tabs as "restart"
const THRESHOLDS_KEY = "thresholds";

const HEARTBEAT_ALARM = "tabDecayHeartbeat";

const TS_START = 0
const TS_FRESH = 10;
const TS_INFECTION = 20;
const TS_DECAY = 30;
const TS_ROTTEN = 40;
const TS_RECOVER = 50;
let thresholdsReady = loadThresholds(); 

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sendVariableValues") {
    port.onMessage.addListener(async (msg) => {   // now async
      console.log("Received:", msg);

      fresh = Number(msg.fresh);
      infection = Number(msg.infection);
      decay = Number(msg.decay);
      rotten = Number(msg.rotten);
      recover = Number(msg.recover);

      console.log("onConnect ", fresh, infection, decay, rotten);

      await saveThresholds();   // ADD THIS
    });
  }
});

function getState(openedTime, currentTime){
  let state
  if (openedTime + rotten <= currentTime){
    state = TS_ROTTEN
  }else if (openedTime + decay <= currentTime){
    state = TS_DECAY
  }else if (openedTime + infection <= currentTime){
    state = TS_INFECTION
  }else if (openedTime + fresh <= currentTime){
    state = TS_FRESH
  }else{
    state = TS_START
  }
  return state
}

async function setTabState() {

  const currentTime = Date.now();
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    const tabIdStr = String(tab.id)
    const tabInfos = await chrome.storage.session.get(tabIdStr)
    if (!tabInfos || !(tabInfos[tabIdStr]))
    {
      console.log("setTabState tabInfos or tabInfo is null for ", tabIdStr, tabInfos)
      continue
    }
    let tabInfo = tabInfos[tabIdStr]

    if (String(tabInfo.url).startsWith("chrome:")){
      console.log("setTabState Ignore tab ", tabInfo.url)
      continue
    }
    let state = getState(tabInfo.openedTime, currentTime)
    console.log("setTabState ", tabIdStr, state, tabInfo.state, tab.favIconUrl, tabInfo.openedTime, currentTime)

    if (tabInfo.state == TS_RECOVER){
      if (currentTime > tabInfo.openedTime + recover){
        tabInfo.state = state
        await sendTabMessage(tab.id, {type: "setIcon", icon: 'image/' + tabInfo.state +'.png'})
        await setStorageSession({[tabIdStr]: tabInfo})
      }
    }else{
      if (state != tabInfo.state){
        tabInfo.state = state
        await setStorageSession({[tabIdStr]: tabInfo})
        await sendTabMessage(tab.id, {type: "setIcon", icon: 'image/' + tabInfo.state +'.png'})
      }else{
        if(tab.favIconUrl && !(String(tab.favIconUrl).includes(state +'.png'))){
          await sendTabMessage(tab.id, {type: "setIcon", icon: 'image/' + tabInfo.state +'.png'})
        }
      }  
    }
  }
}

function getUrlHostname(url){
  try {
    return new URL(String(url)).hostname
  } catch (error) {
    console.log("Failed to get hostname for ", url, error)
    return ""
  }
}

 async function getOldestTabOpenTime(url){

  let urlInfo = await getStorageLocal(getUrlHostname(url))
  if (!urlInfo){
    console.log("getOldestTabOpenTime is not present", urlInfo, url)
    return Date.now()
  }
  
  let oldestOpenTime = Infinity
  console.log("getOldestTabOpenTime ",urlInfo, Object.keys(urlInfo), url)
  
  Object.keys(urlInfo).forEach(key => {
    if (oldestOpenTime > urlInfo[key])
      oldestOpenTime = urlInfo[key]
  });

  if (oldestOpenTime === Infinity) oldestOpenTime = Date.now()
  return oldestOpenTime
}

async function removeUrlToLocal(url, tabId){

  const urlStr = getUrlHostname(url)
  let tabUrlInfo = await getStorageLocal(urlStr)
  console.log("addUrlToLocal start", tabUrlInfo)
  if (!tabUrlInfo){
    return
  }

  delete tabUrlInfo[tabId]

  console.log("removeUrlToLocal", tabUrlInfo, urlStr, tabId)

  if (Object.keys(tabUrlInfo).length == 0)
    await removeStorageLocl(urlStr)
  else
    await setStorageLocal({[urlStr]: tabUrlInfo})
}

 async function addUrlToLocal(urlStr, tabId, openedTime){

  const url = getUrlHostname(urlStr)
  let tabUrlInfo = await getStorageLocal(url)
  console.log("addUrlToLocal start", tabUrlInfo)
  if (!tabUrlInfo){
    tabUrlInfo = {}
  }

  tabUrlInfo[tabId] =  openedTime
  console.log("addUrlToLocal", tabUrlInfo, url, tabId, openedTime)

  await setStorageLocal({[url]: tabUrlInfo})
}

async function getTabStartupType(tabId){
  let origin = "typed";
  try {
    const { startupTimestamp } = await chrome.storage.session.get("startupTimestamp");
    const age = startupTimestamp ? Date.now() - startupTimestamp : Infinity;
    origin = age < SESSION_RESTORE_WINDOW_MS ? "restart" : "typed";
    const key = `${STORAGE_KEY_PREFIX}${tabId}`;
    await chrome.storage.session.set({[key]: origin });
    console.log(`[getTabStartupType] Tab ${tabId} classified as: "${origin}" (startup age: ${Math.round(age)}ms)`);
  } catch (err) {
    console.warn("[getTabStartupType] Failed to store tab origin:", err);
  }
  return origin;
}

async function setStorageLocal(items) {
  try {
    await chrome.storage.local.set(items)
  } catch (error) {
    console.error("Failed to save data to local storage:", error, chrome.runtime.lastError);
  }
}

async function getStorageLocal(key) {
  try {
    let values = await chrome.storage.local.get(key)
    // Check if the key exists in the object, even if the value is false, 0, or ""
    if (values && key in values) {
      return values[key];
    }
    return null
  } catch (error) {
    console.error("Failed to get data from local storage:", error, chrome.runtime.lastError);
    return null
  }
}

async function removeStorageLocl(items) {
  try {
    await chrome.storage.local.remove(items)
  } catch (error) {
    console.error("Failed to remove data to local storage:", error);
  }
}

async function setStorageSession(items) {
  try {
    await chrome.storage.session.set(items)
  } catch (error) {
    console.error("Failed to save data to session storage:", error);
  }
}

async function removeStorageSession(items) {
  try {
    await chrome.storage.session.remove(items)
  } catch (error) {
    console.error("Failed to remove data to session storage:", error);
  }
}

async function getStorageSession(key) {
  try {
    let values = await chrome.storage.session.get(key)
    if (values && key in values) {
      return values[key];
    }
    return null
  } catch (error) {
    console.error("Failed to get data from session storage:", error, chrome.runtime.lastError);
  }
}

async function loadThresholds() {
  try {
    const stored = await chrome.storage.local.get(THRESHOLDS_KEY);
    const t = stored && stored[THRESHOLDS_KEY];
    if (t) {
      if (Number.isFinite(t.fresh)) fresh = t.fresh;
      if (Number.isFinite(t.infection)) infection = t.infection;
      if (Number.isFinite(t.decay)) decay = t.decay;
      if (Number.isFinite(t.rotten)) rotten = t.rotten;
      if (Number.isFinite(t.recover)) recover = t.recover;
      console.log("[loadThresholds] Restored persisted thresholds:", t);
    }
  } catch (error) {
    console.error("Failed to load persisted thresholds:", error);
  }
}

async function saveThresholds() {
  try {
    await chrome.storage.local.set({
      [THRESHOLDS_KEY]: { fresh, infection, decay, rotten, recover }
    });
  } catch (error) {
    console.error("Failed to save thresholds:", error);
  }
}

async function sendTabMessage(tabId, entries) {
  try {
    await chrome.tabs.sendMessage(tabId, entries)
  } catch (error) {
    console.error("Failed to send message for ", tabId, error);
  }
}

class TabInfo{
        constructor(tabId, url, state, openedTime, title) {
            this.tabId = tabId;
            this.url = url;
            this.state = state;
            this.openedTime = openedTime;
            this.title = title;
        }
        toString() {
            return `TabInfo(id: ${this.tabId}, url: ${this.url}, state: ${this.state}, openedTime: ${this.openedTime}, title: ${this.title})`;
        }
}

let intervalHandle = null;

function ensureIntervalRunning() {
  if (intervalHandle === null) {
    intervalHandle = setInterval(setTabState, 10000);
    console.log("[ensureIntervalRunning] (re)started 10s polling interval");
  }
}

chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    console.log("[onAlarm] Heartbeat fired, re-syncing state");
    ensureIntervalRunning();
    await setTabState();
  }
});

// Start the interval immediately for this worker instance.
ensureIntervalRunning();


chrome.runtime.onStartup.addListener(async () => {
  
  let currentTime = Date.now()
  await setStorageSession({ startupTimestamp: currentTime});
  console.log("onStartup Browser startup time ", currentTime)
  ensureIntervalRunning();


});

chrome.tabs.onActivated.addListener(async (activeInfo) => {  
  
  const tabIdStr = String(activeInfo.tabId)
  let tabInfo =  await getStorageSession(tabIdStr)

  if (!tabInfo){
    console.log(`onActivated tabInfo is not present for `, activeInfo, tabInfo, tabIdStr);
    return;
  }
  
  console.log("onActivated tab", activeInfo, activeInfo.tabId, tabInfo);

  if (tabInfo.state !== TS_START){

    tabInfo.state = TS_RECOVER;
    tabInfo.openedTime = Date.now()

    console.log("onActivated tab", tabIdStr, " reopened at", tabInfo.openedTime);
    
    await setStorageSession({ [tabIdStr]: tabInfo})
    
    await sendTabMessage(activeInfo.tabId, {type: "setIcon", icon: 'image/' + tabInfo.state +'.png'})

    await addUrlToLocal(tabInfo.url, tabIdStr, tabInfo.openedTime)

  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  
  
  let currentTime = Date.now()
  let openedTime

  
  
  let tabStartupType = await getTabStartupType(tab.id)

  if (tabStartupType === "restart"){
    openedTime = await getOldestTabOpenTime(tab.url)
  }else{
    openedTime = currentTime
  }


  console.log("[onCreated] ", tab.id, openedTime)

  // Use the tab's CURRENT id (tab ids are reassigned on restart),
  // but keep the rest of the state from what was saved for this URL.
  let tabInfo = new TabInfo(
    tab.id,
    tab.url,
    getState(openedTime, currentTime),
    openedTime,
    tab.title
  );

  await setStorageSession({ [tab.id]: tabInfo})
  await addUrlToLocal(tab.url, tab.id, tabInfo.openedTime)
  console.log("[Tab onCreated] Created ", tabInfo.toString())
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

  //console.log("onUpdated ", tabId, changeInfo, tab, changeInfo.status, tab.url );

  if (tab && changeInfo && changeInfo.status === "complete" && tab.url){

    const tabIdStr = String(tabId)
    let tabInfo = await getStorageSession(tabIdStr)
    if (!tabInfo) {
      console.log("onUpdated tabInfo is null for tab", tabId, tabInfo)
      return
    } 
    console.log("onUpdated urls ", tabIdStr, tabInfo.url, tab.url)

    if (tabInfo.url !== tab.url){
      await removeUrlToLocal(tabInfo.url, tabIdStr)
      //TODO Check local and delete the local tab url
      tabInfo.url = tab.url
      tabInfo.openedTime = Date.now()
      
      
      await addUrlToLocal(tab.url, tabId, tabInfo.openedTime)
      await setStorageSession({[tabIdStr]: tabInfo})

    }
  }
});

chrome.tabs.onRemoved.addListener(async (tab) => {
  console.log("onRemoved tab ", tab)

  const tabIdStr = String(tab)
  let tabInfo = await getStorageSession(tabIdStr)
  if (!tabInfo) {
    console.log("onRemoved tabInfo is null for tab", tab, tabInfo)
    return
  } 

  await removeUrlToLocal(tabInfo.url, tabIdStr)
  await removeStorageSession(tabIdStr)
  
  //allTabs.delete(tab.tabId)

const key = `${STORAGE_KEY_PREFIX}${tabIdStr}`;
  try {
    await chrome.storage.session.remove(key);
  } catch (_) {
    // Ignore cleanup errors
  }

});