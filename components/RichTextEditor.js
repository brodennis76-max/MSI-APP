import React, { useRef, useEffect, useState } from 'react';
import { Platform, View, StyleSheet, TextInput, Text, TouchableOpacity } from 'react-native';

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
  const [textValue, setTextValue] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Convert HTML back to markdown for editing
    const markdownValue = convertHtmlToMarkdown(value || '');
    setTextValue(markdownValue);
  }, [value]);

  const handleTextChange = (text) => {
    setTextValue(text);
    // Convert markdown to HTML for storage
    const htmlText = convertMarkdownToHtml(text);
    onChange && onChange(htmlText);
  };

  const insertFormatting = (format) => {
    const selectionStart = 0; // For simplicity, we'll insert at the beginning
    const selectionEnd = 0;
    
    let newText = textValue;
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
    
    newText = newText.slice(0, selectionStart) + insertText + newText.slice(selectionEnd);
    handleTextChange(newText);
  };

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('bold')}>
          <Text style={styles.toolbarButtonText}><Text style={{fontWeight: 'bold'}}>B</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('italic')}>
          <Text style={styles.toolbarButtonText}><Text style={{fontStyle: 'italic'}}>I</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('header1')}>
          <Text style={styles.toolbarButtonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('header2')}>
          <Text style={styles.toolbarButtonText}>H2</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('list')}>
          <Text style={styles.toolbarButtonText}>•</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => insertFormatting('numbered')}>
          <Text style={styles.toolbarButtonText}>1.</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toolbarButton, showPreview && styles.activeButton]} 
          onPress={() => setShowPreview(!showPreview)}
        >
          <Text style={styles.toolbarButtonText}>👁</Text>
        </TouchableOpacity>
      </View>

      {/* Editor */}
      {!showPreview ? (
        <TextInput
          style={styles.textInput}
          value={textValue}
          onChangeText={handleTextChange}
          placeholder="Enter text here... Use **bold**, *italic*, # Header, - List items"
          multiline
          numberOfLines={10}
          textAlignVertical="top"
        />
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>
            {textValue.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <Text key={index} style={styles.h1}>{line.substring(2)}\n</Text>;
              } else if (line.startsWith('## ')) {
                return <Text key={index} style={styles.h2}>{line.substring(3)}\n</Text>;
              } else if (line.startsWith('- ')) {
                return <Text key={index} style={styles.listItem}>• {line.substring(2)}\n</Text>;
              } else if (line.match(/^\d+\. /)) {
                return <Text key={index} style={styles.listItem}>{line}\n</Text>;
              } else {
                // Simple markdown parsing for bold and italic
                const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/);
                return (
                  <Text key={index}>
                    {parts.map((part, partIndex) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={partIndex} style={styles.bold}>{part.slice(2, -2)}</Text>;
                      } else if (part.startsWith('*') && part.endsWith('*')) {
                        return <Text key={partIndex} style={styles.italic}>{part.slice(1, -1)}</Text>;
                      }
                      return part;
                    })}
                    {'\n'}
                  </Text>
                );
              }
            })}
          </Text>
        </View>
      )}

      <Text style={styles.formattingHint}>
        <Text style={{fontWeight: 'bold'}}>Formatting:</Text> **bold**, *italic*, # Header, - List items
      </Text>
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
  },
  toolbarButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 4,
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
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


