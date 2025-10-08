import React, { useState, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

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

export default function RichTextEditor({ value, onChange }) {
  const [content, setContent] = useState(value || '');
  const editorRef = useRef(null);

  // Handle content changes
  const handleContentChange = (html) => {
    setContent(html);
    onChange && onChange(html);
  };

  // Render editor based on platform
  const renderEditor = () => {
    if (Platform.OS === 'web') {
      // For web, use WebView with Quill CDN
      return (
        <WebView
          source={{ html: quillWebHtml(value || '') }}
          onMessage={(e) => {
            const html = e?.nativeEvent?.data || '';
            handleContentChange(html);
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
        />
      );
    } else {
      // For native, use RichEditor
      return (
        <RichEditor
          ref={editorRef}
          initialContentHTML={content}
          onChange={handleContentChange}
          style={styles.richEditor}
          editorStyle={{
            backgroundColor: '#fff',
            color: '#000',
            placeholderColor: '#a9a9a9',
            fontSize: 16,
            lineHeight: 24,
          }}
          placeholder="Start typing..."
          useContainer={true}
          containerStyle={styles.editorContainer}
        />
      );
    }
  };

  // Render toolbar based on platform
  const renderToolbar = () => {
    if (Platform.OS === 'web') {
      // Web toolbar is handled by Quill in the WebView
      return null;
    } else {
      // Native toolbar
      return (
        <RichToolbar
          editor={editorRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.setStrikethrough,
            actions.foreColor,
            actions.hiliteColor,
            actions.removeFormat,
            actions.insertLink,
            actions.setHeading1,
            actions.setHeading2,
            actions.setHeading3,
            actions.undo,
            actions.redo,
          ]}
          iconTint="#000000"
          selectedIconTint="#2095F2"
          selectedButtonStyle={styles.selectedButton}
          style={styles.toolbar}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {renderToolbar()}
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
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  richEditor: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editorContainer: {
    flex: 1,
    padding: 10,
  },
  toolbar: {
    backgroundColor: '#f7f7f7',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectedButton: {
    backgroundColor: '#2095F2',
  },
});