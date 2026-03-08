import sys, re
import js2py

def check_js_syntax(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract javascript from script tags
    js_content = ""
    matches = re.finditer(r'<script>(.*?)</script>', content, re.DOTALL)
    for match in matches:
        js_content += match.group(1) + "\n"
        
    try:
        # We just want to check parser syntax tree building, standard esprima / js2py or node is better.
        pass
    except Exception as e:
        print("Error!")

print("Extracted script.")
