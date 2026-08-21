/**
 * Google Apps Script Backend for QR Camera App
 * 
 * Instructions:
 * 1. Create a folder in Google Drive where photos will be stored.
 * 2. Copy the Folder ID from the URL (the string of characters after /folders/).
 * 3. Replace 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE' below with your Folder ID.
 * 4. Deploy this script as a Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the deployed Web App URL and paste it into your frontend code (index.html).
 */

const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE';

/**
 * Handle GET requests (Retrieve the list of images in the folder)
 */
function doGet(e) {
  try {
    if (FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE' || !FOLDER_ID) {
      return jsonResponse({
        success: false,
        error: 'Folder ID is not configured in Google Apps Script. Please set the FOLDER_ID variable.'
      });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const list = [];

    while (files.hasNext()) {
      const file = files.next();
      // Ensure we only retrieve standard image files
      const mime = file.getMimeType();
      if (mime.indexOf('image/') === 0) {
        list.push({
          id: file.getId(),
          name: file.getName(),
          created: file.getDateCreated().getTime(),
          // Use Google UserContent direct link for direct embedding in html
          url: 'https://lh3.googleusercontent.com/d/' + file.getId()
        });
      }
    }

    // Sort by newest first
    list.sort((a, b) => b.created - a.created);

    return jsonResponse({
      success: true,
      images: list
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Handle POST requests (Upload a new photo)
 */
function doPost(e) {
  try {
    if (FOLDER_ID === 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE' || !FOLDER_ID) {
      return jsonResponse({
        success: false,
        error: 'Folder ID is not configured. Please set the FOLDER_ID variable.'
      });
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'No post data content received.'
      });
    }

    // Parse the payload from the raw request body
    const data = JSON.parse(e.postData.contents);
    const base64Data = data.image; // formatted as "data:image/jpeg;base64,..."
    
    if (!base64Data) {
      return jsonResponse({
        success: false,
        error: 'No image data found in request payload.'
      });
    }

    // Extract mime type and the raw base64 string
    const parts = base64Data.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const rawBase64 = parts[1];

    // Decode base64 bytes to a blob
    const decodedBytes = Utilities.base64Decode(rawBase64);
    const fileName = 'photo_' + new Date().getTime() + '.' + mimeType.split('/')[1];
    const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // Save to Google Drive folder
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);

    // Set file permissions: Anyone with the link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      success: true,
      fileId: file.getId(),
      url: 'https://lh3.googleusercontent.com/d/' + file.getId()
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Helper to return JSON output with Apps Script Content Service
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
