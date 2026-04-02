import { AppConfig } from '../components/ApiKeySetupScreen';

export function getConfigFileName(): string {
  return localStorage.getItem('tutorxyz_config_filename') || 'tutorxyz_config.json';
}

export function setConfigFileName(name: string) {
  localStorage.setItem('tutorxyz_config_filename', name);
}

export async function getConfigFromDrive(accessToken: string): Promise<AppConfig | null> {
  try {
    const fileName = getConfigFileName();
    // 1. Find the file in appDataFolder
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${fileName}'`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (searchResponse.status === 401) throw new Error('UNAUTHORIZED');
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    
    if (!searchData.files || searchData.files.length === 0) {
      return null;
    }
    
    const fileId = searchData.files[0].id;
    
    // 2. Read the file content
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (fileResponse.status === 401) throw new Error('UNAUTHORIZED');
    if (!fileResponse.ok) return null;

    const config = await fileResponse.json();
    return {
      geminiApiKey: config.geminiApiKey || '',
      calendarName: config.calendarName || 'tutorxyz學習紀錄',
      configFileName: fileName,
      teacherStyle: config.teacherStyle || 'enthusiastic',
      geminiModel: config.geminiModel || 'gemini-3-flash-preview',
      geminiLiveModel: config.geminiLiveModel || 'gemini-2.5-flash-native-audio-preview-09-2025'
    };
  } catch (e) {
    console.error("Error reading from Drive", e);
    return null;
  }
}

export async function saveConfigToDrive(accessToken: string, config: AppConfig): Promise<boolean> {
  try {
    const fileName = config.configFileName;
    setConfigFileName(fileName);

    // 1. Check if file exists
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${fileName}'`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const searchData = await searchResponse.json();
    const fileExists = searchData.files && searchData.files.length > 0;
    
    const fileContent = JSON.stringify({ 
      geminiApiKey: config.geminiApiKey,
      calendarName: config.calendarName,
      teacherStyle: config.teacherStyle,
      geminiModel: config.geminiModel,
      geminiLiveModel: config.geminiLiveModel
    });
    
    let fileId = '';

    if (fileExists) {
      fileId = searchData.files[0].id;
    } else {
      // Create new file metadata
      const createMetaResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          parents: ['appDataFolder']
        })
      });
      
      if (createMetaResponse.status === 401) throw new Error('UNAUTHORIZED');
      if (!createMetaResponse.ok) {

        console.error("Failed to create file metadata", await createMetaResponse.text());
        return false;
      }
      const metaData = await createMetaResponse.json();
      fileId = metaData.id;
    }

    // Upload content to the file
    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: fileContent
    });
    
    if (uploadResponse.status === 401) throw new Error('UNAUTHORIZED');
    if (!uploadResponse.ok) {

      console.error("Failed to upload file content", await uploadResponse.text());
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Error saving to Drive", e);
    return false;
  }
}
