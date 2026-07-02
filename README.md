<h1>Tab Rot!</h1>

<p><strong>Tab Rot!</strong> is a Chrome extension that makes long‑ignored tabs visibly “rot” over time by changing their favicon. Tabs progress through several states (fresh → infected → decay → rotten → recover) based on how long they have been open and when you last used them.</p>

<p>This helps you notice and close stale tabs instead of letting them quietly pile up.</p>

<h2>How it works</h2>

<p>Every tab gets a timestamp when it is created or when its URL changes.</p>

<p>The background script periodically checks all tabs and computes a state from the elapsed time:</p>

<ul>
  <li><strong>TS_START</strong>: brand new tab.</li>
  <li><strong>TS_FRESH</strong>: recently opened.</li>
  <li><strong>TS_INFECTION</strong>: has been open for a while.</li>
  <li><strong>TS_DECAY</strong>: has been idle a long time.</li>
  <li><strong>TS_ROTTEN</strong>: very old tab.</li>
</ul>

<p>When the state changes, the extension sends a message to the content script in that tab.</p>

<p>The content script replaces the page’s favicon with another icons that corresponds to the current state.</p>

<p>When you re‑activate a tab, it briefly enters a <strong>TS_RECOVER</strong> state where the icon animates through the frames before settling back into its normal state.</p>

<h2>Default state thresholds</h2>

<ul>
  <li>Fresh: 2 minutes</li>
  <li>Infection: 30 minutes</li>
  <li>Decay: 3 hours</li>
  <li>Rotten: 1 day</li>
  <li>Recover animation: 5 seconds</li>
</ul>

<h2>Features</h2>

<ul>
  <li>Tabs visibly age the longer they stay inactive, moving through multiple states 
  <li>Each tab’s current decay stage is stored and restored across browser restarts using local storage.</li>
  <li>When you revisit an aged tab, a restoration animation plays to make the recovery easy to notice.</li>
  <li>Users can customize when decay begins with a configurable inactivity threshold (for example: after 1 hour, 1 day, or 1 week).</li>
  <li>The extension does not alter how pages load, run scripts, or behave.</li>
</ul>

<h2>Getting it running</h2>

<p>Tab Rot is not published in a web store yet, so you need to load it manually:</p>

<ol>
  <li>Open <code>chrome://extensions</code> (or <code>brave://extensions</code> in Brave).</li>
  <li>Enable <strong>Developer mode</strong>.</li>
  <li>Click <strong>Load unpacked</strong> and select the <code>Tab-Vibe</code> folder.</li>
  <li>Any Chromium-based browser (Chrome, Brave, Edge, etc.) will load the extension using this method.</li>
</ol>
