#!/usr/bin/env python3
import os
import zipfile
import sys

def create_clean_zip(output_filename="lariel-essentials-clean.zip"):
    root_dir = os.path.abspath(".")
    output_path = os.path.join(root_dir, output_filename)
    
    # Exclude patterns
    excluded_dirs = {
        "node_modules",
        ".aistudio",
        "dist",
        ".git",
        "coverage",
        "build"
    }
    
    excluded_extensions = {".zip", ".log"}
    excluded_files = {".DS_Store"}
    
    total_files = 0
    total_uncompressed_bytes = 0
    
    print(f"Creating clean production-ready source ZIP: {output_filename}...")
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Prune excluded directories in-place
            rel_dir = os.path.relpath(dirpath, root_dir)
            parts = rel_dir.split(os.sep)
            
            # Check if any parent or current directory is in excluded_dirs
            if any(p in excluded_dirs for p in parts):
                continue
            
            # Also exclude data/backups
            if rel_dir == os.path.join("data", "backups") or rel_dir.startswith(os.path.join("data", "backups") + os.sep):
                continue

            # Filter dirnames so os.walk does not descend into excluded dirs
            dirnames[:] = [d for d in dirnames if d not in excluded_dirs and not (rel_dir == "data" and d == "backups")]
            
            for file in filenames:
                if file in excluded_files:
                    continue
                _, ext = os.path.splitext(file)
                if ext in excluded_extensions:
                    continue
                
                full_path = os.path.join(dirpath, file)
                rel_path = os.path.relpath(full_path, root_dir)
                
                # Do not pack the output zip itself
                if rel_path == output_filename:
                    continue
                
                file_size = os.path.getsize(full_path)
                total_uncompressed_bytes += file_size
                total_files += 1
                zipf.write(full_path, rel_path)
    
    zip_size = os.path.getsize(output_path)
    print("=" * 70)
    print(f"CLEAN SOURCE ZIP GENERATED SUCCESSFULLY: {output_filename}")
    print(f"Total files included:      {total_files}")
    print(f"Uncompressed size:        {total_uncompressed_bytes / (1024 * 1024):.2f} MB")
    print(f"Final compressed ZIP size: {zip_size / (1024 * 1024):.2f} MB")
    print("=" * 70)
    
    # Verify archive integrity
    with zipfile.ZipFile(output_path, "r") as test_zip:
        bad_file = test_zip.testzip()
        if bad_file:
            print(f"Error: Archive corrupted at {bad_file}", file=sys.stderr)
            sys.exit(1)
        else:
            print("Archive integrity check: PASSED (100% valid)")

if __name__ == "__main__":
    create_clean_zip()
