const fs = require('fs');

const filePath = 'src/components/RequestForm.jsx';
const outputImg = 'public/background.png';

const content = fs.readFileSync(filePath, 'utf-8');

// Match base64 pattern
const match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
if (match) {
    const b64Data = match[1];
    
    // Write the actual image
    const buffer = Buffer.from(b64Data, 'base64');
    fs.writeFileSync(outputImg, buffer);
    
    // Replace in file
    const newContent = content.replace("data:image/png;base64," + b64Data, "/background.png");
    fs.writeFileSync(filePath, newContent, 'utf-8');
    
    console.log("Success: Extracted Image and updated RequestForm.jsx");
} else {
    console.log("Failed: Could not find base64 image data");
}
