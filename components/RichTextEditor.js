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
  const isInternalUpdateRef = useRef(false); // Track updates originating from this editor

  // Update content state when value prop changes (source of truth from parent)
  React.useEffect(() => {
    setContent(value || '');
    if (Platform.OS === 'web' && editorRef.current) {
      // If the change came from this editor, don't reset innerHTML to preserve cursor
      if (isInternalUpdateRef.current) {
        isInternalUpdateRef.current = false;
      } else {
        editorRef.current.innerHTML = value || '';
      }
    }
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
        
        // If no selection, create a range at cursor position
        if (!range || range.collapsed) {
          // Try to create a range at the current cursor position
          try {
            if (selection.rangeCount === 0) {
              const newRange = document.createRange();
              newRange.selectNodeContents(editor);
              newRange.collapse(false); // Collapse to end
              selection.addRange(newRange);
            }
          } catch (e) {
            console.log('Could not create range:', e);
          }
        }
        
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
          // Ensure editor is focused before applying list
          editor.focus();
          // Get current selection
          const selection = window.getSelection();
          let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          
          // If no selection or collapsed selection, try to select the current line
          if (!range || range.collapsed) {
            // Find the current line/paragraph
            const node = selection.anchorNode || editor;
            const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            
            // Create a range for the current paragraph or line
            try {
              const newRange = document.createRange();
              if (parent.tagName === 'P' || parent.tagName === 'DIV' || parent.tagName === 'LI') {
                newRange.selectNodeContents(parent);
              } else {
                // Find closest block element
                let blockElement = parent;
                while (blockElement && blockElement !== editor && 
                       !['P', 'DIV', 'LI', 'H1', 'H2', 'H3'].includes(blockElement.tagName)) {
                  blockElement = blockElement.parentElement;
                }
                if (blockElement) {
                  newRange.selectNodeContents(blockElement);
                } else {
                  newRange.selectNodeContents(editor);
                }
              }
              selection.removeAllRanges();
              selection.addRange(newRange);
              range = newRange;
            } catch (e) {
              console.log('Could not create range for list:', e);
            }
          }
          
          // Try to apply ordered list
          document.execCommand('insertOrderedList', false, null);
        } else if (format === 'list' && value === 'bullet') {
          // Ensure editor is focused before applying list
          editor.focus();
          // Get current selection
          const selection = window.getSelection();
          let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          
          // If no selection or collapsed selection, try to select the current line
          if (!range || range.collapsed) {
            // Find the current line/paragraph
            const node = selection.anchorNode || editor;
            const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            
            // Create a range for the current paragraph or line
            try {
              const newRange = document.createRange();
              if (parent.tagName === 'P' || parent.tagName === 'DIV' || parent.tagName === 'LI') {
                newRange.selectNodeContents(parent);
              } else {
                // Find closest block element
                let blockElement = parent;
                while (blockElement && blockElement !== editor && 
                       !['P', 'DIV', 'LI', 'H1', 'H2', 'H3'].includes(blockElement.tagName)) {
                  blockElement = blockElement.parentElement;
                }
                if (blockElement) {
                  newRange.selectNodeContents(blockElement);
                } else {
                  newRange.selectNodeContents(editor);
                }
              }
              selection.removeAllRanges();
              selection.addRange(newRange);
              range = newRange;
            } catch (e) {
              console.log('Could not create range for list:', e);
            }
          }
          
          // Try to apply unordered list
          document.execCommand('insertUnorderedList', false, null);
        } else {
          // For bold, italic, underline
          editor.focus();
          if (format === 'bold') {
            document.execCommand('bold', false, null);
          } else if (format === 'italic') {
            document.execCommand('italic', false, null);
          } else if (format === 'underline') {
            document.execCommand('underline', false, null);
          }
        }
        
        // Update content and trigger change
        setTimeout(() => {
        const newContent = editor.innerHTML;
        setContent(newContent);
          isInternalUpdateRef.current = true;
        onChange && onChange(newContent);
        }, 10);
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

  // Set up keyboard shortcuts for web editor
  React.useEffect(() => {
    if (Platform.OS === 'web' && editorRef.current) {
      const editor = editorRef.current;
      
      const handleKeyDown = (e) => {
        // Ctrl+B or Cmd+B for Bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          editor.focus();
          document.execCommand('bold', false, null);
          const newContent = editor.innerHTML;
          setContent(newContent);
          isInternalUpdateRef.current = true;
          onChange && onChange(newContent);
          return false;
        }
        
        // Ctrl+I or Cmd+I for Italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
          e.preventDefault();
          editor.focus();
          document.execCommand('italic', false, null);
          const newContent = editor.innerHTML;
          setContent(newContent);
          isInternalUpdateRef.current = true;
          onChange && onChange(newContent);
          return false;
        }
        
        // Ctrl+U or Cmd+U for Underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          editor.focus();
          document.execCommand('underline', false, null);
          const newContent = editor.innerHTML;
          setContent(newContent);
          isInternalUpdateRef.current = true;
          onChange && onChange(newContent);
          return false;
        }
        
        // Ctrl+Shift+7 or Cmd+Shift+7 for Ordered List
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '7') {
          e.preventDefault();
          editor.focus();
          document.execCommand('insertOrderedList', false, null);
          const newContent = editor.innerHTML;
          setContent(newContent);
          isInternalUpdateRef.current = true;
          onChange && onChange(newContent);
          return false;
        }
        
        // Ctrl+Shift+8 or Cmd+Shift+8 for Bullet List
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '8') {
          e.preventDefault();
          editor.focus();
          document.execCommand('insertUnorderedList', false, null);
          const newContent = editor.innerHTML;
          setContent(newContent);
          isInternalUpdateRef.current = true;
          onChange && onChange(newContent);
          return false;
        }
      };
      
      editor.addEventListener('keydown', handleKeyDown);
      
      return () => {
        editor.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onChange]);

  // Render editor based on platform
  const renderEditor = () => {
    if (Platform.OS === 'web') {
      return (
        <div>
          <style>{`
            .rich-editor * {
              font-size: 16px !important;
              line-height: 1.0 !important;
              font-family: Arial, sans-serif !important;
            }
            .rich-editor h1 {
              font-size: 24px !important;
              font-weight: bold !important;
              margin: 0 !important;
            }
            .rich-editor h2 {
              font-size: 20px !important;
              font-weight: bold !important;
              margin: 0 !important;
            }
            .rich-editor p {
              font-size: 16px !important;
              margin: 0 !important;
            }
            .rich-editor ul, .rich-editor ol {
              font-size: 16px !important;
              margin: 0 !important;
              padding-left: 20px !important;
            }
            .rich-editor li {
              font-size: 16px !important;
              margin: 0 !important;
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
              if (newContent !== content) {
                setContent(newContent);
                // Mark as internal before notifying parent to avoid effect resetting innerHTML
                isInternalUpdateRef.current = true;
                onChange && onChange(newContent);
              }
            }}
            onBlur={(e) => {
              const newContent = e.target.innerHTML;
              if (newContent !== content) {
                setContent(newContent);
                onChange && onChange(newContent);
              }
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
      lineHeight: '1.0',
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