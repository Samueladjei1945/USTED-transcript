import re
import base64
import os

file_path = "src/components/RequestForm.jsx"
output_img = "public/background.png"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Regular expression to find the base64 encoded png
match = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', content)
if match:
    b64_data = match.group(1)
    # Write to image file
    with open(output_img, "wb") as f:
        f.write(base64.b64decode(b64_data))
    
    # Replace the base64 in the file with /background.png
    # The original is inside a template literal probably: `data:image/png;base64,...`
    # Let's replace the whole data URI
    new_content = content.replace("data:image/png;base64," + b64_data, "/background.png")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Success: Extracted Image and updated RequestForm.jsx")
else:
    print("Failed: Could not find base64 image data")
