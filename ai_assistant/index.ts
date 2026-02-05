import r2wc from "@r2wc/react-to-web-component";
import Element from "./Element";

// Visual error display since console is suppressed
function showError(message: string, details?: string) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#8b0000;color:#fff;padding:20px;z-index:99999;font-family:monospace;overflow:auto;';
  div.innerHTML = `
    <h2>AI Assistant Error</h2>
    <pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:4px;">${message}</pre>
    ${details ? `<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:4px;margin-top:10px;font-size:12px;">${details}</pre>` : ''}
    <button onclick="location.reload()" style="padding:10px 20px;margin-top:20px;cursor:pointer;">Reload</button>
  `;
  document.body.appendChild(div);
}

// Catch all errors before React loads
window.addEventListener('error', (e) => {
  showError(`Error: ${e.message}`, `File: ${e.filename}\nLine: ${e.lineno}`);
  e.preventDefault();
});

window.addEventListener('unhandledrejection', (e) => {
  showError(`Promise Rejection: ${e.reason?.message || e.reason}`, String(e.reason?.stack || ''));
  e.preventDefault();
});

console.log("[AI Assistant] Module loaded, starting registration...");

// Convert React component to web component and register it
let WebElement;
try {
  WebElement = r2wc(Element, {
    props: {},
  });
  console.log("[AI Assistant] r2wc conversion successful");
} catch (err: any) {
  console.error("[AI Assistant] r2wc conversion failed:", err);
  showError('r2wc conversion failed', err?.stack || String(err));
  throw err;
}

// Register as custom element
try {
  customElements.define("ai-assistant", WebElement);
  console.log("[AI Assistant] Custom element registered successfully");
} catch (err: any) {
  console.error("[AI Assistant] Custom element registration failed:", err);
  showError('Custom element registration failed', err?.stack || String(err));
  throw err;
}
