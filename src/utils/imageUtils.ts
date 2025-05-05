
import * as FileSystem from 'expo-file-system';

/**
 * Converts an image URI to a base64 string
 * @param uri The local file URI of the image
 * @returns A Promise that resolves to the base64 string with proper data URI prefix
 */
export const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    // Check if the uri is already a base64 string
    if (uri.startsWith('data:image')) {
      return uri;
    }
    
    // Read the file as base64 string
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    
    // Get file extension to determine mime type
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    let mimeType = 'image/jpeg'; // Default mime type
    
    // Determine the correct mime type based on extension
    if (extension === 'png') {
      mimeType = 'image/png';
    } else if (extension === 'gif') {
      mimeType = 'image/gif';
    } else if (extension === 'webp') {
      mimeType = 'image/webp';
    }
    
    // Return the complete data URI
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};
