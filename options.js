document.addEventListener("DOMContentLoaded", () => {
  const fresh = document.getElementById("fresh");
  const infection = document.getElementById("infection");
  const decay = document.getElementById("decay");
  const rotten = document.getElementById("rotten");


  const port = chrome.runtime.connect({ name: "sendVariableValues" }); 

  function sendMessage() {
    console.log(
      fresh.value,
      infection.value,
      decay.value,
      rotten.value
    );

    port.postMessage({
      fresh: fresh.value,
      infection: infection.value,
      decay: decay.value,
      rotten: rotten.value
    });
  }

  fresh.addEventListener("change", sendMessage);
  infection.addEventListener("change", sendMessage);
  decay.addEventListener("change", sendMessage);
  rotten.addEventListener("change", sendMessage);

  console.log("Listeners attached");
});
