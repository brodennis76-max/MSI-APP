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
    if (Platform.OS === 'web' && editorRef.current) {
      const editor = editorRef.current;
      const currentContent = editor.innerHTML;
      const newContent = value || '';
      
      // Only update if content is actually different to avoid cursor issues
      if (currentContent !== newContent) {
        // Store cursor position
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const cursorOffset = range ? range.startOffset : 0;
        
        // Update content
        editor.innerHTML = newContent;
        
        // Restore cursor position
        if (range && editor.firstChild) {
          try {
            const newRange = document.createRange();
            newRange.setStart(editor.firstChild, Math.min(cursorOffset, editor.firstChild.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // If cursor restoration fails, just place at end
            const newRange = document.createRange();
            newRange.selectNodeContents(editor);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    }
    setContent(value || '');
  }, [value]);

  // Formatting functions
  const applyFormat = (format, value = null) => {
    if (Platform.OS === 'web') {
      // Web: Use document.execCommand for formatting
      const editor = editorRef.current;
      if (editor) {
        editor.focus(); // Ensure editor is focused
        
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
          // For ordered lists, check if we're in a list already
          const listElement = editor.querySelector('ol, ul');
          if (listElement) {
            // Convert existing list to ordered
            if (listElement.tagName.toLowerCase() === 'ul') {
              listElement.tagName = 'ol';
            }
          } else {
            document.execCommand('insertOrderedList', false, null);
          }
        } else if (format === 'list' && value === 'bullet') {
          // For bullet lists, check if we're in a list already
          const listElement = editor.querySelector('ol, ul');
          if (listElement) {
            // Convert existing list to unordered
            if (listElement.tagName.toLowerCase() === 'ol') {
              listElement.tagName = 'ul';
            }
          } else {
            document.execCommand('insertUnorderedList', false, null);
          }
        } else {
          // For bold, italic, underline - use a more reliable approach
          if (format === 'bold') {
            // Check if text is already bold
            const isBold = document.queryCommandState('bold');
            if (isBold) {
              document.execCommand('removeFormat', false, null);
            } else {
              document.execCommand('bold', false, null);
            }
          } else if (format === 'italic') {
            // Check if text is already italic
            const isItalic = document.queryCommandState('italic');
            if (isItalic) {
              document.execCommand('removeFormat', false, null);
            } else {
              document.execCommand('italic', false, null);
            }
          } else if (format === 'underline') {
            // Check if text is already underlined
            const isUnderlined = document.queryCommandState('underline');
            if (isUnderlined) {
              document.execCommand('removeFormat', false, null);
            } else {
              document.execCommand('underline', false, null);
            }
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
          onPress={(e) => {
            e.preventDefault();
            applyFormat('header', 1);
          }}
        >
          <Text style={styles.buttonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('header', 2);
          }}
        >
          <Text style={styles.buttonText}>H2</Text>
        </TouchableOpacity>
      </View>
      
      {/* Text formatting group */}
      <View style={[styles.buttonGroup, styles.textFormatGroup]}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('bold');
          }}
        >
          <Text style={styles.buttonText}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('italic');
          }}
        >
          <Text style={styles.buttonText}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('underline');
          }}
        >
          <Text style={styles.buttonText}>U</Text>
        </TouchableOpacity>
      </View>
      
      {/* List group */}
      <View style={[styles.buttonGroup, styles.listGroup]}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('list', 'ordered');
          }}
        >
          <Text style={styles.buttonText}>1.</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={(e) => {
            e.preventDefault();
            applyFormat('list', 'bullet');
          }}
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
              // Always update content on input to ensure cursor stays in place
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
            onFocus={(e) => {
              // Ensure cursor is at the end when focusing
              const editor = e.target;
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(editor);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }}
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