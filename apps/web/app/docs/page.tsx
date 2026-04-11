import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
};

export default function DocsIndexPage() {
  return (
    <div>
      <h1>Getting Started with Calipers</h1>
      <p>
        Calipers is a free, open-source Chrome extension that lets designers and developers
        instantly measure distances, inspect dimensions, and check alignment on any webpage.
        Think PixelSnap, but for the browser — with direct DOM access for pixel-perfect accuracy.
      </p>

      <h2>Installation</h2>

      <h3>From the Chrome Web Store</h3>
      <ol>
        <li>
          Visit the{' '}
          <a href="#">Calipers page on the Chrome Web Store</a>.
        </li>
        <li>Click <strong>Add to Chrome</strong>.</li>
        <li>Click the Calipers icon in your toolbar, or press <code>⌘⇧M</code> to activate.</li>
      </ol>

      <h3>From Source</h3>
      <ol>
        <li>
          Clone the repository:
          <pre>
            <code>git clone https://github.com/calipers/calipers.git</code>
          </pre>
        </li>
        <li>
          Install dependencies:
          <pre>
            <code>pnpm install</code>
          </pre>
        </li>
        <li>
          Build the extension:
          <pre>
            <code>pnpm build --filter=@calipers/extension</code>
          </pre>
        </li>
        <li>Open Chrome and navigate to <code>chrome://extensions</code>.</li>
        <li>Enable <strong>Developer mode</strong> (top right toggle).</li>
        <li>
          Click <strong>Load unpacked</strong> and select the{' '}
          <code>apps/extension/dist</code> folder.
        </li>
      </ol>

      <h2>Quick Tour</h2>

      <h3>Activating Calipers</h3>
      <p>
        Press <code>⌘⇧M</code> (Mac) or <code>Ctrl+Shift+M</code> (Windows/Linux) to toggle
        Calipers on the current page. You can also click the extension icon in your toolbar and
        use the on/off toggle in the popup.
      </p>

      <h3>Modes</h3>
      <p>Calipers has three modes, selectable from the popup or via keyboard shortcuts:</p>
      <ul>
        <li>
          <strong>Inspect (1)</strong> — Hover over elements to see their width and height.
        </li>
        <li>
          <strong>Measure (2)</strong> — Click two elements to measure the distance between them.
        </li>
        <li>
          <strong>Guides (3)</strong> — Place draggable alignment guides on the page.
        </li>
      </ul>

      <h2>Keyboard Shortcuts</h2>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>⌘⇧M</code> / <code>Ctrl+Shift+M</code></td><td>Toggle Calipers on/off</td></tr>
          <tr><td><code>1</code></td><td>Switch to Inspect mode</td></tr>
          <tr><td><code>2</code></td><td>Switch to Measure mode</td></tr>
          <tr><td><code>3</code></td><td>Switch to Guides mode</td></tr>
          <tr><td><code>B</code></td><td>Toggle box model overlay</td></tr>
          <tr><td><code>C</code></td><td>Copy current measurement</td></tr>
          <tr><td><code>S</code></td><td>Take screenshot</td></tr>
          <tr><td><code>Esc</code></td><td>Deactivate / cancel</td></tr>
        </tbody>
      </table>
    </div>
  );
}
