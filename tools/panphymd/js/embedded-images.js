/** Keep embedded image bytes out of the editable view, never out of documents. */
export function createEmbeddedImageModel(namespace) {
  const images = new Map();
  const references = new Map();
  const imagePattern = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi;
  let nextId = 1;

  function collapse(text, positions = []) {
    const mapped = [...positions];
    let shift = 0;
    const value = text.replace(imagePattern, (data, offset) => {
      let reference = references.get(data);
      if (!reference) {
        reference = `panphy-image:${namespace}:${nextId++}`;
        images.set(reference, data);
        references.set(data, reference);
      }
      positions.forEach((position, index) => {
        if (position >= offset + data.length) mapped[index] += reference.length - data.length;
        else if (position > offset) mapped[index] = offset + shift + reference.length;
      });
      shift += reference.length - data.length;
      return reference;
    });
    return { value, positions: mapped };
  }

  function expand(text) {
    // One pass prevents replacement text from being interpreted as a reference.
    return text.replace(/panphy-image:[a-z0-9-]+:\d+/g, reference => images.get(reference) || reference);
  }

  return { collapse, expand };
}

export function createEmbeddedImageEditor(input, notice, toggle, onViewChange) {
  const model = createEmbeddedImageModel(crypto.randomUUID().slice(0, 8));
  let collapsed = true;

  function refreshNotice() {
    notice.hidden = model.expand(input.value) === input.value && !/data:image\//i.test(input.value);
    toggle.textContent = collapsed ? 'Show image data' : 'Hide image data';
    toggle.setAttribute('aria-pressed', String(!collapsed));
  }

  function compactInput() {
    if (collapsed) {
      const result = model.collapse(input.value, [input.selectionStart, input.selectionEnd]);
      if (result.value !== input.value) {
        const scrollTop = input.scrollTop;
        const direction = input.selectionDirection;
        input.value = result.value;
        input.setSelectionRange(...result.positions, direction);
        input.scrollTop = scrollTop;
      }
    }
    refreshNotice();
  }

  toggle.addEventListener('click', () => {
    // Map selection through expansion before switching views.
    const start = model.expand(input.value.slice(0, input.selectionStart)).length;
    const end = model.expand(input.value.slice(0, input.selectionEnd)).length;
    const content = model.expand(input.value);
    collapsed = !collapsed;
    const result = collapsed ? model.collapse(content, [start, end]) : { value: content, positions: [start, end] };
    input.value = result.value;
    input.setSelectionRange(...result.positions);
    refreshNotice();
    onViewChange();
  });

  // Copying to another editor must include the real bytes, not session references.
  for (const eventType of ['copy', 'cut']) {
    input.addEventListener(eventType, event => {
      const selection = input.value.slice(input.selectionStart, input.selectionEnd);
      const expanded = model.expand(selection);
      if (expanded === selection || !event.clipboardData) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', expanded);
      if (eventType === 'cut') {
        input.setRangeText('', input.selectionStart, input.selectionEnd, 'start');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  return {
    get value() { return model.expand(input.value); },
    set value(content) {
      input.value = collapsed ? model.collapse(content).value : content;
      refreshNotice();
    },
    compactInput,
    displayText(text) { return collapsed ? model.collapse(text).value : text; }
  };
}

// Image handoffs live in the URL fragment, including when tabs do not share storage.
export function parseLinkedImageImport(hash) {
  if (!hash.startsWith('#import=')) return null;
  const payload = JSON.parse(decodeURIComponent(hash.slice(8)));
  const markdown = payload && payload.markdown;
  if (typeof markdown !== 'string' || !/^!\[[^\]\r\n]*\]\(data:image\/(?:svg\+xml|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}\)$/.test(markdown)) {
    throw new Error('The image in this link could not be read.');
  }
  return markdown;
}
