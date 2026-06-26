import re

with open('/Users/macbookpro/.gemini/antigravity-ide/brain/46b2ee71-b771-40b5-bfea-797d5371546a/walkthrough.md', 'r') as f:
    content = f.read()

target = "- Modified the permission block so shift openers are allowed to manage photos even after packing."
replacement = "- Modified the permission block (`OrderDetailModal.tsx`) so shift openers are allowed to manage, send, and delete photos in the Node even after the package moves to the `Shipped` tab."
content = content.replace(target, replacement)

with open('/Users/macbookpro/.gemini/antigravity-ide/brain/46b2ee71-b771-40b5-bfea-797d5371546a/walkthrough.md', 'w') as f:
    f.write(content)
