import hashlib
import sys

def get_line_hash(line):
    # Удаляем символы перевода строки, но сохраняем остальные пробелы для точности хэша
    content = line.rstrip('\r\n')
    return hashlib.md5(content.encode('utf-8')).hexdigest()[:2]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)
    
    for idx, line in enumerate(lines, 1):
        line_hash = get_line_hash(line)
        # Формат: line_num:hash|line_content
        print(f"{idx}:{line_hash}|{line}", end='')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python hashline_helper.py <filepath>")
        sys.exit(1)
    process_file(sys.argv[1])
