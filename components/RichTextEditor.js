import React, { useRef, useEffect, useState } from 'react';
import { Platform, View, StyleSheet, TextInput, Text } from 'react-native';
import { WebView } from 'react-native-webview';

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

const quillHtml = (initial) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Include Quill styles -->
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
    <style>
      body { 
        font-family: Helvetica, Arial, sans-serif; 
        margin: 0; 
        padding: 8px; 
        background: #fff;
      }
      #editor { 
        height: 300px; 
        border: 1px solid #ccc; 
        border-radius: 6px;
      }
      .ql-editor {
        font-size: 14px;
        line-height: 1.5;
      }
      .ql-toolbar {
        border-top: 1px solid #ccc;
        border-left: 1px solid #ccc;
        border-right: 1px solid #ccc;
        border-radius: 6px 6px 0 0;
      }
      .ql-container {
        border-bottom: 1px solid #ccc;
        border-left: 1px solid #ccc;
        border-right: 1px solid #ccc;
        border-radius: 0 0 6px 6px;
      }
      .keyboard-hints {
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
    <!-- Create the editor container -->
    <div id="editor">${initial}</div>
    
    <!-- Keyboard shortcuts hints -->
    <div class="keyboard-hints">
      <strong>Keyboard shortcuts:</strong> Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline), 
      Ctrl+1/2/3 (Headers), Ctrl+Shift+7/8 (Lists)
    </div>

    <!-- Include Quill script -->
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
              // Bold: Ctrl+B
              bold: {
                key: 'B',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('bold', !quill.getFormat(range).bold);
                }
              },
              // Italic: Ctrl+I
              italic: {
                key: 'I',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('italic', !quill.getFormat(range).italic);
                }
              },
              // Underline: Ctrl+U
              underline: {
                key: 'U',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('underline', !quill.getFormat(range).underline);
                }
              },
              // Bullet list: Ctrl+Shift+8
              'list bullet': {
                key: '8',
                shortKey: true,
                shiftKey: true,
                handler: function(range, context) {
                  quill.format('list', 'bullet');
                }
              },
              // Numbered list: Ctrl+Shift+7
              'list ordered': {
                key: '7',
                shortKey: true,
                shiftKey: true,
                handler: function(range, context) {
                  quill.format('list', 'ordered');
                }
              },
              // Header 1: Ctrl+1
              'header 1': {
                key: '1',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('header', 1);
                }
              },
              // Header 2: Ctrl+2
              'header 2': {
                key: '2',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('header', 2);
                }
              },
              // Header 3: Ctrl+3
              'header 3': {
                key: '3',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('header', 3);
                }
              },
              // Normal text: Ctrl+0
              'header normal': {
                key: '0',
                shortKey: true,
                handler: function(range, context) {
                  quill.format('header', false);
                }
              }
            }
          }
        }
      });

      // Function to send content to React Native
      function postContent() {
        const html = quill.root.innerHTML;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(html);
        }
      }

      // Listen for content changes
      quill.on('text-change', function() {
        postContent();
      });

      // Listen for messages from React Native
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

      // Initial post
      setTimeout(postContent, 100);
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
      // Convert HTML back to markdown for display in TextInput
      const markdownValue = convertHtmlToMarkdown(value || '');
      setWebValue(markdownValue);
    }
  }, [value]);

  // For web platform, use Quill CDN
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <div 
          id={`quill-editor-${Math.random().toString(36).substr(2, 9)}`}
          style={{ height: 300, border: '1px solid #ccc', borderRadius: 8 }}
          dangerouslySetInnerHTML={{
            __html: `
              <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
              <div id="quill-toolbar"></div>
              <div id="quill-editor" style="height: 250px;">${webValue}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e9ecef;">
                <strong>Keyboard shortcuts:</strong> Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+U (Underline), 
                Ctrl+1/2/3 (Headers), Ctrl+Shift+7/8 (Lists)
              </div>
              <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
              <script>
                var quill = new Quill('#quill-editor', {
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
                        // Bold: Ctrl+B
                        bold: {
                          key: 'B',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('bold', !quill.getFormat(range).bold);
                          }
                        },
                        // Italic: Ctrl+I
                        italic: {
                          key: 'I',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('italic', !quill.getFormat(range).italic);
                          }
                        },
                        // Underline: Ctrl+U
                        underline: {
                          key: 'U',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('underline', !quill.getFormat(range).underline);
                          }
                        },
                        // Bullet list: Ctrl+Shift+8
                        'list bullet': {
                          key: '8',
                          shortKey: true,
                          shiftKey: true,
                          handler: function(range, context) {
                            quill.format('list', 'bullet');
                          }
                        },
                        // Numbered list: Ctrl+Shift+7
                        'list ordered': {
                          key: '7',
                          shortKey: true,
                          shiftKey: true,
                          handler: function(range, context) {
                            quill.format('list', 'ordered');
                          }
                        },
                        // Header 1: Ctrl+1
                        'header 1': {
                          key: '1',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('header', 1);
                          }
                        },
                        // Header 2: Ctrl+2
                        'header 2': {
                          key: '2',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('header', 2);
                          }
                        },
                        // Header 3: Ctrl+3
                        'header 3': {
                          key: '3',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('header', 3);
                          }
                        },
                        // Normal text: Ctrl+0
                        'header normal': {
                          key: '0',
                          shortKey: true,
                          handler: function(range, context) {
                            quill.format('header', false);
                          }
                        }
                      }
                    }
                  }
                });
                
                quill.on('text-change', function() {
                  const html = quill.root.innerHTML;
                  // Send to parent component
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(html);
                  }
                });
              </script>
            `
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: quillHtml(initialHtml) }}
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
  fallbackInput: {
    width: '100%',
    height: 250,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  formattingHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});


