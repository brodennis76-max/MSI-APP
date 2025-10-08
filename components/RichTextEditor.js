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
        if (format === 'header') {
          document.execCommand('formatBlock', false, value === 1 ? 'h1' : value === 2 ? 'h2' : 'p');
        } else if (format === 'list' && value === 'ordered') {
          document.execCommand('insertOrderedList', false, null);
        } else if (format === 'list' && value === 'bullet') {
          document.execCommand('insertUnorderedList', false, null);
        } else {
          document.execCommand(format, false, null);
        }
        setContent(editor.innerHTML); // Update content
        onChange && onChange(editor.innerHTML);
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
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 1)}>
          <Text style={styles.buttonText}>H1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 2)}>
          <Text style={styles.buttonText}>H2</Text>
        </TouchableOpacity>
      </View>
      
      {/* Text formatting group */}
      <View style={[styles.buttonGroup, styles.textFormatGroup]}>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('bold')}>
          <Text style={styles.buttonText}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('italic')}>
          <Text style={styles.buttonText}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('underline')}>
          <Text style={styles.buttonText}>U</Text>
        </TouchableOpacity>
      </View>
      
      {/* List group */}
      <View style={[styles.buttonGroup, styles.listGroup]}>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'ordered')}>
          <Text style={styles.buttonText}>1.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'bullet')}>
          <Text style={styles.buttonText}>•</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render editor based on platform
  const renderEditor = () => {
    if (Platform.OS === 'web') {
      return (
        <div
          ref={editorRef}
          contentEditable={true}
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