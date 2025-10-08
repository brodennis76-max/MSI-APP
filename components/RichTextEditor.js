import React, { useState, useRef } from 'react';
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { RichEditor, actions } from 'react-native-pell-rich-editor'; // For React Native

const RichTextEditor = ({ value, onChange }) => {
  const [content, setContent] = useState(value || ''); // Store editor content as HTML
  const editorRef = useRef(null); // Reference to editor

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

  // Custom toolbar with buttons
  const CustomToolbar = () => (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 1)}>
        <Text style={styles.buttonText}>H1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('header', 2)}>
        <Text style={styles.buttonText}>H2</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('bold')}>
        <Text style={styles.buttonText}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('italic')}>
        <Text style={styles.buttonText}>I</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('underline')}>
        <Text style={styles.buttonText}>U</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'ordered')}>
        <Text style={styles.buttonText}>1.</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => applyFormat('list', 'bullet')}>
        <Text style={styles.buttonText}>•</Text>
      </TouchableOpacity>
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
            setContent(e.target.innerHTML);
            onChange && onChange(e.target.innerHTML);
          }}
          dangerouslySetInnerHTML={{ __html: content }}
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
      <CustomToolbar />
      {renderEditor()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  button: {
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editor: {
    height: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    margin: 10,
    padding: 10,
    ...(Platform.OS === 'web' ? { 
      outline: 'none', 
      minHeight: 300,
      fontSize: '14px',
      lineHeight: '1.5',
      fontFamily: 'Arial, sans-serif'
    } : {}),
  },
});

export default RichTextEditor;