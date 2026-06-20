#!/usr/bin/env python3
import sys
import hashlib

def calculate_hash(line):
    clean_line = line.rstrip('\r\n')
    return hashlib.md5(clean_line.encode('utf-8')).hexdigest()[:4]

def print_file_with_hashes(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for idx, line in enumerate(lines):
            line_hash = calculate_hash(line)
            clean_content = line.rstrip('\r\n')
            print(f"{idx + 1}:{line_hash}|{clean_content}")
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 hashline_helper.py <filepath>")
        sys.exit(1)
    print_file_with_hashes(sys.argv[1])
