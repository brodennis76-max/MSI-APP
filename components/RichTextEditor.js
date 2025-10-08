import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
let Quill; let ReactQuill;
if (Platform.OS === 'web') {
  try {
    // Dynamically require to avoid bundling issues on native
    Quill = require('quill');
    ReactQuill = require('react-quill');
    require('react-quill/dist/quill.snow.css');
  } catch {}
}

const toolbarHtml = (initial) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 8px; }
      .toolbar { position: sticky; top: 0; background: #f7f7f7; border: 1px solid #ddd; border-radius: 6px; padding: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
      .btn { border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; background: #fff; cursor: pointer; font-size: 12px; }
      .editor { margin-top: 8px; min-height: 220px; border: 1px solid #ccc; border-radius: 6px; padding: 10px; }
      .editor:focus { outline: none; }
      img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" onclick="document.execCommand('formatBlock', false, 'H1')">H1</button>
      <button class="btn" onclick="document.execCommand('formatBlock', false, 'H2')">H2</button>
      <button class="btn" onclick="document.execCommand('formatBlock', false, 'P')">Body</button>
      <button class="btn" onclick="document.execCommand('bold')"><b>B</b></button>
      <button class="btn" onclick="document.execCommand('italic')"><i>I</i></button>
      <button class="btn" onclick="document.execCommand('underline')"><u>U</u></button>
      <button class="btn" onclick="document.execCommand('insertUnorderedList')">• List</button>
      <button class="btn" onclick="document.execCommand('insertOrderedList')">1. List</button>
      <input id="imgInput" type="file" accept="image/*" style="display:none" />
      <button class="btn" onclick="document.getElementById('imgInput').click()">Image</button>
    </div>
    <div id="editor" class="editor" contenteditable="true">${initial}</div>
    <script>
      const editor = document.getElementById('editor');
      const imgInput = document.getElementById('imgInput');
      function post() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(editor.innerHTML);
      }
      editor.addEventListener('input', post);
      editor.addEventListener('blur', post);
      window.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.type === 'set') {
            editor.innerHTML = data.html || '';
            post();
          }
        } catch {}
      });
      imgInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
          const src = evt.target.result;
          document.execCommand('insertImage', false, src);
          post();
        };
        reader.readAsDataURL(file);
      });
      // Initial post on load
      setTimeout(post, 50);
    </script>
  </body>
  </html>
`;

export default function RichTextEditor({ value, onChange }) {
  const webRef = useRef(null);
  const initialHtml = value && value.trim().length > 0 ? value : '';
  const [webValue, setWebValue] = useState(value || '');

  useEffect(() => {
    // Sync external value changes into the editor
    if (webRef.current && value !== undefined) {
      const msg = JSON.stringify({ type: 'set', html: value || '' });
      try {
        webRef.current.postMessage(msg);
      } catch {}
    }
    if (Platform.OS === 'web') {
      setWebValue(value || '');
    }
  }, [value]);

  if (Platform.OS === 'web' && ReactQuill) {
    const modules = useMemo(() => ({
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    }), []);
    const formats = useMemo(() => (
      ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'image']
    ), []);

    return (
      <View style={styles.container}>
        <ReactQuill
          theme="snow"
          value={webValue}
          onChange={(html) => onChange && onChange(html)}
          modules={modules}
          formats={formats}
          style={{ height: 300 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: toolbarHtml(initialHtml) }}
        onMessage={(e) => {
          const html = e?.nativeEvent?.data || '';
          onChange && onChange(html);
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 320 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});


