import React, { useState, useRef } from 'react';
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor'; // For React Native

const RichTextEditor = ({ value, onChange }) => {
  const [content, setContent] = useState(value || ''); // Store editor content as HTML
  const editorRef = useRef(null); // Reference to editor

  // Update content when value prop changes
  React.useEffect(() => {
    setContent(value || '');
  }, [value]);

  // Formatting functions
  const applyFormat = (format, value = null) => {
    if (Platform.OS === 'web') {
      // Web: Use document.execCommand for formatting
      const editor = editorRef.current;
      if (editor) {
        // Ensure editor is focused
        editor.focus();
        
        // Store current selection
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        
        if (format === 'header') {
          // For headers, wrap selected text or insert new header
          if (range && !range.collapsed) {
            const selectedText = range.toString();
            const tag = value === 1 ? 'h1' : 'h2';
            range.deleteContents();
            const headerElement = document.createElement(tag);
            headerElement.textContent = selectedText;
            range.insertNode(headerElement);
          } else {
            document.execCommand('formatBlock', false, value === 1 ? 'h1' : value === 2 ? 'h2' : 'p');
          }
        } else if (format === 'list' && value === 'ordered') {
          document.execCommand('insertOrderedList', false, null);
        } else if (format === 'list' && value === 'bullet') {
          document.execCommand('insertUnorderedList', false, null);
        } else {
          // For bold, italic, underline
          if (format === 'bold') {
            document.execCommand('bold', false, null);
          } else if (format === 'italic') {
            document.execCommand('italic', false, null);
          } else if (format === 'underline') {
            document.execCommand('underline', false, null);
          }
        }
        
        // Update content and trigger change
        const newContent = editor.innerHTML;
        setContent(newContent);
        onChange && onChange(newContent);
      }
    } else {
      // React Native: Use react-native-pell-rich-editor actions
      const editor = editorRef.current;
      if (editor) {
        if (format === 'header') {
          const tag = value === 1 ? 'h1' : 'h2';
          editor.insertHTML(`<${tag}>${editor.getSelectedText() || 'Text'}</${tag}>`);
        } else if (format === 'list' && value === 'ordered') {
          editor.insertOrderedList();
        } else if (format === 'list' && value === 'bullet') {
          editor.insertUnorderedList();
        } else {
          editor[format](); // Apply bold, italic, underline
        }
        editor.getContentHtml().then(html => {
          setContent(html);
          onChange && onChange(html);
        });
      }
    }
  };

  // Custom toolbar with grouped buttons
  const CustomToolbar = () => (
    <View style={styles.toolbar}>
      {/* Header group */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('header', 1)}
        >
          <Text style={styles.buttonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('header', 2)}
        >
          <Text style={styles.buttonText}>H2</Text>
        </TouchableOpacity>
      </View>
      
      {/* Text formatting group */}
      <View style={[styles.buttonGroup, styles.textFormatGroup]}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('bold')}
        >
          <Text style={styles.buttonText}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('italic')}
        >
          <Text style={styles.buttonText}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('underline')}
        >
          <Text style={styles.buttonText}>U</Text>
        </TouchableOpacity>
      </View>
      
      {/* List group */}
      <View style={[styles.buttonGroup, styles.listGroup]}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('list', 'ordered')}
        >
          <Text style={styles.buttonText}>1.</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => applyFormat('list', 'bullet')}
        >
          <Text style={styles.buttonText}>•</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render editor based on platform
  const renderEditor = () => {
    if (Platform.OS === 'web') {
      return (
        <div>
          <style>{`
            .rich-editor * {
              font-size: 16px !important;
              line-height: 1.5 !important;
              font-family: Arial, sans-serif !important;
            }
            .rich-editor h1 {
              font-size: 24px !important;
              font-weight: bold !important;
              margin: 8px 0 !important;
            }
            .rich-editor h2 {
              font-size: 20px !important;
              font-weight: bold !important;
              margin: 6px 0 !important;
            }
            .rich-editor p {
              font-size: 16px !important;
              margin: 4px 0 !important;
            }
            .rich-editor ul, .rich-editor ol {
              font-size: 16px !important;
              margin: 4px 0 !important;
              padding-left: 20px !important;
            }
            .rich-editor li {
              font-size: 16px !important;
              margin: 2px 0 !important;
            }
            .rich-editor strong, .rich-editor b {
              font-weight: bold !important;
            }
            .rich-editor em, .rich-editor i {
              font-style: italic !important;
            }
            .rich-editor u {
              text-decoration: underline !important;
            }
          `}</style>
          <div
            ref={editorRef}
            contentEditable={true}
            className="rich-editor"
            style={styles.editor}
            onInput={(e) => {
              const newContent = e.target.innerHTML;
              setContent(newContent);
              onChange && onChange(newContent);
            }}
            onBlur={(e) => {
              const newContent = e.target.innerHTML;
              if (newContent !== content) {
                setContent(newContent);
                onChange && onChange(newContent);
              }
            }}
            dangerouslySetInnerHTML={{ __html: content }}
            suppressContentEditableWarning={true}
          />
        </div>
      );
    } else {
      return (
        <RichEditor
          ref={editorRef}
          initialContentHTML={content}
          onChange={(html) => {
            setContent(html);
            onChange && onChange(html);
          }}
          style={styles.editor}
          editorStyle={{
            backgroundColor: '#fff',
            color: '#000',
            placeholderColor: '#a9a9a9',
          }}
          placeholder="Start typing..."
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? <CustomToolbar /> : (
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
      )}
      {renderEditor()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 2,
  },
  textFormatGroup: {
    marginLeft: 20,
  },
  listGroup: {
    marginLeft: 20,
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#007bff',
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedButton: {
    backgroundColor: '#2095F2',
  },
  editor: {
    minHeight: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    margin: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { 
      outline: 'none', 
      minHeight: 120,
      maxHeight: 300,
      fontSize: '16px',
      lineHeight: '1.5',
      fontFamily: 'Arial, sans-serif',
      overflowY: 'auto',
      overflowX: 'hidden',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      cursor: 'text',
      userSelect: 'text',
      WebkitUserSelect: 'text',
      MozUserSelect: 'text',
      msUserSelect: 'text'
    } : {}),
  },
});

export default RichTextEditor;