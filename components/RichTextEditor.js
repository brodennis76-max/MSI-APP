import React, { useState, useRef } from 'react';
import { Platform, View, TouchableOpacity, Text, StyleSheet, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

// Convert markdown-style formatting to HTML
const convertMarkdownToHtml = (text) => {
  if (!text) return '';
  
  return text
    // Convert **bold** to <strong>bold</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>italic</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert # Header to <h1>Header</h1>
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Convert ## Subheader to <h2>Subheader</h2>
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    // Convert - List item to <li>List item</li>
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Convert numbered lists
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>');
};

// Convert HTML back to markdown for editing
const convertHtmlToMarkdown = (html) => {
  if (!html) return '';
  
  return html
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    .replace(/<li>(.*?)<\/li>/g, '- $1')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
};

const quillWebHtml = (initial) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <style>
      body { 
        font-family: Helvetica, Arial, sans-serif; 
        margin: 0; 
        padding: 0; 
        background: #fff;
      }
      #editor { 
        height: 300px; 
      }
      .ql-editor {
        font-size: 14px;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div id="editor">${initial}</div>
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script>
      var quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'header': [1, 2, 3, false] }],
            ['clean']
          ],
          keyboard: {
            bindings: {
              bold: {
                key: 'B',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('bold', !quill.getFormat(range).bold);
                }
              },
              italic: {
                key: 'I',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('italic', !quill.getFormat(range).italic);
                }
              },
              underline: {
                key: 'U',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('underline', !quill.getFormat(range).underline);
                }
              }
            }
          }
        }
      });

      function postContent() {
        const html = quill.root.innerHTML;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(html);
        }
      }

      quill.on('text-change', function() {
        postContent();
      });

      window.addEventListener('message', function(e) {
        try {
          const data = JSON.parse(e.data);
          if (data && data.type === 'set') {
            quill.root.innerHTML = data.html || '';
          }
        } catch (error) {
          console.log('Error parsing message:', error);
        }
      });

      setTimeout(postContent, 100);
    </script>
  </body>
</html>
`;

const simpleEditorHtml = (initial) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { 
        font-family: Helvetica, Arial, sans-serif; 
        margin: 0; 
        padding: 8px; 
        background: #fff;
        overflow: hidden;
      }
      .toolbar { 
        position: sticky; 
        top: 0; 
        background: #f7f7f7; 
        border: 1px solid #ddd; 
        border-radius: 6px 6px 0 0; 
        padding: 6px; 
        display: flex; 
        flex-wrap: wrap; 
        gap: 6px; 
        z-index: 1000;
      }
      .btn { 
        border: 1px solid #ccc; 
        padding: 6px 8px; 
        border-radius: 4px; 
        background: #fff; 
        cursor: pointer; 
        font-size: 12px; 
        user-select: none;
      }
      .btn:hover { background: #f0f0f0; }
      .btn.active { background: #007bff; color: white; }
      .editor { 
        margin-top: 0; 
        min-height: 250px; 
        max-height: 300px;
        border: 1px solid #ccc; 
        border-top: none;
        border-radius: 0 0 6px 6px;
        padding: 10px; 
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.5;
      }
      .editor:focus { outline: none; }
      img { max-width: 100%; height: auto; }
      .hints {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        padding: 4px 8px;
        background: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #e9ecef;
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" onclick="formatText('bold')"><b>B</b></button>
      <button class="btn" onclick="formatText('italic')"><i>I</i></button>
      <button class="btn" onclick="formatText('underline')"><u>U</u></button>
      <button class="btn" onclick="formatBlock('h1')">H1</button>
      <button class="btn" onclick="formatBlock('h2')">H2</button>
      <button class="btn" onclick="formatBlock('p')">P</button>
      <button class="btn" onclick="insertList('ul')">• List</button>
      <button class="btn" onclick="insertList('ol')">1. List</button>
    </div>
    <div id="editor" class="editor" contenteditable="true">${initial}</div>
    <div class="hints">
      <strong>Shortcuts:</strong> Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline)
    </div>
    <script>
      const editor = document.getElementById('editor');
      
      function post() {
        const html = editor.innerHTML;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(html);
        }
      }
      
      function formatText(command) {
        document.execCommand(command, false, null);
        post();
      }
      
      function formatBlock(tag) {
        document.execCommand('formatBlock', false, tag);
        post();
      }
      
      function insertList(type) {
        document.execCommand('insertUnorderedList', false, null);
        post();
      }
      
      // Keyboard shortcuts
      editor.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
          switch(e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              formatText('bold');
              break;
            case 'i':
              e.preventDefault();
              formatText('italic');
              break;
            case 'u':
              e.preventDefault();
              formatText('underline');
              break;
          }
        }
      });
      
      editor.addEventListener('input', post);
      editor.addEventListener('blur', post);
      
      window.addEventListener('message', function(e) {
        try {
          const data = JSON.parse(e.data);
          if (data && data.type === 'set') {
            editor.innerHTML = data.html || '';
          }
        } catch (error) {
          console.log('Error parsing message:', error);
        }
      });
      
      // Initial post
      setTimeout(post, 50);
    </script>
  </body>
</html>
`;

export default function RichTextEditor({ value, onChange }) {
  const [content, setContent] = useState('');
  const webRef = useRef(null);

  // Formatting functions
  const applyFormat = (format, formatValue = null) => {
    if (Platform.OS === 'web') {
      // For web, we'll use the WebView with Quill
      const message = JSON.stringify({
        type: 'format',
        format: format,
        value: formatValue
      });
      webRef.current?.postMessage(message);
    } else {
      // For native, we'll use simple text insertion
      insertFormatting(format);
    }
  };

  const insertFormatting = (format) => {
    let insertText = '';
    
    switch (format) {
      case 'bold':
        insertText = '**bold text**';
        break;
      case 'italic':
        insertText = '*italic text*';
        break;
      case 'header1':
        insertText = '# Header 1\n';
        break;
      case 'header2':
        insertText = '## Header 2\n';
        break;
      case 'list':
        insertText = '- List item\n';
        break;
      case 'numbered':
        insertText = '1. Numbered item\n';
        break;
    }
    
    const newContent = content + insertText;
    setContent(newContent);
    onChange && onChange(convertMarkdownToHtml(newContent));
  };

  // Toolbar component with custom buttons
  const CustomToolbar = () => (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 1)}>
        <Text style={styles.buttonText}>H1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 2)}>
        <Text style={styles.buttonText}>H2</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('bold')}>
        <MaterialIcons name="format-bold" size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('italic')}>
        <MaterialIcons name="format-italic" size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('underline')}>
        <MaterialIcons name="format-underline" size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'ordered')}>
        <MaterialIcons name="format-list-numbered" size={16} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'bullet')}>
        <MaterialIcons name="format-list-bulleted" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Render editor based on platform
  const renderEditor = () => {
    if (Platform.OS === 'web') {
      return (
        <WebView
          ref={webRef}
          source={{ html: quillWebHtml(value || '') }}
          onMessage={(e) => {
            const html = e?.nativeEvent?.data || '';
            onChange && onChange(html);
          }}
          style={styles.editor}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
        />
      );
    } else {
      return (
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={(text) => {
            setContent(text);
            onChange && onChange(convertMarkdownToHtml(text));
          }}
          placeholder="Enter text here... Use **bold**, *italic*, # Header, - List items"
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <CustomToolbar />
      {renderEditor()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    width: '100%', 
    height: 320,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  quillEditor: {
    height: 250,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f7f7f7',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-around',
  },
  button: {
    padding: 8,
    backgroundColor: '#007bff',
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    minHeight: 200,
  },
  previewContainer: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 200,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  listItem: {
    marginLeft: 16,
    marginBottom: 2,
  },
  formattingHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
});


